import { clearPersistence, getModelActions } from '@/building/store'
import type { ToolImplementation } from '@/editor/tools/system/types'

/**
 * Tool for resetting the entire model to empty state.
 * Triggers on activation to clear all data and localStorage persistence.
 */
export class ResetTool implements ToolImplementation {
  readonly id = 'test.reset'

  // Lifecycle methods
  onActivate(): void {
    // Immediately deactivate and return to select tool
    setTimeout(async () => {
      const { pushTool } = await import('@/editor/tools/system/store')
      pushTool('basic.select')
    }, 0)

    // Perform the reset operation
    const modelStore = getModelActions()

    try {
      // Clear the model data
      modelStore.reset()

      // Clear localStorage persistence
      clearPersistence()

      console.log('✅ Model reset completed - all data cleared')
    } catch (error) {
      console.error('❌ Failed to reset model:', error)
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
