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

---

# Intermediate Wall Drawing Tool - Detailed Implementation Plan

## Overview

Implement a tool to draw intermediate (interior partition) walls in a floor plan editor. The tool draws open chains of connected wall segments (not closed polygons), similar to drawing a polyline.

### Key Behaviors

1. **Chain drawing**: Click multiple points to create a chain of connected walls
2. **Snap to existing elements**: Nodes, perimeter walls, other intermediate walls
3. **Perpendicular snapping**: Snap to 90° angles from walls
4. **Alignment snapping**: Snap to extension lines from existing walls
5. **Center axis alignment**: Walls align their center axis with nodes by default
6. **Auto-finish on T-junction**: Placing a point on an existing wall creates a T-junction and ends the chain
7. **Manual finish**: Press Enter to finish at a free position
8. **Configurable thickness**: Inspector allows adjusting wall thickness

## Node Creation Logic

When the user clicks to place a wall endpoint, determine the appropriate node type:

### Case 1: Click on Perimeter Wall Endpoint (Corner)

```
Input: Snapped to PerimeterCorner
Action: Use addPerimeterWallNode at offset 0 or wall length
Node: PerimeterWallNode (no split needed - corners already exist)
```

### Case 2: Click on Perimeter Wall Midpoint

```
Input: Snapped to point on PerimeterWall (not corner)
Action: Use addPerimeterWallNode at computed offset
Node: PerimeterWallNode (NO split - perimeter walls don't split for intermediate walls)
```

### Case 3: Click on Existing Wall Node

```
Input: Snapped to existing WallNode (inner or perimeter)
Action: Reuse existing node
Node: Existing WallNode
```

### Case 4: Click on Intermediate Wall Midpoint (T-Junction)

```
Input: Snapped to point on IntermediateWall (not at node)
Action:
  1. Call splitIntermediateWallAtPoint(wallId, point) - NEW ACTION NEEDED
  2. This creates:
     - New InnerWallNode at the split point
     - Two new IntermediateWalls replacing the original
     - Deletes original wall
  3. Use the new node's ID
Node: InnerWallNode (created by split action)
Behavior: END THE CHAIN - T-junction completes the drawing session
```

### Case 5: Click on Free Position Inside Perimeter

```
Input: Point not snapped to any wall/node, but inside a perimeter polygon
Action: Use addInnerWallNode at the point
Node: InnerWallNode
```

### Case 6: Click Outside Perimeter

```
Input: Point not inside any perimeter polygon
Action: Reject the click (validation error)
Behavior: Show error feedback, don't create wall
```

## Store Actions

### New Action: `splitIntermediateWallAtPoint`

Add to `intermediateWallsSlice.ts`:

```typescript
interface SplitIntermediateWallAtPointPayload {
  wallId: IntermediateWallId
  point: Vec2 // Point on the wall's center line
}

// Returns the new WallNodeId at the split point
splitIntermediateWallAtPoint: (state: IntermediateWallsState, payload: SplitIntermediateWallAtPointPayload) =>
  WallNodeId
```

**Implementation steps:**

1. Get the original wall and its geometry
2. Find the split point's parameter `t` along the center line (0-1)
3. Create a new `InnerWallNode` at the split point
4. Create two new `IntermediateWall` entities:
   - Wall A: original start → new node (copy start attachment, new end attachment)
   - Wall B: new node → original end (new start attachment, copy end attachment)
5. Copy properties (thickness, assembly) to both new walls
6. Delete the original wall
7. Update geometry for both new walls
8. Return the new node's ID

```typescript
function splitIntermediateWallAtPoint(
  state: IntermediateWallsState,
  payload: SplitIntermediateWallAtPointPayload
): WallNodeId {
  const { wallId, point } = payload
  const wall = state.intermediateWalls[wallId]
  const geometry = state._intermediateWallGeometry[wallId]

  // Find parameter t along center line
  const t = findParameterOnLineSegment(geometry.centerLine, point)

  // Create new inner node at split point
  const newNodeId = generateWallNodeId()
  state.wallNodes[newNodeId] = {
    id: newNodeId,
    perimeterId: wall.perimeterId,
    type: 'inner',
    position: point
  }

  // Create two new walls
  const wallAId = generateIntermediateWallId()
  const wallBId = generateIntermediateWallId()

  state.intermediateWalls[wallAId] = {
    id: wallAId,
    perimeterId: wall.perimeterId,
    start: wall.start,
    end: { nodeId: newNodeId, axis: wall.start.axis }, // Match axis alignment
    thickness: wall.thickness,
    wallAssemblyId: wall.wallAssemblyId,
    openingIds: [] // TODO: Split openings appropriately
  }

  state.intermediateWalls[wallBId] = {
    id: wallBId,
    perimeterId: wall.perimeterId,
    start: { nodeId: newNodeId, axis: wall.end.axis },
    end: wall.end,
    thickness: wall.thickness,
    wallAssemblyId: wall.wallAssemblyId,
    openingIds: []
  }

  // Delete original wall
  delete state.intermediateWalls[wallId]
  delete state._intermediateWallGeometry[wallId]

  // Update geometry for new walls
  updateIntermediateWallGeometry(state, wallAId)
  updateIntermediateWallGeometry(state, wallBId)
  updateWallNodeGeometry(state, newNodeId)

  return newNodeId
}
```

