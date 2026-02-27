import { DEFAULT_TOOL, TOOL_METADATA } from './metadata'
import type { EditorEvent, IToolSystem, ToolId, ToolImplementation } from './types'

export class ToolSystem implements IToolSystem {
  private toolStack: ToolId[] = [DEFAULT_TOOL]
  private tools: Partial<Record<ToolId, ToolImplementation>> = {}
  private shortcuts: Record<string, () => boolean> = {}
  private toolShortcuts: Record<string, ToolId> = {}
  private listeners = new Set<() => void>()

  registerTool(ToolClass: new (system: ToolSystem) => ToolImplementation): void {
    const tool = new ToolClass(this)
    this.tools[tool.id] = tool

    const metadata = TOOL_METADATA[tool.id]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (metadata?.hotkey) {
      const normalizedKey = this.normalizeKey(metadata.hotkey)
      this.toolShortcuts[normalizedKey] = tool.id
    }
  }

  registerShortcut(key: string, action: () => boolean): void {
    const normalizedKey = this.normalizeKey(key)
    this.shortcuts[normalizedKey] = action
  }

  getActiveTool(): ToolImplementation {
    const toolId = this.toolStack[this.toolStack.length - 1]
    return this.getToolById(toolId)
  }

  getActiveToolId(): ToolId {
    return this.toolStack[this.toolStack.length - 1]
  }

  getPreviousToolId(): ToolId | null {
    return this.toolStack.length > 1 ? this.toolStack[this.toolStack.length - 2] : null
  }

  canPop(): boolean {
    return this.toolStack.length > 1
  }

  getStackDepth(): number {
    return this.toolStack.length
  }

  pushTool(toolId: ToolId): void {
    if (this.getActiveToolId() === toolId) return

    const currentTool = this.getActiveTool()
    currentTool.onDeactivate?.()

    this.toolStack.push(toolId)
    this.notifyListeners()

    const newTool = this.getToolById(toolId)
    newTool.onActivate?.()
  }

  popTool(): void {
    if (this.toolStack.length <= 1) return

    const currentTool = this.getActiveTool()
    currentTool.onDeactivate?.()

    this.toolStack.pop()
    this.notifyListeners()

    const newTool = this.getActiveTool()
    newTool.onActivate?.()
  }

  replaceTool(toolId: ToolId): void {
    if (this.getActiveToolId() === toolId) return

    const currentTool = this.getActiveTool()
    currentTool.onDeactivate?.()

    if (this.toolStack.length > 1) {
      this.toolStack.pop()
    }

    this.toolStack.push(toolId)
    this.notifyListeners()

    const newTool = this.getToolById(toolId)
    newTool.onActivate?.()
  }

  clearToDefault(): void {
    if (this.toolStack.length <= 1) return

    const currentTool = this.getActiveTool()
    currentTool.onDeactivate?.()

    this.toolStack = [DEFAULT_TOOL]
    this.notifyListeners()

    const defaultTool = this.getToolById(DEFAULT_TOOL)
    defaultTool.onActivate?.()
  }

  handlePointerEvent(event: EditorEvent): boolean {
    const tool = this.getActiveTool()

    try {
      switch (event.type) {
        case 'pointerdown':
          return tool.handlePointerDown?.(event) ?? false
        case 'pointermove':
          return tool.handlePointerMove?.(event) ?? false
        case 'pointerup':
          return tool.handlePointerUp?.(event) ?? false
        default:
          return false
      }
    } catch (error) {
      console.error(`Error handling ${event.type} event in tool ${tool.id}:`, error)
      return false
    }
  }

  initialize(): () => void {
    const handleKeyDown = this.handleKeyDown.bind(this)
    const handleKeyUp = this.handleKeyUp.bind(this)

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private getToolById(toolId: ToolId): ToolImplementation {
    const tool = this.tools[toolId]
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`)
    }
    return tool
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener()
    })
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isInputElement(event.target as HTMLElement)) return

    const key = this.normalizeKeyFromEvent(event)

    const activeTool = this.getActiveTool()
    if (activeTool.handleKeyDown?.(event)) {
      event.preventDefault()
      return
    }

    if (key in this.shortcuts && this.shortcuts[key]()) {
      event.preventDefault()
      return
    }

    if (key in this.toolShortcuts) {
      this.pushTool(this.toolShortcuts[key])
      event.preventDefault()
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (this.isInputElement(event.target as HTMLElement)) return

    const activeTool = this.getActiveTool()
    if (activeTool.handleKeyUp?.(event)) {
      event.preventDefault()
    }
  }

  private isInputElement(target: HTMLElement) {
    return target.matches(
      'input[type=text], input[type=number], input[type=email], input[type=password], input:not([type]), select, textarea, [contenteditable="true"]'
    )
  }

  private normalizeKey(key: string): string {
    const parts = key
      .toLowerCase()
      .split('+')
      .map(part => part.trim())
    const modifiers = parts.filter(part => ['ctrl', 'shift', 'alt', 'meta'].includes(part))
    const mainKey = parts.find(part => !['ctrl', 'shift', 'alt', 'meta'].includes(part))

    if (!mainKey) return key

    const normalizedKey = mainKey.charAt(0).toUpperCase() + mainKey.slice(1)
    modifiers.sort()
    const normalizedModifiers = modifiers.map(mod => mod.charAt(0).toUpperCase() + mod.slice(1))

    return normalizedModifiers.length > 0 ? `${normalizedModifiers.join('+')}+${normalizedKey}` : normalizedKey
  }

  private normalizeKeyFromEvent(event: KeyboardEvent): string {
    const modifiers: string[] = []
    if (event.ctrlKey) modifiers.push('Ctrl')
    if (event.metaKey) modifiers.push('Meta')
    if (event.shiftKey) modifiers.push('Shift')
    if (event.altKey) modifiers.push('Alt')

    let key = event.key
    if (key === ' ') key = 'Space'

    const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1)
    modifiers.sort()

    return modifiers.length > 0 ? `${modifiers.join('+')}+${normalizedKey}` : normalizedKey
  }
}
