import { clearPersistence as clearModelPersistence, getModelActions } from '@/building/store'
import { clearPersistence as clearConfigPersistence, getConfigActions } from '@/config/store'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import type { CursorStyle, ToolImplementation } from '@/editor/tools/system/types'

import { TestDataToolInspector } from './TestDataToolInspector'
import { createCrossShapedPerimeter } from './generators/crossShaped'
import { createHexagonalPerimeter } from './generators/hexagonal'
import { createRectangularPerimeter } from './generators/rectangular'

export class TestDataTool implements ToolImplementation {
  readonly id = 'test.data'
  readonly inspectorComponent = TestDataToolInspector
  protected toolSystem: ToolSystem

  constructor(toolSystem: ToolSystem) {
    this.toolSystem = toolSystem
  }

  public createCrossShapedTestData(): void {
    createCrossShapedPerimeter()
    this.toolSystem.popTool()
  }

  public createHexagonalTestData(): void {
    createHexagonalPerimeter()
    this.toolSystem.popTool()
  }

  public createRectangularTestData(): void {
    createRectangularPerimeter()
    this.toolSystem.popTool()
  }

  public resetAllData(): void {
    try {
      getModelActions().reset()
      getConfigActions().reset()

      clearModelPersistence()
      clearConfigPersistence()

      console.log('✅ Model reset completed - all data cleared')
    } catch (error) {
      console.error('❌ Failed to reset model:', error)
    }
  }

  onActivate(): void {
    // Tool now uses inspector interface instead of immediate activation
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }

  getCursor(): CursorStyle {
    return 'not-allowed'
  }
}
