import type { EntityId, WallId, WallNodeId } from '@/building/model/ids'
import { removeConstraintsForEntityDraft } from '@/building/store/slices/constraintsSlice'
import { removeTimestampDraft } from '@/building/store/slices/timestampsSlice'
import type { StoreState } from '@/building/store/types'

export function cleanUpOrphaned(state: StoreState) {
  // Track IDs of entities to delete for timestamp cleanup
  const entityIdsToRemove: EntityId[] = []

  // Track valid wall IDs while cleaning up walls
  const validWallIds = new Set<WallId>()
  const validNodeIds = new Set<WallNodeId>()

  // Clean up orphaned perimeter walls
  for (const wall of Object.values(state.perimeterWalls)) {
    if (!(wall.perimeterId in state.perimeters) || !state.perimeters[wall.perimeterId].wallIds.includes(wall.id)) {
      delete state.perimeterWalls[wall.id]
      delete state._perimeterWallGeometry[wall.id]
      entityIdsToRemove.push(wall.id)
      removeConstraintsForEntityDraft(state, wall.id)
    } else {
      validWallIds.add(wall.id)
      wall.wallNodeIds = wall.wallNodeIds.filter(nodeId => nodeId in state.wallNodes)
    }
  }

  // Clean up orphaned intermediate walls
  for (const wall of Object.values(state.intermediateWalls)) {
    const startNodeExists = wall.start.nodeId in state.wallNodes
    const endNodeExists = wall.end.nodeId in state.wallNodes
    if (
      !(wall.perimeterId in state.perimeters) ||
      !state.perimeters[wall.perimeterId].intermediateWallIds.includes(wall.id) ||
      !startNodeExists ||
      !endNodeExists
    ) {
      delete state.intermediateWalls[wall.id]
      delete state._intermediateWallGeometry[wall.id]
      entityIdsToRemove.push(wall.id)
      removeConstraintsForEntityDraft(state, wall.id)
    } else {
      validWallIds.add(wall.id)
    }
  }

  // Clean up orphaned corners
  for (const corner of Object.values(state.perimeterCorners)) {
    if (
      !(corner.perimeterId in state.perimeters) ||
      !state.perimeters[corner.perimeterId].cornerIds.includes(corner.id)
    ) {
      delete state.perimeterCorners[corner.id]
      delete state._perimeterCornerGeometry[corner.id]
      entityIdsToRemove.push(corner.id)
      removeConstraintsForEntityDraft(state, corner.id)
    }
  }

  // Clean up orphaned openings
  for (const opening of Object.values(state.openings)) {
    if (!validWallIds.has(opening.wallId) || !state.perimeterWalls[opening.wallId].entityIds.includes(opening.id)) {
      delete state.openings[opening.id]
      delete state._openingGeometry[opening.id]
      entityIdsToRemove.push(opening.id)
      removeConstraintsForEntityDraft(state, opening.id)
    }
  }

  // Clean up orphaned posts
  for (const post of Object.values(state.wallPosts)) {
    if (!validWallIds.has(post.wallId) || !state.perimeterWalls[post.wallId].entityIds.includes(post.id)) {
      delete state.wallPosts[post.id]
      delete state._wallPostGeometry[post.id]
      entityIdsToRemove.push(post.id)
      removeConstraintsForEntityDraft(state, post.id)
    }
  }

  // Clean up orphaned wall nodes
  for (const node of Object.values(state.wallNodes)) {
    const remainingWallIds = node.connectedWallIds.filter(wallId => validWallIds.has(wallId))
    const dependantWallExists = node.type !== 'perimeter' || validWallIds.has(node.wallId)
    if (remainingWallIds.length === 0 || !dependantWallExists) {
      // Node is orphaned - delete it
      delete state.wallNodes[node.id]
      delete state._wallNodeGeometry[node.id]
      entityIdsToRemove.push(node.id)
      removeConstraintsForEntityDraft(state, node.id)
    } else {
      validNodeIds.add(node.id)
      node.connectedWallIds = remainingWallIds
    }
  }

  // Update perimeter references to walls and nodes to ensure they only reference valid IDs
  for (const perimeter of Object.values(state.perimeters)) {
    perimeter.wallIds = perimeter.wallIds.filter(wallId => validWallIds.has(wallId))
    perimeter.intermediateWallIds = perimeter.intermediateWallIds.filter(wallId => validWallIds.has(wallId))
    perimeter.wallNodeIds = perimeter.wallNodeIds.filter(nodeId => validNodeIds.has(nodeId))
  }

  if (entityIdsToRemove.length > 0) {
    removeTimestampDraft(state, ...entityIdsToRemove)
    cleanUpOrphaned(state) // Recursively clean up in case of cascading deletions
  }
}
