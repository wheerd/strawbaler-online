import * as THREE from 'three'

/**
 * Depth Peeling Composite Shader
 *
 * Combines multiple depth-peeled layers into a single composited image.
 * Blends layers from front to back using standard alpha blending.
 */

export interface CompositeLayers {
  colorTextures: THREE.Texture[]
  depthTextures: THREE.Texture[]
}

export function createDepthPeelingCompositeShader(layerCount: number): {
  uniforms: Record<string, THREE.IUniform>
  vertexShader: string
  fragmentShader: string
} {
  // Create uniforms for each layer
  const uniforms: Record<string, THREE.IUniform> = {
    opaqueTexture: { value: null }
  }

  for (let i = 0; i < layerCount; i++) {
    uniforms[`layer${i}Color`] = { value: null }
  }

  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  // Build fragment shader with dynamic layer count
  const layerSamplersDecl = Array.from({ length: layerCount }, (_, i) => `uniform sampler2D layer${i}Color;`).join('\n')

  const fragmentShader = `
    uniform sampler2D opaqueTexture;
    ${layerSamplersDecl}
    
    varying vec2 vUv;
    
    void main() {
      // Start with opaque background
      vec4 color = texture2D(opaqueTexture, vUv);
      
      // Blend transparent layers front-to-back
      ${Array.from(
        { length: layerCount },
        (_, i) => `
      {
        vec4 layer = texture2D(layer${i}Color, vUv);
        if (layer.a > 0.001) {
          color.rgb = color.rgb * (1.0 - layer.a) + layer.rgb * layer.a;
        }
      }`
      ).join('\n')}
      
      gl_FragColor = vec4(color.rgb, 1.0);
    }
  `

  return { uniforms, vertexShader, fragmentShader }
}

export class DepthPeelingCompositeMaterial extends THREE.ShaderMaterial {
  constructor(layerCount: number) {
    const shader = createDepthPeelingCompositeShader(layerCount)

    super({
      uniforms: shader.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      depthWrite: false,
      depthTest: false
    })
  }

  setOpaqueTexture(texture: THREE.Texture): void {
    this.uniforms.opaqueTexture.value = texture
  }

  setLayerTexture(index: number, texture: THREE.Texture): void {
    const uniformName = `layer${index}Color`
    if (this.uniforms[uniformName]) {
      this.uniforms[uniformName].value = texture
    }
  }
}
