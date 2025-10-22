import * as THREE from 'three'

import type { ExtrudedPolygon } from '@/construction/shapes'

export function computeExtrudedPolygonGeometry(shape: ExtrudedPolygon): {
  geometry: THREE.ExtrudeGeometry
  matrix: THREE.Matrix4
} {
  const outerPoints = shape.polygon.outer.points.map(p => new THREE.Vector2(p[0], p[1]))

  const threeShape = new THREE.Shape(outerPoints)

  for (const hole of shape.polygon.holes) {
    const holePoints = hole.points.map(p => new THREE.Vector2(p[0], p[1]))
    const holePath = new THREE.Path(holePoints)
    threeShape.holes.push(holePath)
  }

  const extrudeSettings = {
    depth: Math.abs(shape.thickness),
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
  }

  const geometry = new THREE.ExtrudeGeometry(threeShape, extrudeSettings)

  const matrix = new THREE.Matrix4()

  if (shape.plane === 'xy') {
    matrix.makeRotationX(-Math.PI / 2)
    if (shape.thickness < 0) {
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, -shape.thickness))
    }
  } else if (shape.plane === 'xz') {
    if (shape.thickness < 0) {
      matrix.makeTranslation(0, 0, -shape.thickness)
    }
  } else if (shape.plane === 'yz') {
    matrix.makeRotationY(Math.PI / 2)
    matrix.multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 2))
    if (shape.thickness < 0) {
      matrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, -shape.thickness))
    }
  }

  return { geometry, matrix }
}
