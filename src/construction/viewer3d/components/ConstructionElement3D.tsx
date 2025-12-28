import type { ConstructionElement } from '@/construction/elements'
import { getMaterialById } from '@/construction/materials/store'
import { useEffectiveOpacity } from '@/construction/viewer3d/context/TagOpacityContext'
import { toThreeTransform } from '@/construction/viewer3d/utils/geometry'
import { getShapeGeometry } from '@/construction/viewer3d/utils/geometryCache'
import { type RenderMode, getLineMaterial, getMeshMaterial } from '@/construction/viewer3d/utils/materialCache'

interface ConstructionElement3DProps {
  element: ConstructionElement
  parentOpacity?: number
  parentTags?: { id: string; category: string }[]
}

function stripAlphaFromHex(color: string): string {
  if (color.startsWith('#') && color.length === 9) {
    return color.slice(0, 7)
  }
  return color
}

function ConstructionElement3D({
  element,
  parentOpacity = 1,
  parentTags = []
}: ConstructionElement3DProps): React.JSX.Element | null {
  const material = getMaterialById(element.material)

  if (!material) return null

  const color = stripAlphaFromHex(material.color)
  const elementOpacity = useEffectiveOpacity(element.tags ?? [])
  const opacity = Math.min(parentOpacity, elementOpacity)

  const { position, rotation, scale } = toThreeTransform(element.transform)

  if (opacity === 0) return null

  // Get geometry (single path for all shapes)
  const { geometry, edgesGeometry, cacheKey } = getShapeGeometry(element.shape)

  // Determine render mode based on tags and opacity
  // Check both element tags and parent tags (for grouped wall layers)
  const allTags = [...(element.tags ?? []), ...parentTags]
  const isWallLayer = allTags.some(tag => tag.category === 'wall-layer')
  const renderMode: RenderMode = opacity === 1.0 ? 'opaque' : isWallLayer ? 'depth-peeling' : 'transparent'

  const meshMaterial = getMeshMaterial(color, opacity, renderMode)
  const lineMaterial = getLineMaterial('#000000', 0.4, 1)

  // Wall layers need higher renderOrder to render after other transparent objects
  // This fixes sorting issues with thin but large surface area geometry
  const renderOrder = isWallLayer && opacity < 1.0 ? 1000 : 0

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh
        geometry={geometry}
        userData={{ geometryKey: cacheKey, renderMode, opacity }}
        dispose={null}
        material={meshMaterial}
        renderOrder={renderOrder}
      >
        <lineSegments geometry={edgesGeometry} dispose={null} material={lineMaterial} />
      </mesh>
    </group>
  )
}

export default ConstructionElement3D
