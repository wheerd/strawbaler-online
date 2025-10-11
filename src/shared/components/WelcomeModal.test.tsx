import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WelcomeModal } from './WelcomeModal'

vi.mock('./Logo', () => ({
  Logo: () => <div data-testid="logo" />
}))

describe('WelcomeModal', () => {
  it('renders when open', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByTestId('logo')).toBeInTheDocument()
    expect(
      screen.getByText(/This is a tool specifically designed for strawbale construction planning/)
    ).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen={false} mode="first-visit" onAccept={onAccept} />)

    expect(screen.queryByTestId('logo')).not.toBeInTheDocument()
  })

  it('shows disclaimer section', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByText('Important Disclaimer')).toBeInTheDocument()
    expect(screen.getByText(/No guarantees for accuracy/)).toBeInTheDocument()
    expect(screen.getByText(/Breaking changes may occur/)).toBeInTheDocument()
  })

  it('shows local storage information', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByText('Local Storage')).toBeInTheDocument()
    expect(screen.getByText(/No cookies, tracking, or third-party analytics/)).toBeInTheDocument()
  })

  it('calls onAccept when button is clicked', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    const button = screen.getByRole('button', { name: /I Understand & Continue/i })
    fireEvent.click(button)

    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('does not show close button in first-visit mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    const closeButtons = screen.queryAllByRole('button')
    const hasCloseButton = closeButtons.some(
      button =>
        button.getAttribute('aria-label') === 'Close' || button.querySelector('svg')?.classList.contains('Cross2Icon')
    )

    expect(hasCloseButton).toBe(false)
  })

  it('shows close button in manual mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="manual" onAccept={onAccept} />)

    const closeButtons = screen.getAllByRole('button')
    expect(closeButtons.length).toBeGreaterThan(1)
  })

  it('shows helper text in first-visit mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="first-visit" onAccept={onAccept} />)

    expect(screen.getByText(/You can review this information anytime/)).toBeInTheDocument()
  })

  it('does not show helper text in manual mode', () => {
    const onAccept = vi.fn()
    render(<WelcomeModal isOpen mode="manual" onAccept={onAccept} />)

    expect(screen.queryByText(/You can review this information anytime/)).not.toBeInTheDocument()
  })
})
