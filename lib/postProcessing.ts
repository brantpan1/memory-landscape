import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grainIntensity: { value: 0.025 },
    vignetteIntensity: { value: 0.2 },
    aberrationAmount: { value: 0.0015 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grainIntensity;
    uniform float vignetteIntensity;
    uniform float aberrationAmount;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // subtle chromatic aberration
      vec2 center = uv - 0.5;
      float dist = length(center);
      float aberr = aberrationAmount * (1.0 + dist * 2.0);
      vec2 dir = normalize(center + 0.0001);

      vec2 offsetR = uv + dir * aberr;
      vec2 offsetB = uv - dir * aberr;

      float r = texture2D(tDiffuse, offsetR).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, offsetB).b;
      vec3 color = vec3(r, g, b);

      // light film grain
      float grain = rand(uv * 400.0 + time * 0.9);
      color += (grain - 0.5) * grainIntensity;

      // gentle vignette
      float v = 1.0 - dist * vignetteIntensity * 1.4;
      v = clamp(v, 0.0, 1.0);
      v = pow(v, 1.1);
      color *= v;

      // slight contrast curve
      color = pow(color, vec3(0.95));

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

export interface PostProcessingSetup {
  composer: EffectComposer
  bloomPass: UnrealBloomPass
  filmPass: ShaderPass
  update: (time: number) => void
  resize: (width: number, height: number) => void
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostProcessingSetup {
  const size = renderer.getSize(new THREE.Vector2())
  const composer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.25, // 🔽 strength
    0.5, // 🔽 radius
    0.85, // 🔼 threshold (only the really bright stuff blooms)
  )
  composer.addPass(bloomPass)

  const filmPass = new ShaderPass(FilmShader as any)
  composer.addPass(filmPass)

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  return {
    composer,
    bloomPass,
    filmPass,
    update(time: number) {
      filmPass.uniforms.time.value = time
    },
    resize(width: number, height: number) {
      composer.setSize(width, height)
      bloomPass.setSize(width, height)
    },
  }
}