## BasePolylineTool Base Class

Create `src/editor/tools/shared/polyline/BasePolylineTool.ts`:

Similar to `BasePolygonTool` but for open chains instead of closed polygons.

### Key Differences from BasePolygonTool

| Aspect           | BasePolygonTool               | BasePolylineTool                             |
| ---------------- | ----------------------------- | -------------------------------------------- |
| Shape            | Closed polygon                | Open polyline                                |
| Finish condition | Click on first point or Enter | Click on existing wall (T-junction) or Enter |
| Minimum points   | 3                             | 2                                            |
| Preview          | Closed loop                   | Open chain                                   |

### Abstract Interface

```typescript
interface PolylineToolConfig<PointType, SnapResult> {
  // Convert snap result to a point
  snapToPoint(snap: SnapResult): Vec2

  // Determine if snap is a "terminating" snap (e.g., on existing wall)
  isTerminatingSnap(snap: SnapResult): boolean

  // Create the entity for a segment
  createSegment(startPoint: PointType, endPoint: PointType, startSnap: SnapResult, endSnap: SnapResult): void

  // Validate a potential point placement
  validatePoint(points: PointType[], newPoint: PointType, newSnap: SnapResult): ValidationResult

  // Get preview geometry for current segment
  getPreviewGeometry(startPoint: PointType, currentPoint: Vec2): PreviewGeometry
}

abstract class BasePolylineTool<PointType, SnapResult> implements Tool {
  protected points: PointType[] = []
  protected currentSnap: SnapResult | null = null
  protected config: PolylineToolConfig<PointType, SnapResult>

  // Common tool lifecycle
  onActivate(): void
  onDeactivate(): void

  // Mouse handling
  onMouseMove(position: Vec2, modifiers: Modifiers): void
  onClick(position: Vec2, modifiers: Modifiers): void

  // Keyboard handling
  onKeyDown(key: string, modifiers: Modifiers): void

  // Abstract methods for subclasses
  protected abstract performSnap(worldPos: Vec2): SnapResult | null
  protected abstract createPointFromSnap(snap: SnapResult): PointType

  // Protected helpers
  protected finishChain(): void
  protected cancelChain(): void
  protected addPoint(point: PointType, snap: SnapResult): void
}
```

### State Management

```typescript
interface PolylineToolState<PointType> {
  points: PointType[]
  isFinished: boolean
  isValid: boolean
  validationError?: string
}
```

## IntermediateWallTool Implementation

Create `src/editor/tools/intermediate-wall/add/IntermediateWallTool.ts`:

### Snap Types

```typescript
type IntermediateWallSnapResult =
  | { type: 'perimeter-corner'; corner: PerimeterCorner; position: Vec2 }
  | { type: 'perimeter-wall'; wall: PerimeterWall; position: Vec2; offset: Length }
  | { type: 'intermediate-wall-node'; node: WallNode; position: Vec2 }
  | { type: 'intermediate-wall-midpoint'; wall: IntermediateWall; position: Vec2 }
  | { type: 'perpendicular'; basePoint: Vec2; targetPoint: Vec2; referenceWall: IntermediateWall | PerimeterWall }
  | { type: 'alignment'; point: Vec2; referenceLine: LineSegment2D }
  | { type: 'free'; position: Vec2 }
```

### Point Type

```typescript
interface IntermediateWallPoint {
  position: Vec2
  snapResult: IntermediateWallSnapResult
  perimeterId: PerimeterId | null // Determined during placement
  nodeId?: WallNodeId // Set after node creation
}
```

### Tool Class

