import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

describe('creative studio', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'en' }))

  it('shows the board with ten colours and large tools', async () => {
    await renderRoute('/studio')
    expect(screen.getByRole('img', { name: 'Drawing space' })).toBeInTheDocument()
    const colours = within(screen.getByRole('group', { name: 'Colours' })).getAllByRole('button')
    expect(colours).toHaveLength(10)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear everything' })).toBeDisabled()
  })

  it('places a sticker from the sheet; clearing asks first and can be undone', async () => {
    const { user } = await renderRoute('/studio')
    await user.click(screen.getByRole('button', { name: 'Stickers' }))
    await user.click(screen.getByRole('button', { name: 'Rocket' }))
    expect(screen.getByRole('button', { name: 'Sticker: Rocket' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Clear everything' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Clear the picture?' })
    await user.click(within(dialog).getByRole('button', { name: 'No, keep it' }))
    expect(screen.getByRole('button', { name: 'Sticker: Rocket' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear everything' }))
    await user.click(screen.getByRole('button', { name: 'Yes, clear' }))
    expect(screen.queryByRole('button', { name: 'Sticker: Rocket' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('button', { name: 'Sticker: Rocket' })).toBeInTheDocument()
  })

  it('lets a picture be saved only once there is something real in it', async () => {
    const { user } = await renderRoute('/studio')
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    for (const name of ['Sun', 'Cat', 'Tree']) {
      await user.click(screen.getByRole('button', { name: 'Stickers' }))
      await user.click(screen.getByRole('button', { name }))
    }
    expect(save).toBeEnabled()
  })

  it('shows a kind empty gallery', async () => {
    await renderRoute('/studio/gallery')
    expect(await screen.findByText('The gallery is empty for now')).toBeInTheDocument()
  })
})
