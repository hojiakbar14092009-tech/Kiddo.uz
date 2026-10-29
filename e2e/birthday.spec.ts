import { deflateSync } from 'node:zlib'
import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 24: a child profile with a photo (only real pictures are taken) and
 * the birthday present: exactly 50 coins and one chosen pet, once a year.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
})

/** A real 8 × 8 PNG, made here (no fixture file). */
function tinyPng(): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(8, 0)
  header.writeUInt32BE(8, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // RGB
  const rows = Buffer.concat(
    Array.from({ length: 8 }, () => Buffer.from([0, ...Array(8).fill([255, 160, 40]).flat()])),
  )
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function parentArea(page: Page) {
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '9', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
}

test('a photo and the birthday present: 50 coins and one pet, once', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await parentArea(page)
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill('Lola')
  // born six years ago today: it is her birthday
  const born = new Date()
  born.setFullYear(born.getFullYear() - 6)
  const day = `${born.getFullYear()}-${String(born.getMonth() + 1).padStart(2, '0')}-${String(born.getDate()).padStart(2, '0')}`
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(day)

  // a text file dressed as a picture is refused; a real picture is taken
  const input = page.getByTestId('child-photo-input')
  await input.setInputFiles({
    name: 'fake.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a picture'),
  })
  await expect(page.getByTestId('child-photo-hint')).toHaveText(/rasm sifatida ochilmadi/)
  await input.setInputFiles({
    name: 'doc.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7'),
  })
  await expect(page.getByTestId('child-photo-hint')).toHaveText(/Bu rasm emas/)
  await input.setInputFiles({ name: 'lola.png', mimeType: 'image/png', buffer: tinyPng() })
  await expect(page.getByTestId('child-photo-preview')).toHaveAttribute(
    'src',
    /^data:image\/jpeg;base64,/,
  )
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Lola profilini tahrirlash' })).toBeVisible()

  await page.getByRole('button', { name: 'Bolalarga' }).click()
  await page.getByRole('button', { name: /Lola/ }).click()
  const party = page.getByTestId('birthday-celebration')
  await expect(party).toBeVisible()
  await expect(page.getByTestId('birthday-claim')).toBeDisabled()
  await page.getByTestId('birthday-pet-bunny').click()
  await page.getByTestId('birthday-claim').click()
  await expect(party).toHaveCount(0)
  await expect(page.getByRole('status', { name: /Coinlar: 50/ })).toBeVisible()

  // a reload: no second party, still 50 coins
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Salom, Lola!' })).toBeVisible()
  await expect(page.getByTestId('birthday-celebration')).toHaveCount(0)
  await expect(page.getByRole('status', { name: /Coinlar: 50/ })).toBeVisible()
})