```typescript
class IntermediateWallTool extends BasePolylineTool<IntermediateWallPoint, IntermediateWallSnapResult> {
  private thickness: Length = fromMillimeters(100) // Default 100mm

  constructor(
    private store: Store,
    private snappingService: SnappingService,
    private canvas: Canvas
  ) {
    super({
      snapToPoint: snap => snap.position,
      isTerminatingSnap: snap => snap.type === 'intermediate-wall-midpoint',
      createSegment: (start, end, startSnap, endSnap) => this.createWallSegment(start, end, startSnap, endSnap),
      validatePoint: (points, newPoint, newSnap) => this.validateWallPoint(points, newPoint, newSnap),
      getPreviewGeometry: (start, current) => this.getWallPreview(start, current)
    })
  }

  protected performSnap(worldPos: Vec2): IntermediateWallSnapResult | null {
    // Priority order:
    // 1. Existing wall nodes
    // 2. Perimeter corners
    // 3. Perimeter wall points
    // 4. Intermediate wall midpoints
    // 5. Perpendicular snap
    // 6. Alignment snap
    // 7. Free position (if inside perimeter)

    return this.snappingService.snapForIntermediateWall(worldPos, this.points)
  }

  protected createPointFromSnap(snap: IntermediateWallSnapResult): IntermediateWallPoint {
    const perimeterId = this.determinePerimeterId(snap)
    return {
      position: snap.position,
      snapResult: snap,
      perimeterId
    }
  }

  private determinePerimeterId(snap: IntermediateWallSnapResult): PerimeterId | null {
    switch (snap.type) {
      case 'perimeter-corner':
        return snap.corner.perimeterId
      case 'perimeter-wall':
        return snap.wall.perimeterId
      case 'intermediate-wall-node':
        return snap.node.perimeterId
      case 'intermediate-wall-midpoint':
        return snap.wall.perimeterId
      case 'perpendicular':
      case 'alignment':
      case 'free':
        return this.findContainingPerimeter(snap.position)
    }
  }

  private createWallSegment(
    start: IntermediateWallPoint,
    end: IntermediateWallPoint,
    startSnap: IntermediateWallSnapResult,
    endSnap: IntermediateWallSnapResult
  ): void {
    if (!start.perimeterId || !end.perimeterId) return
    if (start.perimeterId !== end.perimeterId) return

    const perimeterId = start.perimeterId

    // Get or create start node
    const startNodeId = this.getOrCreateNode(startSnap, perimeterId)
    // Get or create end node
    const endNodeId = this.getOrCreateNode(endSnap, perimeterId)

    if (!startNodeId || !endNodeId) return

    // Create the wall
    this.store.dispatch.addIntermediateWall({
      perimeterId,
      start: { nodeId: startNodeId, axis: 'center' },
      end: { nodeId: endNodeId, axis: 'center' },
      thickness: this.thickness
    })
  }

  private getOrCreateNode(snap: IntermediateWallSnapResult, perimeterId: PerimeterId): WallNodeId | null {
    switch (snap.type) {
      case 'perimeter-corner':
        // Find existing node at corner or create one
        return this.store.dispatch.addPerimeterWallNode({
          perimeterId,
          wallId: snap.corner.startingWallId, // Use appropriate wall
          offsetFromCornerStart: fromMillimeters(0)
        })

      case 'perimeter-wall':
        return this.store.dispatch.addPerimeterWallNode({
          perimeterId,
          wallId: snap.wall.id,
          offsetFromCornerStart: snap.offset
        })

      case 'intermediate-wall-node':
        return snap.node.id

      case 'intermediate-wall-midpoint':
        // This triggers the split and returns new node ID
        return this.store.dispatch.splitIntermediateWallAtPoint({
          wallId: snap.wall.id,
          point: snap.position
        })

      case 'perpendicular':
      case 'alignment':
      case 'free':
        return this.store.dispatch.addInnerWallNode({
          perimeterId,
          position: snap.position
        })
    }
  }

  private validateWallPoint(
    points: IntermediateWallPoint[],
    newPoint: IntermediateWallPoint,
    newSnap: IntermediateWallSnapResult
  ): ValidationResult {
    // 1. Must be inside a perimeter
    if (!newPoint.perimeterId) {
      return { valid: false, error: 'Point must be inside a perimeter' }
    }

    // 2. If there are existing points, must be same perimeter
    if (points.length > 0 && points[0].perimeterId !== newPoint.perimeterId) {
      return { valid: false, error: 'All points must be in the same perimeter' }
    }

    // 3. Check for self-intersection with existing segments
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      const newSegment = { start: lastPoint.position, end: newPoint.position }

      for (let i = 0; i < points.length - 1; i++) {
        const existingSegment = { start: points[i].position, end: points[i + 1].position }
        if (lineSegmentsIntersect(newSegment, existingSegment)) {
          return { valid: false, error: 'Wall cannot cross existing walls' }
        }
      }
    }

    // 4. Check for intersection with existing intermediate walls
    const existingWalls = this.store.getIntermediateWallsByPerimeter(newPoint.perimeterId)
    for (const wall of existingWalls) {
      if (points.length > 0) {
        const lastPoint = points[points.length - 1]
        const newSegment = { start: lastPoint.position, end: newPoint.position }
        const wallSegment = wall.geometry.centerLine

        // Allow touching at endpoints, but not crossing
        if (lineSegmentsIntersect(newSegment, wallSegment)) {
          // Check if intersection is at an endpoint (allowed)
          const intersection = getLineSegmentIntersection(newSegment, wallSegment)
          if (intersection && !isEndpoint(intersection, wallSegment)) {
            return { valid: false, error: 'Wall cannot cross existing walls' }
          }
        }
      }
    }

    // 5. Minimum wall length
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      const distance = vec2Distance(lastPoint.position, newPoint.position)
      if (distance < fromMillimeters(50)) {
        // Minimum 50mm
        return { valid: false, error: 'Wall segment too short' }
      }
    }

    return { valid: true }
  }

  private getWallPreview(start: IntermediateWallPoint, current: Vec2): PreviewGeometry {
    const direction = vec2Normalize(vec2Subtract(current, start.position))
    const perpendicular = vec2Perpendicular(direction)
    const halfThickness = this.thickness / 2

    const offset = vec2Scale(perpendicular, halfThickness)

    return {
      type: 'polygon',
      points: [
        vec2Add(start.position, offset),
        vec2Add(current, offset),
        vec2Subtract(current, offset),
        vec2Subtract(start.position, offset)
      ],
      style: { fill: 'rgba(200, 200, 200, 0.5)', stroke: '#666', strokeWidth: 1 }
    }
  }

  setThickness(thickness: Length): void {
    this.thickness = thickness
  }
}
```

