import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { DepthPeelingCompositeMaterial } from '@/construction/viewer3d/shaders/DepthPeelingComposite'
import { DepthPeelingMaterial } from '@/construction/viewer3d/shaders/DepthPeelingMaterial'

/**
 * Depth Peeling Configuration
 */
export interface DepthPeelingConfig {
  enabled: boolean
  layerCount: number // Total layers (must be even for dual-depth peeling)
}

/**
 * Depth Peeling Render Targets
 */
interface DepthPeelingTargets {
  // Color + depth targets for each layer
  layers: {
    colorTarget: THREE.WebGLRenderTarget
    depthTarget: THREE.WebGLRenderTarget
  }[]
  // Opaque scene target
  opaqueTarget: THREE.WebGLRenderTarget
  // Final composite target
  compositeTarget: THREE.WebGLRenderTarget
}

/**
 * Hook to enable dual-depth peeling for order-independent transparency
 *
 * This implements a 6-layer dual-depth peeling algorithm:
 * - Pass 1: Captures front-most + back-most layers (layers 0 & 5)
 * - Pass 2: Captures next layers (layers 1 & 4)
 * - Pass 3: Captures middle layers (layers 2 & 3)
 *
 * @param config - Depth peeling configuration
 */
export function useDepthPeeling(config: DepthPeelingConfig = { enabled: true, layerCount: 6 }): void {
  const { scene, camera, gl, size } = useThree()
  const targetsRef = useRef<DepthPeelingTargets | null>(null)
  const compositeMaterialRef = useRef<DepthPeelingCompositeMaterial | null>(null)
  const fullscreenQuadRef = useRef<THREE.Mesh | null>(null)

  // Create render targets
  const targets = useMemo(() => {
    const width = size.width
    const height = size.height

    const createColorTarget = (): THREE.WebGLRenderTarget => {
      return new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthBuffer: false,
        stencilBuffer: false
      })
    }

    const createDepthTarget = (): THREE.WebGLRenderTarget => {
      return new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat, // Store depth in RGBA for compatibility
        type: THREE.FloatType,
        depthBuffer: true,
        stencilBuffer: false
      })
    }

    const layers: DepthPeelingTargets['layers'] = []
    for (let i = 0; i < config.layerCount; i++) {
      layers.push({
        colorTarget: createColorTarget(),
        depthTarget: createDepthTarget()
      })
    }

    return {
      layers,
      opaqueTarget: new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        depthBuffer: true,
        stencilBuffer: false
      }),
      compositeTarget: createColorTarget()
    }
  }, [size.width, size.height, config.layerCount])

  // Store targets in ref
  useEffect(() => {
    targetsRef.current = targets
    return () => {
      // Cleanup render targets
      targets.layers.forEach(layer => {
        layer.colorTarget.dispose()
        layer.depthTarget.dispose()
      })
      targets.opaqueTarget.dispose()
      targets.compositeTarget.dispose()
    }
  }, [targets])

  // Create composite material
  const compositeMaterial = useMemo(() => {
    return new DepthPeelingCompositeMaterial(config.layerCount)
  }, [config.layerCount])

  useEffect(() => {
    compositeMaterialRef.current = compositeMaterial
    return () => {
      compositeMaterial.dispose()
    }
  }, [compositeMaterial])

  // Create fullscreen quad for compositing
  const fullscreenQuad = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, compositeMaterial)
    mesh.frustumCulled = false
    return mesh
  }, [compositeMaterial])

  useEffect(() => {
    fullscreenQuadRef.current = fullscreenQuad
    return () => {
      fullscreenQuad.geometry.dispose()
    }
  }, [fullscreenQuad])

  // Partition scene into opaque and transparent (wall layer) objects
  const partitionScene = (): { opaque: THREE.Object3D[]; wallLayers: THREE.Object3D[]; other: THREE.Object3D[] } => {
    const opaque: THREE.Object3D[] = []
    const wallLayers: THREE.Object3D[] = []
    const other: THREE.Object3D[] = []

    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const renderMode = obj.userData.renderMode
        const opacity = obj.userData.opacity ?? 1.0

        if (opacity === 1.0 || !renderMode) {
          opaque.push(obj)
        } else if (renderMode === 'depth-peeling') {
          wallLayers.push(obj)
        } else {
          other.push(obj)
        }
      }
    })

    return { opaque, wallLayers, other }
  }

  // Custom render loop with depth peeling
  useFrame(({ invalidate }) => {
    if (!config.enabled || !targetsRef.current || !compositeMaterialRef.current) {
      // Fallback to normal rendering
      gl.setRenderTarget(null)
      gl.clear()
      gl.render(scene, camera)
      invalidate()
      return
    }

    const targets = targetsRef.current
    const { opaque, wallLayers, other } = partitionScene()

    // If no wall layers, use normal rendering
    if (wallLayers.length === 0) {
      gl.setRenderTarget(null)
      gl.clear()
      gl.render(scene, camera)
      invalidate()
      return
    }

    // Save original visibility and materials
    const savedVisible = new Map<THREE.Object3D, boolean>()
    const savedMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()

    scene.traverse(obj => {
      savedVisible.set(obj, obj.visible)
    })

    // Step 1: Render opaque objects
    wallLayers.forEach(obj => (obj.visible = false))
    other.forEach(obj => (obj.visible = false))

    gl.setRenderTarget(targets.opaqueTarget)
    gl.clear()
    gl.render(scene, camera)

    // Step 2: Dual-depth peeling passes
    const passCount = config.layerCount / 2

    for (let pass = 0; pass < passCount; pass++) {
      const frontLayerIndex = pass
      const backLayerIndex = config.layerCount - 1 - pass

      // Hide opaque objects, show only wall layers
      opaque.forEach(obj => (obj.visible = false))
      wallLayers.forEach(obj => (obj.visible = true))
      other.forEach(obj => (obj.visible = false))

      // Update wall layer materials for this pass
      wallLayers.forEach(obj => {
        if (obj instanceof THREE.Mesh) {
          const material = obj.material as DepthPeelingMaterial
          if (!savedMaterials.has(obj)) {
            savedMaterials.set(obj, material)
          }

          // Update peeling mode and depth textures
          if (pass === 0) {
            material.peelingMode = 'init'
          } else {
            material.peelingMode = 'front'
            material.frontDepthTexture = targets.layers[frontLayerIndex - 1].depthTarget.texture
          }

          material.updateCamera(camera)
        }
      })

      // Render front layer
      gl.setRenderTarget(targets.layers[frontLayerIndex].depthTarget)
      gl.clear()
      gl.render(scene, camera)

      // Copy color
      gl.setRenderTarget(targets.layers[frontLayerIndex].colorTarget)
      gl.clear()
      gl.render(scene, camera)

      // Render back layer (if not the middle pass)
      if (frontLayerIndex !== backLayerIndex) {
        wallLayers.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
            const material = obj.material as DepthPeelingMaterial
            material.peelingMode = 'back'
            material.backDepthTexture = pass === 0 ? null : targets.layers[backLayerIndex + 1].depthTarget.texture
          }
        })

        gl.setRenderTarget(targets.layers[backLayerIndex].depthTarget)
        gl.clear()
        gl.render(scene, camera)

        gl.setRenderTarget(targets.layers[backLayerIndex].colorTarget)
        gl.clear()
        gl.render(scene, camera)
      }
    }

    // Step 3: Composite all layers
    compositeMaterialRef.current.setOpaqueTexture(targets.opaqueTarget.texture)
    for (let i = 0; i < config.layerCount; i++) {
      compositeMaterialRef.current.setLayerTexture(i, targets.layers[i].colorTarget.texture)
    }

    // Render composite to screen
    scene.traverse(obj => (obj.visible = false))
    gl.setRenderTarget(null)
    gl.clear()

    // Render fullscreen quad
    const tempScene = new THREE.Scene()
    const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    if (fullscreenQuadRef.current) {
      tempScene.add(fullscreenQuadRef.current)
    }
    gl.render(tempScene, tempCamera)

    // Restore visibility and materials
    savedVisible.forEach((visible, obj) => {
      obj.visible = visible
    })
    savedMaterials.forEach((material, mesh) => {
      mesh.material = material
    })

    // Request next frame
    invalidate()
  }, 0)
}
