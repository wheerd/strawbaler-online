import { Layer, Line, Circle } from 'react-konva'
import { useActiveTool, useIsDrawing, useShowSnapPreview, useSnapPreviewPoint, useActiveFloorId, useViewport } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { usePoints, useModelStore } from '@/model/store'
import {
  findSnapPoint,
  type SnapResult
} from '@/model/operations'
import type { Point2D } from '@/types/geometry'

interface WallPreviewLayerProps {
  wallDrawingStart: Point2D | null
  stageWidth: number
  stageHeight: number
}

export function WallPreviewLayer ({ wallDrawingStart, stageWidth, stageHeight }: WallPreviewLayerProps): React.JSX.Element {
  const activeTool = useActiveTool()
  const isDrawing = useIsDrawing()
  const showSnapPreview = useShowSnapPreview()
  const snapPreviewPoint = useSnapPreviewPoint()
  const activeFloorId = useActiveFloorId()
  const viewport = useViewport()
  const points = usePoints()
  const modelState = useModelStore()

  if (activeTool !== 'wall') {
    return <Layer name='wall-preview' />
  }

  // Get current snap result if we're drawing a wall
  let snapResult: SnapResult | null = null

  if (isDrawing && (wallDrawingStart != null) && (snapPreviewPoint != null)) {
    snapResult = findSnapPoint(modelState, snapPreviewPoint, wallDrawingStart, activeFloorId, false)
  }

  // Calculate infinite line extent accounting for zoom level and stage dimensions
  // Transform stage dimensions to world coordinates to ensure lines span beyond visible area
  const worldWidth = stageWidth / viewport.zoom
  const worldHeight = stageHeight / viewport.zoom
  const lineExtent = Math.max(worldWidth, worldHeight) * 2

  return (
    <Layer name='wall-preview' listening={false}>
      {/* Show snap preview point */}
      {showSnapPreview && (snapPreviewPoint != null) && (
        <Circle
          x={snapPreviewPoint.x}
          y={snapPreviewPoint.y}
          radius={50}
          fill='#007acc'
          opacity={0.7}
          listening={false}
        />
      )}

      {/* Show preview wall line */}
      {isDrawing && (wallDrawingStart != null) && (snapPreviewPoint != null) && (
        <Line
          points={[
            wallDrawingStart.x,
            wallDrawingStart.y,
            snapPreviewPoint.x,
            snapPreviewPoint.y
          ]}
          stroke='#007acc'
          strokeWidth={200} // Make it same thickness as actual walls for visibility
          opacity={0.5}
          dash={[10, 10]} // Larger dashes to match thicker line
          listening={false}
        />
      )}

      {/* Show connection points as snap targets */}
      {Array.from(points.values()).map(point => (
        <Circle
          key={point.id}
          x={point.position.x}
          y={point.position.y}
          radius={80}
          fill='#ff6b35'
          opacity={0.6}
          listening={false}
        />
      ))}

      {/* Show active snap result */}
      {(snapResult != null) && (
        <Circle
          x={snapResult.position.x}
          y={snapResult.position.y}
          radius={15}
          fill={snapResult.snapType === 'intersection' ? '#ff00ff' : snapResult.type === 'point' ? '#ff6600' : '#0066ff'}
          stroke='#ffffff'
          strokeWidth={3}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Show active snap line if snapping to a line */}
      {(snapResult != null) && snapResult.type === 'line' && (snapResult.line != null) && (
        <Line
          points={[
            snapResult.line.position.x - lineExtent * snapResult.line.direction.x,
            snapResult.line.position.y - lineExtent * snapResult.line.direction.y,
            snapResult.line.position.x + lineExtent * snapResult.line.direction.x,
            snapResult.line.position.y + lineExtent * snapResult.line.direction.y
          ]}
          stroke={(() => {
            const colors = {
              horizontal: '#0066ff',
              vertical: '#6600ff',
              extension: '#ff6600',
              perpendicular: '#00ff00'
            }
            return colors[snapResult.line.type] ?? '#666666'
          })()}
          strokeWidth={20}
          dash={[10, 5]}
          opacity={0.7}
          listening={false}
        />
      )}

      {/* Show intersection lines when snapping to intersection */}
      {(snapResult != null) && snapResult.snapType === 'intersection' && (snapResult.intersectionLines != null) &&
        snapResult.intersectionLines.map((line, index) => (
          <Line
            key={`intersection-line-${index}`}
            points={[
              line.position.x - lineExtent * line.direction.x,
              line.position.y - lineExtent * line.direction.y,
              line.position.x + lineExtent * line.direction.x,
              line.position.y + lineExtent * line.direction.y
            ]}
            stroke={(() => {
              const colors = {
                horizontal: '#0066ff',
                vertical: '#6600ff',
                extension: '#ff6600',
                perpendicular: '#00ff00'
              }
              return colors[line.type] ?? '#666666'
            })()}
            strokeWidth={20}
            dash={[10, 5]}
            opacity={0.7}
            listening={false}
          />
        ))}

    </Layer>
  )
}
