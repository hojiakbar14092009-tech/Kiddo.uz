import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'
import { BuyDialog } from './BuyDialog'
import { OUTFITS } from './outfits'

describe('BuyDialog', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
  })

  function renderDialog() {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const cap = OUTFITS.find((outfit) => outfit.id === 'cap')!
    render(
      <BuyDialog
        outfit={cap}
        model="girl"
        wearing={{ head: 'cap' }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    return {
      onConfirm,
      onCancel,
      dialog: screen.getByRole('alertdialog', { name: /Kepka olamizmi\?/ }),
    }
  }

  it('is a modal question with the price as its description and focus on “yes”', () => {
    const { dialog } = renderDialog()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)).toHaveTextContent(
      '15',
    )
    expect(screen.getByRole('button', { name: 'Ha, olaman' })).toHaveFocus()
  })

  it('is not answered by a tap on the backdrop', () => {
    const { dialog, onCancel, onConfirm } = renderDialog()
    fireEvent.pointerDown(dialog.parentElement!)
    expect(onCancel).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('cancels on Escape and on “no”', () => {
    const { onCancel, onConfirm } = renderDialog()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Yo‘q' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