## Snapping Service Extension

Extend `SnappingService.ts` to support intermediate wall snapping:

```typescript
interface SnappingService {
  // Existing methods...

  // New method for intermediate wall tool
  snapForIntermediateWall(
    worldPos: Vec2,
    existingPoints: IntermediateWallPoint[]
  ): IntermediateWallSnapResult | null
}

// Implementation
snapForIntermediateWall(
  worldPos: Vec2,
  existingPoints: IntermediateWallPoint[]
): IntermediateWallSnapResult | null {
  const snapRadius = this.getSnapRadius()

  // 1. Check existing wall nodes
  const wallNodes = this.store.getAllWallNodes()
  for (const node of wallNodes) {
    if (vec2Distance(worldPos, node.geometry.position) < snapRadius) {
      return {
        type: 'intermediate-wall-node',
        node: node.model,
        position: node.geometry.position
      }
    }
  }

  // 2. Check perimeter corners
  const corners = this.store.getAllPerimeterCorners()
  for (const corner of corners) {
    if (vec2Distance(worldPos, corner.geometry.position) < snapRadius) {
      return {
        type: 'perimeter-corner',
        corner: corner.model,
        position: corner.geometry.position
      }
    }
  }

  // 3. Check perimeter walls
  const perimeterWalls = this.store.getAllPerimeterWalls()
  for (const wall of perimeterWalls) {
    const projection = projectPointOnLineSegment(wall.geometry.innerLine, worldPos)
    if (projection.distance < snapRadius) {
      return {
        type: 'perimeter-wall',
        wall: wall.model,
        position: projection.point,
        offset: projection.t * wall.geometry.wallLength
      }
    }
  }

  // 4. Check intermediate walls (midpoint snapping)
  const intermediateWalls = this.store.getAllIntermediateWalls()
  for (const wall of intermediateWalls) {
    const projection = projectPointOnLineSegment(wall.geometry.centerLine, worldPos)
    if (projection.distance < snapRadius) {
      // Check if near an endpoint (already handled by node snap)
      const nearStart = vec2Distance(projection.point, wall.geometry.centerLine.start) < snapRadius
      const nearEnd = vec2Distance(projection.point, wall.geometry.centerLine.end) < snapRadius
      if (!nearStart && !nearEnd) {
        return {
          type: 'intermediate-wall-midpoint',
          wall: wall.model,
          position: projection.point
        }
      }
    }
  }

  // 5. Perpendicular snapping (if we have previous point)
  if (existingPoints.length > 0) {
    const lastPoint = existingPoints[existingPoints.length - 1]
    const perpSnap = this.findPerpendicularSnap(worldPos, lastPoint.position, [
      ...perimeterWalls.map(w => w.geometry.centerLine),
      ...intermediateWalls.map(w => w.geometry.centerLine)
    ])
    if (perpSnap && vec2Distance(worldPos, perpSnap.targetPoint) < snapRadius * 2) {
      return {
        type: 'perpendicular',
        basePoint: lastPoint.position,
        targetPoint: perpSnap.targetPoint,
        referenceWall: perpSnap.referenceWall
      }
    }
  }

  // 6. Alignment snapping
  const alignmentSnap = this.findAlignmentSnap(worldPos, [
    ...perimeterWalls.map(w => w.geometry.centerLine),
    ...intermediateWalls.map(w => w.geometry.centerLine)
  ])
  if (alignmentSnap) {
    return alignmentSnap
  }

  // 7. Free position (validate inside perimeter)
  const containingPerimeter = this.findContainingPerimeter(worldPos)
  if (containingPerimeter) {
    return { type: 'free', position: worldPos }
  }

  return null
}
```

