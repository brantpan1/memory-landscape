import * as THREE from 'three'
import { MappedLocation, FeatureBundle } from './featureMapping'

export class SphereEngine {
  private baseRadius = 30

  constructor() {}

  // convert flat pos to spherical coordinates
  posToSpherical(pos: { x: number; z: number }): {
    theta: number
    phi: number
  } {
    const theta = ((pos.x + 160) / 320) * Math.PI * 2
    const phi = 0.2 * Math.PI + ((pos.z + 120) / 240) * Math.PI * 0.6
    return { theta, phi }
  }

  sphericalToCartesian(theta: number, phi: number, r: number): THREE.Vector3 {
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    )
  }

  // get position on sphere surface for a data point
  getLocationPosition(m: MappedLocation): THREE.Vector3 {
    const { theta, phi } = this.posToSpherical(m.pos)
    return this.sphericalToCartesian(theta, phi, this.baseRadius)
  }

  // generate smooth sphere with subtle color variation
  generate(features: FeatureBundle): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.baseRadius, 128, 96)
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const colors: number[] = []

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)

      const r = Math.sqrt(x * x + y * y + z * z)
      const theta = Math.atan2(z, x)
      const phi = Math.acos(THREE.MathUtils.clamp(y / r, -1, 1))

      // base color from chroma shift
      const thetaNorm = (theta / (Math.PI * 2) + 1) % 1
      const baseColor = features.global.chromaShift(thetaNorm)
      const c = new THREE.Color().copy(baseColor)

      // subtle latitude-based variation
      const latFactor = Math.abs(phi - Math.PI / 2) / (Math.PI / 2)
      c.offsetHSL(0, -0.1 * latFactor, 0.05 - 0.1 * latFactor)

      colors.push(c.r, c.g, c.b)
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    })

    const mesh = new THREE.Mesh(geometry, material)
    return mesh
  }

  getBaseRadius(): number {
    return this.baseRadius
  }
}
