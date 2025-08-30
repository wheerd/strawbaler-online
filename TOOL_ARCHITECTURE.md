# Tool Architecture Proposal

This document outlines the proposed architecture for a hierarchical, self-contained tool system that will replace the current complex logic in `FloorPlanStage.tsx`.

## Overview

The new architecture separates tool logic from canvas rendering, creating self-contained tools with optional inspectors and entity-specific property panels. This provides better maintainability, testability, and extensibility.

## Architecture Goals

1. **Self-contained tools**: Each tool manages its own state and behavior
2. **Hierarchical organization**: Tool groups with related sub-tools
3. **Entity-specific inspectors**: Customized property panels for each entity type
4. **Optional tool inspectors**: Only tools that need settings expose inspectors
5. **Simplified canvas**: Canvas only handles event routing, not tool logic
6. **Type-safe**: Full TypeScript support throughout
7. **Testable**: Each tool can be tested in isolation

## Directory Structure

```
src/components/FloorPlanEditor/Tools/
├── ToolSystem/
│   ├── ToolManager.ts           # Central tool coordination
│   ├── ToolRegistry.ts          # Tool registration system
│   ├── ToolContext.tsx          # React context for tools
│   └── types.ts                 # Tool interfaces
├── Categories/
│   ├── BasicTools/
│   │   ├── index.ts             # Basic tool group export
│   │   ├── SelectTool.tsx       # Default selection tool
│   │   ├── MoveTool.tsx         # Move entities
│   │   └── RotateTool.tsx       # Rotate entities
│   └── WallTools/
│       ├── index.ts             # Wall tool group export
│       ├── StructuralWallTool.tsx
│       ├── PartitionWallTool.tsx
│       ├── OuterWallTool.tsx
│       └── CurtainWallTool.tsx
├── PropertiesPanel/
│   ├── PropertiesPanel.tsx      # Main properties panel
│   ├── Inspectors/
│   │   ├── WallInspector.tsx    # Wall-specific properties
│   │   ├── RoomInspector.tsx    # Room-specific properties
│   │   ├── PointInspector.tsx   # Point-specific properties
│   │   └── CornerInspector.tsx  # Corner-specific properties
│   ├── ToolInspectors/          # Optional tool inspectors
│   │   ├── WallToolInspector.tsx
│   │   └── RotateToolInspector.tsx
│   └── ActionButtons.tsx        # Context-specific actions
├── Toolbar/
│   ├── MainToolbar.tsx          # Primary toolbar
│   ├── ToolButton.tsx           # Individual tool button
│   └── ToolGroup.tsx            # Tool group dropdown
└── EventHandlers/
    ├── CanvasEventDispatcher.ts # Route canvas events to active tool
    └── KeyboardEventHandler.ts  # Handle keyboard shortcuts
```

## Core Interfaces

### Tool System Types

```typescript
// src/components/FloorPlanEditor/Tools/ToolSystem/types.ts
export interface BaseTool {
  id: string
  name: string
  icon: string
  hotkey?: string
  category?: string
}

export interface ToolGroup extends BaseTool {
  tools: Tool[]
  defaultTool?: string
}

export interface Tool extends BaseTool {
  component: React.ComponentType<ToolProps>
  cursor?: string
  hasInspector?: boolean // Optional inspector
  inspectorComponent?: React.ComponentType<ToolInspectorProps>
}

export interface ToolProps {
  isActive: boolean
  onActivate: () => void
  onDeactivate: () => void
}

export interface ToolInspectorProps {
  tool: Tool
  onPropertyChange: (property: string, value: any) => void
}

export interface ContextAction {
  label: string
  action: () => void
  enabled?: () => boolean
  hotkey?: string
}
```

### Tool Manager

```typescript
// src/components/FloorPlanEditor/Tools/ToolSystem/ToolManager.ts
export class ToolManager {
  private tools: Map<string, Tool> = new Map()
  private toolGroups: Map<string, ToolGroup> = new Map()
  private activeTool: Tool | null = null
  private subscribers: Set<(tool: Tool | null) => void> = new Set()

  registerTool(tool: Tool): void {
    this.tools.set(tool.id, tool)
  }

  registerToolGroup(group: ToolGroup): void {
    this.toolGroups.set(group.id, group)
    group.tools.forEach(tool => this.registerTool(tool))
  }

  activateTool(toolId: string): boolean {
    const tool = this.tools.get(toolId)
    if (!tool) return false

    this.deactivateCurrentTool()
    this.activeTool = tool
    this.notifySubscribers()
    return true
  }

  getActiveTool(): Tool | null {
    return this.activeTool
  }

  handleCanvasEvent(event: CanvasEvent): boolean {
    return this.activeTool?.component.handleEvent?.(event) ?? false
  }

  private deactivateCurrentTool(): void {
    if (this.activeTool) {
      this.activeTool.component.onDeactivate?.()
      this.activeTool = null
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.activeTool))
  }

  subscribe(callback: (tool: Tool | null) => void): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
}
```