## Inspector Component

Create `src/editor/tools/intermediate-wall/add/IntermediateWallToolInspector.tsx`:

```tsx
import { useEffect, useState } from 'react'

import { Length, fromMillimeters, toMillimeters } from '@/building/model/units'

import { IntermediateWallTool } from './IntermediateWallTool'

interface IntermediateWallToolInspectorProps {
  tool: IntermediateWallTool
}

function IntermediateWallToolInspector({ tool }: IntermediateWallToolInspectorProps) {
  const [thickness, setThickness] = useState(() => toMillimeters(tool.getThickness()))

  useEffect(() => {
    tool.setThickness(fromMillimeters(thickness))
  }, [thickness, tool])

  return (
    <div className="inspector">
      <h3>Intermediate Wall</h3>

      <div className="field">
        <label>Thickness (mm)</label>
        <input
          type="number"
          value={thickness}
          onChange={e => setThickness(Number(e.target.value))}
          min={50}
          max={500}
          step={10}
        />
      </div>

      <div className="help">
        <p>Click to place wall points</p>
        <p>Press Enter to finish</p>
        <p>Press Escape to cancel</p>
      </div>
    </div>
  )
}

export default IntermediateWallToolInspector
```

## Overlay Component

Create `src/editor/tools/intermediate-wall/add/IntermediateWallToolOverlay.tsx`:

```tsx
import { useEffect, useRef } from 'react'

import { useToolState } from '@/editor/canvas/hooks/useToolState'

import { IntermediateWallTool } from './IntermediateWallTool'

interface IntermediateWallToolOverlayProps {
  tool: IntermediateWallTool
}

function IntermediateWallToolOverlay({ tool }: IntermediateWallToolOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const toolState = useToolState(tool)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw placed points and segments
    const points = toolState.points
    if (points.length > 0) {
      // Draw segments
      ctx.strokeStyle = '#666'
      ctx.lineWidth = toolState.thickness
      ctx.lineCap = 'butt'

      ctx.beginPath()
      ctx.moveTo(points[0].position.x, points[0].position.y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].position.x, points[i].position.y)
      }
      ctx.stroke()

      // Draw points
      ctx.fillStyle = '#333'
      for (const point of points) {
        ctx.beginPath()
        ctx.arc(point.position.x, point.position.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw preview segment
    if (points.length > 0 && toolState.currentSnap) {
      const lastPoint = points[points.length - 1]
      const currentPoint = toolState.currentSnap.position

      // Preview line
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)'
      ctx.lineWidth = toPixels(toolState.thickness)
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(lastPoint.position.x, lastPoint.position.y)
      ctx.lineTo(currentPoint.x, currentPoint.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Snap indicator
      drawSnapIndicator(ctx, toolState.currentSnap)
    }

    // Draw validation error if any
    if (!toolState.isValid && toolState.validationError) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'
      ctx.font = '14px sans-serif'
      ctx.fillText(toolState.validationError, 10, 20)
    }
  }, [toolState])

  return <canvas ref={canvasRef} className="tool-overlay" style={{ pointerEvents: 'none' }} />
}

function drawSnapIndicator(ctx: CanvasRenderingContext2D, snap: IntermediateWallSnapResult) {
  const { position, type } = snap

  ctx.strokeStyle = type === 'intermediate-wall-midpoint' ? '#ff6600' : '#00ff00'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.arc(position.x, position.y, 8, 0, Math.PI * 2)
  ctx.stroke()

  // Special indicator for T-junction
  if (type === 'intermediate-wall-midpoint') {
    ctx.fillStyle = '#ff6600'
    ctx.font = '12px sans-serif'
    ctx.fillText('T', position.x + 12, position.y + 4)
  }
}

export default IntermediateWallToolOverlay
```

