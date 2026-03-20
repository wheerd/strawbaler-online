# Intermediate Walls & Rooms Architecture

## Goal

Implement interior walls and rooms in the floor plan editor, enabling:

- Drawing interior walls that connect to perimeter walls or other interior walls
- Split-on-connect model: when a wall connects to another wall's midpoint, split the target wall
- Perpendicular snapping and constraints
- Room detection from closed wall loops

## Data Model

### Wall Nodes

Wall nodes are connection points for walls. Two types exist:

```typescript
// Node on a perimeter wall - position computed from wall geometry
interface PerimeterWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'perimeter'
  wallId: PerimeterWallId
  offsetFromCornerStart: Length // Distance along the wall
}

// Free-standing node - position stored directly
interface InnerWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'inner'
  position: Vec2
}
```

### Wall Attachments

Walls connect to nodes via attachments, which include axis alignment:

```typescript
type WallAxis = 'left' | 'center' | 'right'

interface WallAttachment {
  nodeId: WallNodeId
  axis: WallAxis // Which axis of the wall aligns with the node
}
```

### Intermediate Walls

Interior walls connect two wall nodes:

```typescript
interface IntermediateWall {
  id: IntermediateWallId
  perimeterId: PerimeterId
  openingIds: OpeningId[]
  leftRoomId?: RoomId
  rightRoomId?: RoomId
  start: WallAttachment
  end: WallAttachment
  thickness: Length
  wallAssemblyId?: InteriorWallAssemblyId
}
```

### Geometry Types

Computed from model + other geometry:

```typescript
interface WallNodeGeometry {
  position: Vec2
}

interface InnerWallNodeGeometry extends WallNodeGeometry {
  connectedWallIds: IntermediateWallId[]
  boundary: Polygon2D
}

interface IntermediateWallGeometry {
  boundary: Polygon2D
  centerLine: LineSegment2D
  wallLength: Length
  leftLength: Length
  leftLine: LineSegment2D
  rightLength: Length
  rightLine: LineSegment2D
  direction: Vec2
  leftDirection: Vec2
}
```

## Store Architecture

### State Interface

```typescript
interface IntermediateWallsState {
  intermediateWalls: Record<IntermediateWallId, IntermediateWall>
  _intermediateWallGeometry: Record<IntermediateWallId, IntermediateWallGeometry>

  wallNodes: Record<WallNodeId, WallNode>
  _wallNodeGeometry: Record<WallNodeId, WallNodeGeometry>
}
```

### Actions

**Wall CRUD:**

- `addIntermediateWall(perimeterId, start, end, thickness)` - Create wall between two attachments
- `removeIntermediateWall(wallId)` - Remove wall, cleanup orphaned nodes
- `updateIntermediateWallThickness(wallId, thickness)`
- `updateIntermediateWallAlignment(wallId, start, end)`

**Node CRUD:**

- `addPerimeterWallNode(perimeterId, wallId, offset)` - Add node on perimeter wall
- `addInnerWallNode(perimeterId, position)` - Add free-standing node
- `removeWallNode(nodeId)` - Remove node and connected walls
- `updateInnerWallNodePosition(nodeId, position)`
- `updatePerimeterWallNodeOffset(nodeId, offset)`

### Getters

Combine base model with geometry:

- `getIntermediateWallById(id)` → `IntermediateWallWithGeometry`
- `getIntermediateWallsByPerimeter(perimeterId)` → `IntermediateWallWithGeometry[]`
- `getAllIntermediateWalls()` → `IntermediateWallWithGeometry[]`
- `getWallNodeById(id)` → `WallNodeWithGeometry`
- `getWallNodesByPerimeter(perimeterId)` → `WallNodeWithGeometry[]`
- `getAllWallNodes()` → `WallNodeWithGeometry[]`

## Geometry Computation

### File: `intermediateWallGeometry.ts`

Follows the pattern from `perimeterGeometry.ts`:

1. Pure functions that take state + IDs
2. Called directly after any model change
3. No circular imports - state interface defined in slice, geometry file imports it

### Key Functions