## Tool Categories

### 1. Basic Tools

The basic tool group contains fundamental interaction tools:

#### SelectTool (Default)

- **Purpose**: Select and manage entity selection
- **Features**: Click to select, multi-select with Ctrl, selection rectangles
- **Inspector**: No inspector needed

#### MoveTool

- **Purpose**: Move selected entities
- **Features**: Drag to move, snap to grid/points, multi-entity move
- **Inspector**: No inspector needed

#### RotateTool

- **Purpose**: Rotate selected entities
- **Features**: Rotation by degrees, rotation center selection
- **Inspector**: Optional - rotation step settings, center point selection

```typescript
// Example: MoveTool implementation
export class MoveTool implements Tool {
  id = 'basic.move'
  name = 'Move'
  icon = '↔'
  cursor = 'move'
  category = 'basic'
  hasInspector = false

  handleMouseDown(event: MouseEvent, context: ToolContext): boolean {
    const entity = context.getEntityAtPoint(context.getStageCoordinates(event))
    if (entity) {
      context.startEntityDrag(entity, event)
      return true
    }
    return false
  }

  handleMouseMove(event: MouseEvent, context: ToolContext): boolean {
    return context.updateEntityDrag(event)
  }

  handleMouseUp(event: MouseEvent, context: ToolContext): boolean {
    return context.endEntityDrag(event)
  }

  getContextActions(selectedEntity?: Entity): ContextAction[] {
    if (!selectedEntity) return []

    return [
      {
        label: `Move ${selectedEntity.type}`,
        action: () => {
          /* Move logic */
        },
        hotkey: 'M'
      }
    ]
  }
}
```

### 2. Wall Tools

Wall tools for different types of walls:

#### StructuralWallTool (Default)

- **Purpose**: Create structural/load-bearing walls
- **Properties**: Thickness (200mm default), Height (2700mm default), Material
- **Inspector**: Yes - thickness, height, material settings

#### PartitionWallTool

- **Purpose**: Create interior partition walls
- **Properties**: Thinner thickness (100mm default), Material options
- **Inspector**: Yes - thickness, height, material settings

#### OuterWallTool

- **Purpose**: Create exterior walls
- **Properties**: Thicker walls, insulation settings, exterior materials
- **Inspector**: Yes - thickness, insulation, materials

#### CurtainWallTool

- **Purpose**: Create non-load-bearing curtain walls
- **Properties**: Glass percentage, frame material, transparency
- **Inspector**: Yes - glass settings, frame options

```typescript
// Example: StructuralWallTool implementation
export class StructuralWallTool implements Tool {
  id = 'wall.structural'
  name = 'Structural Wall'
  icon = '▬'
  cursor = 'crosshair'
  category = 'walls'
  hasInspector = true
  inspectorComponent = WallToolInspector

  private state: StructuralWallToolState = {
    isDrawing: false,
    thickness: 200, // 200mm default
    height: 2700 // 2.7m default
  }

  handleMouseDown(event: MouseEvent, context: ToolContext): boolean {
    const stageCoords = context.getStageCoordinates(event)
    const snapResult = context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.isDrawing) {
      this.startDrawing(snapCoords, context)
    } else {
      this.finishWall(snapCoords, context)
    }

    return true
  }

  handleMouseMove(event: MouseEvent, context: ToolContext): boolean {
    if (!this.state.isDrawing) return false

    const stageCoords = context.getStageCoordinates(event)
    context.updateWallPreview(this.state.startPoint!, stageCoords)
    return true
  }

  handleKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    if (event.key === 'Escape' && this.state.isDrawing) {
      this.cancelDrawing(context)
      return true
    }
    return false
  }

  getContextActions(): ContextAction[] {
    return [
      {
        label: 'Switch to Partition Wall',
        action: () => useToolManager().activateTool('wall.partition')
      }
    ]
  }
}
```

## Entity-Specific Inspectors

### WallInspector

