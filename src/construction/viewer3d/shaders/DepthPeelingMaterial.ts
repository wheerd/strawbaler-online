import * as THREE from 'three'

/**
 * Depth Peeling Material for Order-Independent Transparency
 *
 * This material extends MeshStandardMaterial to support dual-depth peeling.
 * It can render either the front-most or back-most fragments by comparing
 * against previous depth layers.
 */

export interface DepthPeelingMaterialParameters extends THREE.MeshStandardMaterialParameters {
  // Previous depth textures for peeling
  frontDepthTexture?: THREE.Texture | null
  backDepthTexture?: THREE.Texture | null
  // Which peeling pass: 'front', 'back', or 'init' (first pass)
  peelingMode?: 'init' | 'front' | 'back'
}

export class DepthPeelingMaterial extends THREE.ShaderMaterial {
  constructor(parameters: DepthPeelingMaterialParameters = {}) {
    const {
      frontDepthTexture = null,
      backDepthTexture = null,
      peelingMode = 'init',
      color = 0xffffff,
      opacity = 1.0
    } = parameters

    super({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.common,
        THREE.UniformsLib.lights,
        {
          frontDepthTexture: { value: frontDepthTexture },
          backDepthTexture: { value: backDepthTexture },
          peelingMode: { value: peelingMode === 'init' ? 0 : peelingMode === 'front' ? 1 : 2 },
          diffuse: { value: new THREE.Color(color) },
          opacity: { value: opacity },
          cameraNear: { value: 0.1 },
          cameraFar: { value: 1000 }
        }
      ]),

      vertexShader: `
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        varying vec4 vWorldPosition;
        
        #include <common>
        #include <uv_pars_vertex>
        #include <color_pars_vertex>
        #include <morphtarget_pars_vertex>
        #include <skinning_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        
        void main() {
          #include <uv_vertex>
          #include <color_vertex>
          #include <morphcolor_vertex>
          #include <beginnormal_vertex>
          #include <morphnormal_vertex>
          #include <skinbase_vertex>
          #include <skinnormal_vertex>
          #include <defaultnormal_vertex>
          
          vNormal = normalize(transformedNormal);
          
          #include <begin_vertex>
          #include <morphtarget_vertex>
          #include <skinning_vertex>
          #include <project_vertex>
          #include <logdepthbuf_vertex>
          
          vViewPosition = -mvPosition.xyz;
          vWorldPosition = modelMatrix * vec4(position, 1.0);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,

      fragmentShader: `
        uniform vec3 diffuse;
        uniform float opacity;
        uniform sampler2D frontDepthTexture;
        uniform sampler2D backDepthTexture;
        uniform int peelingMode;
        uniform float cameraNear;
        uniform float cameraFar;
        
        varying vec3 vViewPosition;
        varying vec3 vNormal;
        varying vec4 vWorldPosition;
        
        #include <common>
        #include <packing>
        #include <uv_pars_fragment>
        #include <color_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <lights_pars_begin>
        #include <lights_physical_pars_fragment>
        
        // Convert depth buffer value to linear depth
        float getLinearDepth(float depth) {
          float z = depth * 2.0 - 1.0; // Back to NDC
          return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
        }
        
        void main() {
          vec2 screenUV = gl_FragCoord.xy / vec2(textureSize(frontDepthTexture, 0));
          float currentDepth = gl_FragCoord.z;
          
          // Depth peeling logic
          if (peelingMode == 1) {
            // Front peeling: discard if depth <= previous front depth
            float prevFrontDepth = texture2D(frontDepthTexture, screenUV).r;
            if (currentDepth <= prevFrontDepth + 0.0001) {
              discard;
            }
          } else if (peelingMode == 2) {
            // Back peeling: discard if depth >= previous back depth
            float prevBackDepth = texture2D(backDepthTexture, screenUV).r;
            if (currentDepth >= prevBackDepth - 0.0001) {
              discard;
            }
          }
          // peelingMode == 0 (init): render front-most fragments (no discard)
          
          #include <logdepthbuf_fragment>
          
          // Simple Lambertian shading
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          // Ambient + diffuse lighting
          vec3 lightColor = vec3(1.0);
          float diffuseStrength = max(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0) * 0.6 + 0.4;
          
          vec4 diffuseColor = vec4(diffuse, opacity);
          
          #ifdef USE_COLOR
            diffuseColor.rgb *= vColor;
          #endif
          
          vec3 finalColor = diffuseColor.rgb * lightColor * diffuseStrength;
          
          gl_FragColor = vec4(finalColor, diffuseColor.a);
        }
      `,

      lights: true,
      transparent: true,
      depthWrite: false,
      depthTest: true
    })
  }

  // Getters/setters for uniforms with safety checks
  get frontDepthTexture(): THREE.Texture | null {
    return this.uniforms?.frontDepthTexture?.value ?? null
  }

  set frontDepthTexture(value: THREE.Texture | null) {
    if (this.uniforms?.frontDepthTexture) {
      this.uniforms.frontDepthTexture.value = value
    }
  }

  get backDepthTexture(): THREE.Texture | null {
    return this.uniforms?.backDepthTexture?.value ?? null
  }

  set backDepthTexture(value: THREE.Texture | null) {
    if (this.uniforms?.backDepthTexture) {
      this.uniforms.backDepthTexture.value = value
    }
  }

  get peelingMode(): 'init' | 'front' | 'back' {
    const mode = this.uniforms?.peelingMode?.value ?? 0
    return mode === 0 ? 'init' : mode === 1 ? 'front' : 'back'
  }

  set peelingMode(value: 'init' | 'front' | 'back') {
    if (this.uniforms?.peelingMode) {
      this.uniforms.peelingMode.value = value === 'init' ? 0 : value === 'front' ? 1 : 2
    }
  }

  get color(): THREE.Color {
    return this.uniforms?.diffuse?.value ?? new THREE.Color(0xffffff)
  }

  set color(value: THREE.Color | string | number) {
    if (this.uniforms?.diffuse) {
      if (value instanceof THREE.Color) {
        this.uniforms.diffuse.value = value
      } else {
        this.uniforms.diffuse.value = new THREE.Color(value)
      }
    }
  }

  get opacity(): number {
    return this.uniforms?.opacity?.value ?? 1.0
  }

  set opacity(value: number) {
    if (this.uniforms?.opacity) {
      this.uniforms.opacity.value = value
    }
  }

  updateCamera(camera: THREE.Camera): void {
    if (camera instanceof THREE.PerspectiveCamera && this.uniforms) {
      this.uniforms.cameraNear.value = camera.near
      this.uniforms.cameraFar.value = camera.far
    }
  }
}
