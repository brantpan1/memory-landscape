import * as THREE from 'three'
import { MappedLocation, FeatureBundle } from './featureMapping'

// lightweight "simplexish" value noise
class Simplexish {
  private seed: number
  constructor(seed = 1337) {
    this.seed = seed >>> 0
  }
  private hash(x: number, y: number) {
    let h = (x * 374761393 + y * 668265263) ^ this.seed
    h = (h ^ (h >>> 13)) * 1274126177
    return (h ^ (h >>> 16)) >>> 0
  }
  private rand(x: number, y: number) {
    return (this.hash(Math.floor(x), Math.floor(y)) % 10000) / 10000
  }
  noise(x: number, y: number, f = 1) {
    const xi = Math.floor(x * f),
      yi = Math.floor(y * f)
    const xf = x * f - xi,
      yf = y * f - yi
    const r00 = this.rand(xi, yi)
    const r10 = this.rand(xi + 1, yi)
    const r01 = this.rand(xi, yi + 1)
    const r11 = this.rand(xi + 1, yi + 1)
    const ux = xf * xf * (3 - 2 * xf)
    const uy = yf * yf * (3 - 2 * yf)
    const x1 = r00 * (1 - ux) + r10 * ux
    const x2 = r01 * (1 - ux) + r11 * ux
    return x1 * (1 - uy) + x2 * uy
  }
  fractal(
    x: number,
    y: number,
    octaves: number,
    lacunarity: number,
    gain: number,
    baseFreq: number,
  ) {
    let amp = 1,
      freq = baseFreq,
      sum = 0,
      norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += this.noise(x, y, freq) * amp
      norm += amp
      amp *= gain
      freq *= lacunarity
    }
    return sum / Math.max(norm, 1e-6)
  }
}

export class TerrainEngine {
  private geometry: THREE.PlaneGeometry
  private noise: Simplexish
  private width = 320
  private height = 240
  private segments = 220

  constructor(seed = 42) {
    this.noise = new Simplexish(seed)
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.height,
      this.segments,
      this.segments,
    )
    this.geometry.rotateX(-Math.PI / 2)
  }

  private heightAt(x: number, z: number, f: FeatureBundle) {
    const ex = f.global.exaggeration

    // stronger base relief
    const base = this.noise.fractal(x * 0.018, z * 0.018, 5, 2, 0.48, 1)
    let h = (base - 0.5) * 14 * ex

    // accumulate local influences
    for (const m of f.mapped) {
      const dx = x - m.pos.x
      const dz = z - m.pos.z
      const dist = Math.hypot(dx, dz)
      const R = m.isVisit ? 28 : 46 // visits affect smaller radius
      if (dist < R) {
        const t = 1 - dist / R
        // ridge vs hill mix + stronger amplitude
        const ridge =
          Math.abs(
            this.noise.fractal(x * 0.065, z * 0.065, 3, 2, 0.52, 1) - 0.5,
          ) *
            2 -
          0.5
        const hill = base - 0.5
        const localShape = m.ridgeFactor * ridge + (1 - m.ridgeFactor) * hill

        // sharper falloff for drama
        const fall = Math.pow(t, 2.2)
        h += m.amplitude * localShape * 10 * fall * ex

        // elevation bias → plateaus/massifs
        h += m.elevationBias * 0.6 * fall * ex

        // erosion smooths extremes
        h = THREE.MathUtils.lerp(h, h * 0.7, m.erosion * 0.4)
      }
    }

    // cliffiness: remap steep positive to a slight pow curve
    if (h > 0) h = Math.pow(h, 1.12)
    return h
  }

  private colorAt(x: number, z: number, h: number, f: FeatureBundle) {
    const xNorm = (x + this.width / 2) / this.width
    const base = f.global.chromaShift(xNorm)

    // height tint: more dramatic contrast
    const t = THREE.MathUtils.clamp((h + 30) / 60, 0, 1)
    const c = new THREE.Color().copy(base)
    c.offsetHSL(0, 0, t * 0.22)
    return c
  }

  generate(features: FeatureBundle): THREE.Mesh {
    const pos = this.geometry.attributes.position as THREE.BufferAttribute
    const colors: number[] = []

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = this.heightAt(x, z, features)
      pos.setY(i, h)

      const col = this.colorAt(x, z, h, features)
      colors.push(col.r, col.g, col.b)
    }

    this.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3),
    )
    this.geometry.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: false,
      side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(this.geometry, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }
}
