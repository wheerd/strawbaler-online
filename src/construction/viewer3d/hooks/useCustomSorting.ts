import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

/**
 * Custom sorting for transparent objects
 *
 * For wall layers, sort by minimum depth (front face) instead of center.
 * This fixes sorting issues with thin geometry that has large surface area.
 */
export function useCustomTransparentSorting(): void {
  const { scene } = useThree()

  useEffect(() => {
    // Custom sort function for transparent objects
    const customSort = (a: THREE.Object3D, b: THREE.Object3D) => {
      // Get camera-space Z depth
      const getMinDepth = (obj: THREE.Object3D): number => {
        // Check if this is a wall layer
        const isWallLayer = obj.userData.renderMode === 'depth-peeling'

        if (isWallLayer && obj instanceof THREE.Mesh && obj.geometry.boundingBox) {
          // For wall layers, use the front face (minimum Z in camera space)
          const box = obj.geometry.boundingBox
          const worldMatrix = obj.matrixWorld

          // Get all 8 corners of the bounding box
          const corners = [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z)
          ]

          // Transform to world space and find minimum Z
          let minZ = Infinity
          corners.forEach(corner => {
            corner.applyMatrix4(worldMatrix)
            minZ = Math.min(minZ, corner.z)
          })

          return minZ
        }

        // For other objects, use center (default behavior)
        const position = new THREE.Vector3()
        obj.getWorldPosition(position)
        return position.z
      }

      const depthA = getMinDepth(a)
      const depthB = getMinDepth(b)

      // Sort front-to-back (smaller Z first)
      return depthA - depthB
    }

    // Override the scene's transparent object sorting
    // This is called by WebGLRenderer before rendering transparent objects
    scene.onBeforeRender = () => {
      // Get all transparent objects
      const transparentObjects: THREE.Object3D[] = []

      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          const material = obj.material as THREE.Material
          if (material && material.transparent && obj.visible) {
            transparentObjects.push(obj)
          }
        }
      })

      // Sort using our custom function
      transparentObjects.sort(customSort)

      // Update renderOrder based on sorted position
      transparentObjects.forEach((obj, index) => {
        obj.renderOrder = 1000 + index
      })
    }

    return () => {
      // Cleanup - reset to no-op
      scene.onBeforeRender = function noop() {
        // No-op function for cleanup
      }
    }
  }, [scene])
}