```typescript
export function WallInspector({ wall, onChange }: WallInspectorProps): React.JSX.Element {
  const connectedCorners = useModelStore(state =>
    state.getConnectedCorners(wall.startPointId, wall.endPointId)
  )

  return (
    <div className="wall-inspector">
      <h3>Wall Properties</h3>

      <div className="property-group">
        <label>Wall Type</label>
        <select value={wall.type} onChange={e => onChange('type', e.target.value)}>
          <option value="structural">Structural</option>
          <option value="partition">Partition</option>
          <option value="outer">Outer</option>
          <option value="curtain">Curtain</option>
        </select>
      </div>

      <div className="property-group">
        <label>Thickness (mm)</label>
        <input
          type="number"
          value={wall.thickness.value}
          onChange={e => onChange('thickness', createLength(Number(e.target.value)))}
        />
      </div>

      <div className="property-group">
        <label>Height (mm)</label>
        <input
          type="number"
          value={wall.height?.value ?? 2700}
          onChange={e => onChange('height', createLength(Number(e.target.value)))}
        />
      </div>

      <div className="property-group">
        <label>Material</label>
        <select value={wall.material ?? 'concrete'} onChange={e => onChange('material', e.target.value)}>
          <option value="concrete">Concrete</option>
          <option value="brick">Brick</option>
          <option value="drywall">Drywall</option>
          <option value="wood">Wood</option>
        </select>
      </div>

      {connectedCorners.length > 0 && (
        <div className="property-group">
          <label>Corner Actions</label>
          {connectedCorners.map(corner => (
            <button
              key={corner.pointId}
              onClick={() => handleCornerAction(corner)}
              className="corner-action-button"
            >
              Switch Main Walls at Corner {corner.pointId}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### RoomInspector

```typescript
export function RoomInspector({ room, onChange }: RoomInspectorProps): React.JSX.Element {
  const roomArea = useModelStore(state => state.calculateRoomArea(room.id))
  const roomPerimeter = useModelStore(state => state.calculateRoomPerimeter(room.id))

  return (
    <div className="room-inspector">
      <h3>Room Properties</h3>

      <div className="property-group">
        <label>Name</label>
        <input
          type="text"
          value={room.name}
          onChange={e => onChange('name', e.target.value)}
        />
      </div>

      <div className="property-group">
        <label>Room Type</label>
        <select value={room.roomType ?? 'general'} onChange={e => onChange('roomType', e.target.value)}>
          <option value="living">Living Room</option>
          <option value="bedroom">Bedroom</option>
          <option value="kitchen">Kitchen</option>
          <option value="bathroom">Bathroom</option>
          <option value="office">Office</option>
          <option value="general">General</option>
        </select>
      </div>

      <div className="property-group">
        <label>Color</label>
        <input
          type="color"
          value={room.fillColor ?? '#e0e0e0'}
          onChange={e => onChange('fillColor', e.target.value)}
        />
      </div>

      <div className="measurements">
        <div className="measurement">
          <label>Area:</label>
          <span>{roomArea ? `${(roomArea.value / 1000000).toFixed(2)} m²` : 'N/A'}</span>
        </div>
        <div className="measurement">
          <label>Perimeter:</label>
          <span>{roomPerimeter ? `${(roomPerimeter.value / 1000).toFixed(2)} m` : 'N/A'}</span>
        </div>
      </div>

      <div className="room-actions">
        <button onClick={() => handleSplitRoom(room.id)}>
          Split Room
        </button>
        <button onClick={() => handleMergeRooms(room.id)}>
          Merge with Adjacent
        </button>
      </div>
    </div>
  )
}
```

### CornerInspector

```typescript
export function CornerInspector({ corner, onChange }: CornerInspectorProps): React.JSX.Element {
  const connectedWalls = useModelStore(state => state.getWallsAtPoint(corner.pointId))
  const cornerAngle = useModelStore(state => state.getCornerAngle(corner.pointId))

  return (
    <div className="corner-inspector">
      <h3>Corner Properties</h3>

      <div className="property-group">
        <label>Corner Type</label>
        <select value={corner.cornerType ?? 'square'} onChange={e => onChange('cornerType', e.target.value)}>
          <option value="square">Square</option>
          <option value="rounded">Rounded</option>
          <option value="chamfer">Chamfer</option>
        </select>
      </div>

      {corner.cornerType === 'rounded' && (
        <div className="property-group">
          <label>Radius (mm)</label>
          <input
            type="number"
            value={corner.radius?.value ?? 100}
            onChange={e => onChange('radius', createLength(Number(e.target.value)))}
          />
        </div>
      )}

      <div className="corner-info">
        <div className="measurement">
          <label>Angle:</label>
          <span>{cornerAngle ? `${cornerAngle.toFixed(1)}°` : 'N/A'}</span>
        </div>
        <div className="measurement">
          <label>Connected Walls:</label>
          <span>{connectedWalls.length}</span>
        </div>
      </div>

      <div className="corner-actions">
        <label>Main Wall Priority</label>
        {connectedWalls.slice(0, 2).map(wallId => (
          <button
            key={wallId}
            onClick={() => onChange('mainWalls', [wallId, connectedWalls.find(id => id !== wallId)])}
            className={corner.mainWalls?.includes(wallId) ? 'active' : ''}
          >
            Set as Main: {wallId}
          </button>
        ))}
      </div>
    </div>
  )
}
```

## Properties Panel Integration

```typescript
// src/components/FloorPlanEditor/Tools/PropertiesPanel/PropertiesPanel.tsx
export function PropertiesPanel(): React.JSX.Element {
  const selectedEntityId = useSelectedEntity()
  const activeTool = useToolManager(state => state.activeTool)
  const selectedEntity = useModelStore(state =>
    selectedEntityId ? state.getEntityById(selectedEntityId) : null
  )

  const renderEntityInspector = () => {
    if (!selectedEntity) return null

    switch (selectedEntity.type) {
      case 'wall':
        return <WallInspector wall={selectedEntity as Wall} onChange={handleEntityPropertyChange} />
      case 'room':
        return <RoomInspector room={selectedEntity as Room} onChange={handleEntityPropertyChange} />
      case 'point':
        return <PointInspector point={selectedEntity as Point} onChange={handleEntityPropertyChange} />
      case 'corner':
        return <CornerInspector corner={selectedEntity as Corner} onChange={handleEntityPropertyChange} />
      default:
        return <div>Unknown entity type: {selectedEntity.type}</div>
    }
  }

  const renderToolInspector = () => {
    if (!activeTool?.hasInspector || !activeTool.inspectorComponent) return null

    const InspectorComponent = activeTool.inspectorComponent
    return <InspectorComponent tool={activeTool} onPropertyChange={handleToolPropertyChange} />
  }

  return (
    <div className="properties-panel">
      {renderEntityInspector()}
      {renderToolInspector()}

      {(selectedEntity || activeTool) && (
        <ActionButtons
          entity={selectedEntity}
          tool={activeTool}
        />
      )}
    </div>
  )
}
```

## Simplified Canvas Event Handling

```typescript
// src/components/FloorPlanEditor/Canvas/FloorPlanStage.tsx (simplified)
export function FloorPlanStage({ width, height }: FloorPlanStageProps): React.JSX.Element {
  const toolManager = useToolManager()
  const eventDispatcher = useCanvasEventDispatcher()

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const handled = eventDispatcher.handleMouseDown(e)
    if (!handled) {
      // Fallback to default behavior (e.g., pan)
      handleDefaultMouseDown(e)
    }
  }, [eventDispatcher])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    eventDispatcher.handleMouseMove(e)
  }, [eventDispatcher])

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    eventDispatcher.handleMouseUp(e)
  }, [eventDispatcher])

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      // ... other props
    >
      {/* Layers remain the same */}
    </Stage>
  )
}
```

## Tool Registration

```typescript
// src/components/FloorPlanEditor/Tools/index.ts
export const registerAllTools = (manager: ToolManager) => {
  // Basic tools
  manager.registerToolGroup({
    id: 'basic',
    name: 'Basic',
    icon: '↖',
    tools: [
      new SelectTool(), // Default
      new MoveTool(),
      new RotateTool()
    ],
    defaultTool: 'basic.select'
  })

  // Wall tools
  manager.registerToolGroup({
    id: 'walls',
    name: 'Walls',
    icon: '▬',
    tools: [new StructuralWallTool(), new PartitionWallTool(), new OuterWallTool(), new CurtainWallTool()],
    defaultTool: 'wall.structural'
  })
}
```

## Implementation Benefits

1. **Separation of Concerns**: Tool logic is separate from canvas rendering
2. **Maintainability**: Each tool is self-contained and easy to modify
3. **Testability**: Tools can be unit tested independently
4. **Extensibility**: New tools can be easily added without modifying existing code
5. **Type Safety**: Full TypeScript support with proper interfaces
6. **User Experience**: Context-specific inspectors and actions
7. **Performance**: Only active tools handle events, unused tools are dormant

## Migration Path

1. **Phase 1**: Implement tool system infrastructure (ToolManager, types, interfaces)
2. **Phase 2**: Create basic tools (Select, Move) and entity inspectors
3. **Phase 3**: Implement wall tools and wall inspector
4. **Phase 4**: Add rotation tool and optional tool inspectors
5. **Phase 5**: Migrate `FloorPlanStage.tsx` to use new event dispatcher
6. **Phase 6**: Remove old tool logic from `FloorPlanStage.tsx`

This architecture provides a solid foundation for the floor plan editor's tool system while maintaining flexibility for future enhancements.
