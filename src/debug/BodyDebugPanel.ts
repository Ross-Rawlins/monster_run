import { CharacterBodyDefinition, CharacterState } from '../characters/types'

export type DebugBodyChangeCallback = (
  state: CharacterState,
  body: CharacterBodyDefinition
) => void

type FieldKey = keyof CharacterBodyDefinition

const FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
  { key: 'offsetX', label: 'Offset X' },
  { key: 'offsetY', label: 'Offset Y' },
]

/**
 * Runtime body-profile debug panel rendered as an HTML overlay above the canvas.
 *
 * - Toggle with the `B` key (wired in the scene)
 * - +/- buttons adjust each value by 1 source-pixel; you can also type directly
 * - Overrides are stored per animation state, so switching states preserves each state's edits
 * - "Log all overrides" dumps a paste-ready TS snippet to the browser console
 * - When any input is focused the game keyboard is suppressed (check hasFocus() in scene update)
 */
export class BodyDebugPanel {
  private readonly container: HTMLDivElement

  private stateEl!: HTMLSpanElement

  private inputs!: Record<FieldKey, HTMLInputElement>

  private readonly overrides: Partial<
    Record<CharacterState, CharacterBodyDefinition>
  > = {}

  private currentState: CharacterState = 'idle'

  private currentCodedBody: CharacterBodyDefinition = {
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  }

  private panelFocused = false

  private visible = false

  private readonly onChange: DebugBodyChangeCallback

  constructor(onChange: DebugBodyChangeCallback) {
    this.onChange = onChange
    this.container = this.buildPanel()
    document.body.appendChild(this.container)
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Call every frame from the scene update with the player's current animation
   * state and the body values that are currently applied to the physics body.
   */
  public update(state: CharacterState, body: CharacterBodyDefinition): void {
    this.currentCodedBody = body

    if (state !== this.currentState) {
      this.currentState = state
      this.stateEl.textContent = state
      // Show the live override for this state if one exists, otherwise the
      // coded values coming from the physics body (which already reflect the
      // profile for this state).
      const display = this.overrides[state] ?? body
      this.setInputValues(display)
    }
  }

  public toggle(): void {
    this.visible ? this.hide() : this.show()
  }

  public show(): void {
    this.visible = true
    this.container.style.display = 'block'
  }

  public hide(): void {
    this.visible = false
    this.container.style.display = 'none'
  }

  public isVisible(): boolean {
    return this.visible
  }

  /** Returns true while any text input inside the panel has focus. */
  public hasFocus(): boolean {
    return this.panelFocused
  }

  public destroy(): void {
    this.container.remove()
  }

  // ---------------------------------------------------------------------------
  // Panel construction
  // ---------------------------------------------------------------------------

  private buildPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.style.cssText = `
      position: fixed;
      top: 12px;
      right: 12px;
      background: rgba(8, 10, 20, 0.93);
      border: 1px solid #2e3e6e;
      border-radius: 6px;
      padding: 12px 14px 10px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #c8d4f0;
      min-width: 230px;
      z-index: 9999;
      display: none;
      user-select: none;
    `

    panel.addEventListener('focusin', () => {
      this.panelFocused = true
    })
    panel.addEventListener('focusout', () => {
      this.panelFocused = false
    })

    panel.appendChild(this.buildHeader())
    panel.appendChild(this.buildStateRow())
    panel.appendChild(this.buildFieldRows())
    panel.appendChild(this.buildDivider())
    panel.appendChild(this.buildFooter())

    return panel
  }

  private buildHeader(): HTMLDivElement {
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;'

    const title = document.createElement('span')
    title.textContent = 'BODY  DEBUG'
    title.style.cssText =
      'color:#ffde8a; font-weight:bold; letter-spacing:2px; font-size:12px;'

    const hint = document.createElement('span')
    hint.textContent = '[B] close'
    hint.style.cssText = 'color:#4a5a8a; font-size:11px;'

    row.appendChild(title)
    row.appendChild(hint)
    return row
  }

  private buildStateRow(): HTMLDivElement {
    const row = document.createElement('div')
    row.style.cssText = 'margin-bottom:12px;'

    const label = document.createElement('span')
    label.textContent = 'state: '
    label.style.color = '#5a7aaa'

    this.stateEl = document.createElement('span')
    this.stateEl.textContent = 'idle'
    this.stateEl.style.cssText = 'color:#ffffff; font-weight:bold;'

    row.appendChild(label)
    row.appendChild(this.stateEl)
    return row
  }

