import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js'

// Extend TAARenderPass type to include accumulateIndex (not in @types but exists in implementation)
interface ExtendedTAARenderPass extends TAARenderPass {
  accumulateIndex: number
}

// Simple event emitter for TAA reset events
class TAAResetEmitter {
  private listeners = new Set<() => void>()

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(): void {
    this.listeners.forEach(listener => listener())
  }
}

// Global instance to coordinate TAA resets across opacity changes
export const taaResetEmitter = new TAAResetEmitter()

/**
 * Hook to add Temporal Anti-Aliasing (TAA) to the scene.
 *
 * TAA accumulates jittered camera samples across frames to create
 * high-quality anti-aliasing. This is especially effective for smoothing
 * alpha hashing dithering patterns in transparent materials.
 *
 * When the camera moves, accumulation automatically resets to prevent
 * ghosting artifacts.
 *
 * @param enabled - Whether TAA is enabled
 * @param sampleLevel - Number of samples to accumulate (0 = unlimited, higher = slower convergence)
 */
export function useTAA(enabled = true, sampleLevel = 0): void {
  const { scene, camera, gl, size } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)
  const taaPassRef = useRef<ExtendedTAARenderPass | null>(null)

  // Track camera position/rotation to detect movement
  const prevCameraState = useRef({
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion()
  })

  // Create the effect composer and TAA pass
  const { composer, taaPass } = useMemo(() => {
    const composer = new EffectComposer(gl)
    const taaPass = new TAARenderPass(scene, camera)

    // sampleLevel 0 means unlimited accumulation (best quality for static scenes)
    // Higher values limit accumulation (less blur during motion)
    taaPass.sampleLevel = sampleLevel
    taaPass.unbiased = false // Use biased mode for better performance
    taaPass.accumulate = true // Enable accumulation for smooth anti-aliasing

    composer.addPass(taaPass)

    // Add output pass to handle tone mapping and color space conversion
    const outputPass = new OutputPass()
    composer.addPass(outputPass)

    return { composer, taaPass }
  }, [scene, camera, gl, sampleLevel])

  // Store refs
  useEffect(() => {
    composerRef.current = composer
    taaPassRef.current = taaPass as ExtendedTAARenderPass
    return () => {
      composerRef.current = null
      taaPassRef.current = null
    }
  }, [composer, taaPass])

  // Update composer size when viewport changes and reset accumulation
  useEffect(() => {
    composer.setSize(size.width, size.height)
    const extendedPass = taaPass as ExtendedTAARenderPass
    if (extendedPass.accumulate) {
      extendedPass.accumulateIndex = -1 // Reset accumulation on resize
    }
  }, [composer, taaPass, size.width, size.height])

  // Update sample level when it changes
  useEffect(() => {
    taaPass.sampleLevel = sampleLevel
  }, [taaPass, sampleLevel])

  // Subscribe to TAA reset events (e.g., when opacity changes)
  useEffect(() => {
    const resetAccumulation = () => {
      if (taaPassRef.current?.accumulate) {
        taaPassRef.current.accumulateIndex = -1
      }
    }

    return taaResetEmitter.subscribe(resetAccumulation)
  }, [])

  // Render using the composer instead of the default renderer
  useFrame(() => {
    if (!enabled || !composerRef.current || !taaPassRef.current) {
      return
    }

    const taaPass = taaPassRef.current

    // Check if camera has moved
    const cameraMoved =
      !camera.position.equals(prevCameraState.current.position) ||
      !camera.quaternion.equals(prevCameraState.current.quaternion)

    // Reset accumulation on camera movement
    if (cameraMoved && taaPass.accumulate) {
      taaPass.accumulateIndex = -1
      prevCameraState.current.position.copy(camera.position)
      prevCameraState.current.quaternion.copy(camera.quaternion)
    }

    composerRef.current.render()
  }, 1) // Priority 1 to render after scene updates
}
