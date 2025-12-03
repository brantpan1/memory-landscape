import * as THREE from 'three'
import type { FeatureBundle, MappedLocation } from './featureMapping'

/**
 * Point-based "data planet":
 * - Global silhouette deformed by nearby memories
 * - Local topography from fractal noise + memory fields
 * - Micro jitter over time for a living, TouchDesigner-ish feel
 */
export class PointCloudSphere {
  private baseRadius = 80
  private pointCount = 45000

  constructor() {}

  getBaseRadius(): number {
    return this.baseRadius
  }

  /**
   * Map from your existing world-space pos (x from languageBalance, z from time spiral)
   * into a spherical coordinate. This keeps your layout semantics but wraps them
   * into a 3D body.
   */
  posToSpherical(pos: { x: number; z: number }): {
    theta: number
    phi: number
  } {
    // x: [-120, 120] → full 360°
    const theta = ((pos.x + 120) / 240) * Math.PI * 2

    // z: we assume approx [-120,120], compress to band to avoid poles
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

  // cheap hash noise in [0, 1)
  private noise3(x: number, y: number, z: number): number {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719)
    return s - Math.floor(s)
  }

  // fractal brownian motion for smooth but complex noise
  private fbm(x: number, y: number, z: number): number {
    let value = 0
    let amp = 0.5
    let freq = 1.0
    for (let i = 0; i < 5; i++) {
      value += this.noise3(x * freq, y * freq, z * freq) * amp
      freq *= 2.3
      amp *= 0.54
    }
    return value
  }

  private precomputeSphericalFeatures(features: FeatureBundle): Array<{
    mapped: MappedLocation
    theta: number
    phi: number
    weight: number
    sign: number
  }> {
    return features.mapped.map((m) => {
      const { theta, phi } = this.posToSpherical(m.pos)
      const amp = m.amplitude ?? 12
      const sig = (m as any).significance ?? 0.5
      const ridge = m.ridgeFactor ?? 0
      const rough = m.roughness ?? 0.5
      const bias = m.elevationBias ?? 0

      // compute a "mass" of this memory for topography
      const weight =
        amp * 0.5 + sig * 16 + Math.abs(ridge) * 10 + rough * 8 + 12

      const sign = Math.sign(bias || (m as any).valence || 0) || 1

      return {
        mapped: m,
        theta,
        phi,
        weight,
        sign,
      }
    })
  }