  private buildFieldRows(): HTMLDivElement {
    const wrapper = document.createElement('div')
    this.inputs = {} as Record<FieldKey, HTMLInputElement>

    FIELDS.forEach(({ key, label }) => {
      const row = document.createElement('div')
      row.style.cssText =
        'display:flex; align-items:center; margin-bottom:7px; gap:5px;'

      const labelEl = document.createElement('span')
      labelEl.textContent = label
      labelEl.style.cssText = 'width:66px; color:#7890b8; font-size:12px;'

      const minusBtn = this.makeStepButton('−', () => {
        const next = Math.max(0, (parseInt(input.value, 10) || 0) - 1)
        input.value = String(next)
        this.handleChange(key, next)
      })

      const input = document.createElement('input')
      input.type = 'number'
      input.value = '0'
      input.min = '0'
      input.max = '512'
      input.style.cssText = `
        width: 52px;
        background: #111828;
        border: 1px solid #2e3e6e;
        color: #e8f0ff;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        padding: 3px 4px;
        border-radius: 3px;
        text-align: center;
      `
      input.addEventListener('change', () => {
        this.handleChange(key, parseInt(input.value, 10) || 0)
      })

      const plusBtn = this.makeStepButton('+', () => {
        const next = (parseInt(input.value, 10) || 0) + 1
        input.value = String(next)
        this.handleChange(key, next)
      })

      this.inputs[key] = input

      row.appendChild(labelEl)
      row.appendChild(minusBtn)
      row.appendChild(input)
      row.appendChild(plusBtn)
      wrapper.appendChild(row)
    })

    return wrapper
  }

  private buildDivider(): HTMLHRElement {
    const hr = document.createElement('hr')
    hr.style.cssText =
      'border: none; border-top: 1px solid #1e2e50; margin: 10px 0 8px;'
    return hr
  }

  private buildFooter(): HTMLDivElement {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex; gap:6px;'

    const resetBtn = this.makeFooterButton(
      'Reset state',
      '#1e2a50',
      '#4a6090',
      () => {
        delete this.overrides[this.currentState]
        // Restore the coded body values that were last reported from physics body
        this.setInputValues(this.currentCodedBody)
        this.onChange(this.currentState, this.currentCodedBody)
      }
    )

    const logBtn = this.makeFooterButton(
      'Log all',
      '#1a2e40',
      '#408080',
      () => {
        this.logOverrides()
      }
    )

    row.appendChild(resetBtn)
    row.appendChild(logBtn)
    return row
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private makeStepButton(
    label: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = `
      background: #141c38;
      border: 1px solid #2e3e6e;
      color: #8898c8;
      font-family: 'Courier New', monospace;
      font-size: 15px;
      width: 26px;
      height: 26px;
      border-radius: 3px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
    `
    btn.addEventListener('click', onClick)
    btn.addEventListener('mousedown', (e) => e.preventDefault()) // don't steal focus
    return btn
  }

  private makeFooterButton(
    label: string,
    bg: string,
    borderColor: string,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = `
      flex: 1;
      background: ${bg};
      border: 1px solid ${borderColor};
      color: #90b8c8;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 5px 4px;
      border-radius: 3px;
      cursor: pointer;
    `
    btn.addEventListener('click', onClick)
    btn.addEventListener('mousedown', (e) => e.preventDefault())
    return btn
  }

  private setInputValues(body: CharacterBodyDefinition): void {
    this.inputs.width.value = String(body.width)
    this.inputs.height.value = String(body.height)
    this.inputs.offsetX.value = String(body.offsetX)
    this.inputs.offsetY.value = String(body.offsetY)
  }

  private handleChange(key: FieldKey, value: number): void {
    const existing = this.overrides[this.currentState] ?? {
      ...this.currentCodedBody,
    }
    const updated: CharacterBodyDefinition = { ...existing, [key]: value }
    this.overrides[this.currentState] = updated
    this.onChange(this.currentState, updated)
  }

  private logOverrides(): void {
    const states = Object.keys(this.overrides) as CharacterState[]

    if (states.length === 0) {
      console.log('[BodyDebug] No overrides set yet.')
      return
    }

    const lines = [
      '// ── BodyDebugPanel overrides ── paste into defineBodyProfiles():',
    ]
    states.forEach((state) => {
      const b = this.overrides[state]!
      lines.push(
        `  ${state}: { width: ${b.width}, height: ${b.height}, offsetX: ${b.offsetX}, offsetY: ${b.offsetY} },`
      )
    })
    console.log(lines.join('\n'))
  }
}