```typescript
// Update single wall geometry
function updateIntermediateWallGeometry(
  state: IntermediateWallsState & PerimeterGeometryAccess,
  wallId: IntermediateWallId
): void

// Update all walls (e.g., after perimeter change)
function updateAllIntermediateWallGeometry(state: IntermediateWallsState & PerimeterGeometryAccess): void
```

### Node Position Calculation

```typescript
function getNodePosition(state: IntermediateWallsState & PerimeterGeometryAccess, nodeId: WallNodeId): Vec2 {
  const node = state.wallNodes[nodeId]
  if (node.type === 'inner') {
    return node.position
  }
  // Perimeter node: compute from wall geometry
  const wallGeometry = state._perimeterWallGeometry[node.wallId]
  return pointOnLineSegment(wallGeometry.innerLine, node.offsetFromCornerStart)
}
```

### Wall Geometry Calculation

1. Get start/end node positions via `getNodePosition()`
2. Compute center line from start to end
3. Offset by thickness/2 to get left/right lines
4. Build boundary polygon from left/right lines

## Split-on-Connect Model

When a wall endpoint attaches to the middle of another wall:

1. **Detect intersection** - The target wall's center line intersects near the new wall's endpoint
2. **Create node** - Add a wall node at the intersection point
3. **Split target wall** - Replace one wall with two:
   - Original start → New node
   - New node → Original end
4. **Update references** - Any room references point to both new walls

This ensures every wall endpoint is a node, simplifying topology.

## Perpendicular Constraints

### Snapping

During wall drawing, snap to perpendicular lines:

- From current point, project to perpendicular of nearby walls
- Visual feedback shows snap candidate

### Constraint Storage

```typescript
interface PerpendicularConstraint {
  id: ConstraintId
  wallId: IntermediateWallId
  perpendicularToWallId: IntermediateWallId
  atNodeId: WallNodeId // The shared node
}
```

Constraints are stored separately and enforced during geometry updates.

## Implementation Phases

### Phase 1: Store & Geometry (Current)

- [ ] Implement `intermediateWallGeometry.ts`
- [ ] Implement `intermediateWallsSlice.ts` actions
- [ ] Integrate into main store
- [ ] Unit tests for geometry computation

### Phase 2: Drawing Tools

- [ ] Create `intermediateWallTool` for drawing
- [ ] Implement perpendicular snapping
- [ ] Implement wall-node creation on click
- [ ] Connect to perimeter walls

### Phase 3: Split-on-Connect

- [ ] Detect wall intersections during placement
- [ ] Implement wall splitting logic
- [ ] Update geometry after splits
- [ ] Handle edge cases (T-junctions, crosses)

### Phase 4: Rendering

- [ ] Render intermediate walls on canvas
- [ ] Render wall nodes (connection points)
- [ ] Selection and hover states
- [ ] Measurements display

### Phase 5: Constraints

- [ ] Store constraint model
- [ ] Enforce perpendicular constraints
- [ ] Visual constraint indicators
- [ ] Constraint deletion

### Phase 6: Room Detection

- [ ] Implement room boundary detection
- [ ] Auto-assign walls to rooms
- [ ] Room labeling UI
- [ ] Area calculations

## File Structure

```
src/building/
├── model/
│   ├── ids.ts              # WallNodeId, IntermediateWallId
│   ├── rooms.ts            # Type definitions
│   └── index.ts            # Exports
├── store/
│   ├── slices/
│   │   ├── intermediateWallsSlice.ts    # State + actions
│   │   └── intermediateWallGeometry.ts  # Geometry computation
│   └── store.ts            # Integration
└── ...

src/editor/
└── tools/
    └── intermediateWall/   # Phase 2
        ├── tool.ts
        ├── snapping.ts
        └── inspector.tsx
```

## Key Patterns to Follow

1. **Vec2 creation**: Always use `newVec2(x, y)`, never object literals
2. **Geometry updates**: Call `updateIntermediateWallGeometry(state, id)` after every mutation
3. **Getters**: Combine base model + geometry in getter functions
4. **Timestamps**: Update via `touch(state, entityId)` for undo/redo
5. **State access**: Geometry functions need perimeter geometry access for perimeter nodes