  generate(features: FeatureBundle): THREE.Points {
    const positions: number[] = []
    const colors: number[] = []
    const sizes: number[] = []

    const sphericalFeatures = this.precomputeSphericalFeatures(features)

    // small helper to get silhouette deformation from nearby memories
    const sampleSilhouetteField = (theta: number, phi: number) => {
      let field = 0
      let signedField = 0
      let totalW = 0

      for (const sf of sphericalFeatures) {
        // angular distance on sphere (approx)
        let dTheta = Math.abs(theta - sf.theta)
        let dPhi = Math.abs(phi - sf.phi)

        // wrap theta (0/2π)
        if (dTheta > Math.PI) dTheta = 2 * Math.PI - dTheta

        const angDist = Math.sqrt(dTheta * dTheta + dPhi * dPhi)
        const influenceRadius = 0.9 // radians

        if (angDist < influenceRadius) {
          const t = 1 - angDist / influenceRadius
          const falloff = t * t * t
          field += sf.weight * falloff
          signedField += sf.weight * sf.sign * falloff
          totalW += sf.weight
        }
      }

      if (totalW <= 0) return { field: 0, signed: 0 }

      // normalize and clamp
      const f = THREE.MathUtils.clamp(field / (totalW * 0.45), 0, 2.0)
      const s = THREE.MathUtils.clamp(signedField / (totalW * 0.45), -2.0, 2.0)
      return { field: f, signed: s }
    }

    // base point cloud: distributed over a sphere, but with strong
    // silhouette modulation from your memory field
    for (let i = 0; i < this.pointCount; i++) {
      // Fibonacci sphere param
      const y = 1 - (2 * (i + 0.5)) / this.pointCount
      const r = Math.sqrt(1 - y * y)
      const theta = Math.PI * (3 - Math.sqrt(5)) * i
      const phi = Math.acos(y)

      const { field, signed } = sampleSilhouetteField(theta, phi)

      // macro noise for tectonic feel
      const nMacro = this.fbm(theta * 0.18, phi * 0.24, 4.7) - 0.5
      const nDetail = this.fbm(theta * 1.7, phi * 1.3, 19.1) - 0.5

      // silhouette radius:
      // - base radius
      // - bulge from field (mass of nearby memories)
      // - signed pushes outward/inward based on valence/bias
      // - macro noise
      const silhouetteBump =
        field * 26.0 + signed * 12.0 + nMacro * 12.0 + nDetail * 4.0
      const radius = this.baseRadius + silhouetteBump

      const x = radius * r * Math.cos(theta)
      const yy = radius * y
      const z = radius * r * Math.sin(theta)
      positions.push(x, yy, z)

      // Color mapping:
      // - base gradient from global chromaShift (xNorm)
      // - luminance from altitude
      const angleNorm = (((theta / (Math.PI * 2)) % 1) + 1) % 1
      const baseColor = features.global.chromaShift
        ? features.global.chromaShift(angleNorm)
        : new THREE.Color(0.55, 0.45, 0.6)

      const heightNorm = THREE.MathUtils.clamp(
        (radius - this.baseRadius) / 35.0,
        -1,
        1,
      )
      const c = new THREE.Color().copy(baseColor)

      // brighten crests, darken chasms
      const lumOffset = heightNorm * 0.3
      c.offsetHSL(0, 0, lumOffset)

      colors.push(c.r, c.g, c.b)

      // smaller base points
      sizes.push(0.35 + Math.random() * 0.45)
    }

    // cluster layer: dense halos around each memory (cards anchor here)
    sphericalFeatures.forEach((sf, idx) => {
      const m = sf.mapped as any
      const amp = m.amplitude ?? 14
      const sig = m.significance ?? 0.6
      const ridge = Math.abs(m.ridgeFactor ?? 0.0)

      const clusterCount = 800 + Math.floor(amp * 30 + sig * 200 + ridge * 150)

      for (let i = 0; i < clusterCount; i++) {
        // jitter around memory angle
        const jitterTheta = sf.theta + (Math.random() - 0.5) * 0.4
        const jitterPhi = sf.phi + (Math.random() - 0.5) * 0.35

        const { field, signed } = sampleSilhouetteField(jitterTheta, jitterPhi)
        const localNoise =
          this.fbm(jitterTheta * 2.4, jitterPhi * 2.7, idx * 3.17 + i * 0.013) -
          0.5

        const bump =
          field * 20.0 + signed * 9.0 + localNoise * 8.0 + (sig - 0.5) * 12.0
        const radius = this.baseRadius + 6 + bump

        const x = radius * Math.sin(jitterPhi) * Math.cos(jitterTheta)
        const y = radius * Math.cos(jitterPhi)
        const z = radius * Math.sin(jitterPhi) * Math.sin(jitterTheta)
        positions.push(x, y, z)

        const base = new THREE.Color(m.baseColor ?? 0xffffff)
        const highlight = new THREE.Color(1.1, 0.95, 1.1)
        const t = 0.35 + sig * 0.45 + Math.random() * 0.2
        const c = new THREE.Color().lerpColors(base, highlight, t)
        colors.push(c.r, c.g, c.b)

        // bigger, brighter
        const sizeBoost = sig * 1.6 + amp * 0.02
        sizes.push(0.5 + Math.random() * 1.6 + sizeBoost)
      }
    })

    const geometry = new THREE.BufferGeometry()
    const positionAttr = new THREE.Float32BufferAttribute(positions, 3)
    geometry.setAttribute('position', positionAttr)
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    // keep base positions for jitter animation
    ;(geometry as any).userData = (geometry as any).userData || {}
    ;(geometry as any).userData.basePositions = new Float32Array(
      positionAttr.array as Float32Array,
    )

    const material = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    return new THREE.Points(geometry, material)
  }

  /**
   * Used by card system to place cards on/near surface.
   * We use the same spherical mapping as above but keep radius closer
   * to the "average" surface to avoid cards sinking into pits.
   */
  getSurfacePosition(pos: { x: number; z: number }): THREE.Vector3 {
    const { theta, phi } = this.posToSpherical(pos)
    const r = this.baseRadius + 12 // slightly above mid-height
    return this.sphericalToCartesian(theta, phi, r)
  }

  /**
   * Micro jitter to make the planet feel alive.
   * Call from render loop: sphere.update(pointCloud, time)
   */
  update(pointCloud: THREE.Points, time: number) {
    const geometry = pointCloud.geometry as THREE.BufferGeometry
    const attr = geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute | null
    if (!attr) return

    const userData = (geometry as any).userData || {}
    const basePositions = userData.basePositions as Float32Array | undefined
    if (!basePositions) return

    const arr = attr.array as Float32Array
    const t = time * 0.4
    const jitter = 0.5

    for (let i = 0; i < arr.length / 3; i++) {
      const bx = basePositions[i * 3]
      const by = basePositions[i * 3 + 1]
      const bz = basePositions[i * 3 + 2]

      const n1 = this.noise3(bx * 0.02 + t, by * 0.015, bz * 0.01)
      const n2 = this.noise3(bx * 0.01, by * 0.02 + t * 1.2, bz * 0.015)

      const jx = (n1 - 0.5) * jitter
      const jy = (n2 - 0.5) * jitter * 0.8
      const jz = (n1 + n2 - 1.0) * jitter * 0.7

      arr[i * 3] = bx + jx
      arr[i * 3 + 1] = by + jy
      arr[i * 3 + 2] = bz + jz
    }

    attr.needsUpdate = true
  }
}
