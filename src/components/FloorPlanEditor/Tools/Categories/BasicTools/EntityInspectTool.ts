import type { Tool, CanvasEvent } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'

/**
 * Debug tool for testing entity hit detection.
 * Logs entity information when clicking on shapes.
 */
export const EntityInspectTool: Tool = {
  id: 'basic.entity-inspect',
  name: 'Entity Inspector',
  icon: '🔍',
  hotkey: 'i',
  cursor: 'crosshair',

  handleMouseDown(event: CanvasEvent): boolean {
    // Use original pointer coordinates for accurate hit testing
    const entityHit = event.pointerCoordinates ? event.context.findEntityAt(event.pointerCoordinates) : null

    if (entityHit) {
      console.log('🎯 Entity Hit Detected:', {
        entityId: entityHit.entityId,
        entityType: entityHit.entityType,
        parentIds: entityHit.parentIds,
        stagePoint: entityHit.stagePoint,
        konvaNode: entityHit.konvaNode
      })

      // Show hierarchy information
      console.log('📊 Entity Hierarchy:')
      if (entityHit.parentIds.length === 0) {
        console.log('  └─ Root entity:', entityHit.entityId)
      } else {
        console.log('  Root:', entityHit.parentIds[0])
        for (let i = 1; i < entityHit.parentIds.length; i++) {
          console.log('  ' + '  '.repeat(i) + '└─', entityHit.parentIds[i])
        }
        console.log('  ' + '  '.repeat(entityHit.parentIds.length) + '└─', entityHit.entityId)
      }

      // Test hierarchy knowledge
      console.log('🧠 Hierarchy Knowledge Test:')
      switch (entityHit.entityType) {
        case 'outer-wall':
          console.log('  ✓ This is a root outer wall entity')
          break
        case 'wall-segment':
          console.log('  ✓ This is a wall segment, parent outer wall:', entityHit.parentIds[0])
          break
        case 'outer-corner':
          console.log('  ✓ This is an outer corner, parent outer wall:', entityHit.parentIds[0])
          break
        case 'opening':
          console.log('  ✓ This is an opening in segment:', entityHit.parentIds[1])
          console.log('    Parent outer wall:', entityHit.parentIds[0])
          break
      }

      return true // Event handled
    }

    const coordinates = event.pointerCoordinates || event.stageCoordinates
    console.log('❌ No entity found at point:', coordinates)
    return false
  }
}