## Tool Registration

### Update `src/editor/tools/system/types.ts`

```typescript
export type ToolId =
  | 'select'
  | 'perimeter-add'
  | 'intermediate-wall-add'  // NEW
  | // ... other tools
```

### Update `src/editor/tools/system/metadata.ts`

```typescript
import intermediateWallAddIcon from '@/shared/assets/icons/wall-intermediate.svg'

export const toolMetadata: Record<ToolId, ToolMetadata> = {
  // ... existing tools

  'intermediate-wall-add': {
    id: 'intermediate-wall-add',
    name: 'Intermediate Wall',
    icon: intermediateWallAddIcon,
    category: 'walls',
    shortcut: 'W',
    description: 'Draw interior partition walls',
    factory: () => new IntermediateWallTool(/* dependencies */)
  }
}
```

## Validation Rules Summary

1. **Inside perimeter**: All points must be inside a perimeter polygon
2. **Same perimeter**: All points in a chain must belong to the same perimeter
3. **No self-intersection**: Wall segments cannot cross each other within the same chain
4. **No wall crossing**: Cannot cross existing intermediate walls (except at endpoints)
5. **Minimum length**: Each segment must be at least 50mm
6. **Perimeter walls allowed**: Can touch/cross perimeter walls (they're boundaries)

## File Structure

```
src/editor/tools/
├── shared/
│   ├── polygon/
│   │   └── BasePolygonTool.ts (existing)
│   └── polyline/
│       └── BasePolylineTool.ts (NEW)
│
├── intermediate-wall/
│   └── add/
│       ├── IntermediateWallTool.ts (NEW)
│       ├── IntermediateWallToolInspector.tsx (NEW)
│       └── IntermediateWallToolOverlay.tsx (NEW)
│
└── system/
    ├── types.ts (UPDATE - add ToolId)
    ├── metadata.ts (UPDATE - register tool)
    └── ToolSystem.ts (UPDATE - if needed)

src/building/store/slices/
└── intermediateWallsSlice.ts (UPDATE - add splitIntermediateWallAtPoint)

src/editor/canvas/services/
└── SnappingService.ts (UPDATE - add snapForIntermediateWall)
```

## Key Patterns to Follow

1. **Vec2 creation**: Always use `newVec2(x, y)`, never object literals
2. **Geometry updates**: Call `updateIntermediateWallGeometry(state, id)` after every mutation
3. **Getters**: Combine base model + geometry in getter functions
4. **Timestamps**: Update via `touch(state, entityId)` for undo/redo
5. **State access**: Geometry functions need perimeter geometry access for perimeter nodes

## Implementation Phases

### Phase 1: Store & Geometry (Current)

- [x] Implement `intermediateWallGeometry.ts`
- [x] Implement `intermediateWallsSlice.ts` actions
- [x] Integrate into main store
- [ ] Unit tests for geometry computation
- [ ] Implement `splitIntermediateWallAtPoint` action

### Phase 2: Drawing Tools

- [ ] Create `BasePolylineTool` base class
- [ ] Create `IntermediateWallTool`
- [ ] Implement snapping for intermediate walls
- [ ] Implement perpendicular snapping
- [ ] Implement node creation logic
- [ ] Connect to perimeter walls

### Phase 3: UI Components

- [ ] Create `IntermediateWallToolInspector`
- [ ] Create `IntermediateWallToolOverlay`
- [ ] Add tool icon
- [ ] Register tool in ToolSystem

### Phase 4: Testing

- [ ] Test snapping to all snap types
- [ ] Test T-junction creation
- [ ] Test validation rules
- [ ] Test chain drawing and finishing
- [ ] Test cancellation

### Phase 5: Polish

- [ ] Visual feedback for snap types
- [ ] Error messages display
- [ ] Keyboard shortcuts
- [ ] Undo/redo support
