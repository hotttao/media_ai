import { fireEvent, render, screen } from '@testing-library/react'
import { MovementForm } from './MovementForm'

describe('MovementForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits a text-only action', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const { container } = render(<MovementForm onSubmit={onSubmit} onCancel={onCancel} />)

    const textarea = container.querySelector('textarea')
    const submitButton = container.querySelector('button[type="submit"]')

    expect(textarea).not.toBeNull()
    expect(submitButton).not.toBeNull()

    fireEvent.change(textarea!, { target: { value: 'show the back of the outfit' } })
    fireEvent.click(submitButton!)

    expect(onSubmit).toHaveBeenCalledWith({
      content: 'show the back of the outfit',
      url: undefined,
      clothing: undefined,
      scope: undefined,
      isGeneral: true,
      poseIds: [],
    })
  })

  it('submits a video-only action', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const { container } = render(<MovementForm onSubmit={onSubmit} onCancel={onCancel} />)

    const buttons = screen.getAllByRole('button')
    const videoToggle = buttons[1]

    fireEvent.click(videoToggle)

    const urlInput = container.querySelector('input[type="url"]')
    const submitButton = container.querySelector('button[type="submit"]')

    expect(urlInput).not.toBeNull()
    expect(submitButton).not.toBeNull()

    fireEvent.change(urlInput!, { target: { value: 'https://example.com/action.mp4' } })
    fireEvent.click(submitButton!)

    expect(onSubmit).toHaveBeenCalledWith({
      content: undefined,
      url: 'https://example.com/action.mp4',
      clothing: undefined,
      scope: undefined,
      isGeneral: true,
      poseIds: [],
    })
  })

  it('blocks submit when both content and url are empty', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const { container } = render(<MovementForm onSubmit={onSubmit} onCancel={onCancel} />)

    const buttons = screen.getAllByRole('button')
    const videoToggle = buttons[1]

    fireEvent.click(videoToggle)

    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement

    expect(submitButton.disabled).toBe(true)

    fireEvent.click(submitButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
