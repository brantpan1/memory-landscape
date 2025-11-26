import * as THREE from 'three'
import { JourneyData, MemoryLocation, MemoryConnection } from './schema'

export interface MappedLocation {
  id: string
  pos: THREE.Vector3
  baseColor: THREE.Color
  labelOpacity: number
  haloOpacity: number
  labelScale: number
  elevationBias: number
  amplitude: number
  roughness: number
  erosion: number
  ridgeFactor: number
  isVisit?: boolean
}

export interface MappedConnection {
  from: MappedLocation
  to: MappedLocation
  weight: number
  curvatureY: number
  color: THREE.Color
  opacity: number
}

export interface FeatureBundle {
  mapped: MappedLocation[]
  mappedConnections: MappedConnection[]
  global: {
    chromaShift: (xNorm: number) => THREE.Color
    exaggeration: number
  }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const remap = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => outMin + clamp01((v - inMin) / (inMax - inMin)) * (outMax - outMin)

// compute a rough midpoint year from location period/year
function midpointYear(l: MemoryLocation): number {
  if (l.period?.start || l.period?.end) {
    const start = l.period?.start
      ? new Date(l.period.start).getTime()
      : new Date().getTime()
    const end = l.period?.end ? new Date(l.period.end).getTime() : start
    return new Date((start + end) / 2).getUTCFullYear()
  }
  return l.year ?? 0
}

// non-linear, data-driven placement:
// x ← languageBalance (zh→left, en→right), with repulsive jitter
// z ← time spiral based on midpoint year so points arc, not align
// y is computed later by terrain engine
function positionFromData(locs: MemoryLocation[]): Map<string, THREE.Vector3> {
  const xs: number[] = []
  const years = locs.map(midpointYear).filter((y) => y > 0)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)

  // base X from language balance
  const xBase = (lb: number) => remap(lb, -1, 1, -120, 120)

  // time → spiral radius/angle
  const spiral = (y: number) => {
    const t = (y - minYear) / Math.max(1, maxYear - minYear)
    const angle = t * Math.PI * 2.2 // ~ >1 revolution
    const radius = remap(t, 0, 1, 20, 120)
    return { angle, radius }
  }

  // simple repulsion jitter by index to avoid overlaps
  const out = new Map<string, THREE.Vector3>()
  locs.forEach((l, i) => {
    const mid = midpointYear(l) || minYear
    const { angle, radius } = spiral(mid)
    const x = xBase(l.languageBalance) + Math.sin(i * 2.17) * 8
    const z = Math.cos(angle) * radius + Math.cos(i * 1.31) * 6
    out.set(l.id, new THREE.Vector3(x, 0, z))
  })
  return out
}

export function mapJourneyToFeatures(data: JourneyData): FeatureBundle {
  // derive initial positions
  const layout = positionFromData(data.locations)

  // for chroma shift normalization
  const xs = data.locations.map((l) => layout.get(l.id)!.x)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)

  const mapped: MappedLocation[] = data.locations.map((loc) => {
    const baseColor = new THREE.Color(loc.color)

    // stronger, more "dramatic" mapping
    const elevationBias =
      loc.significance * 18 + loc.intensity * 14 + loc.valence * 10
    const amplitude = remap(loc.intensity, 0, 1, 6, 26) // ↑ amplitude band
    const roughness = remap(Math.abs(loc.languageBalance), 0, 1, 0.35, 0.08)
    const erosion = remap(loc.duration ?? 0.2, 0, 3, 0.15, 0.85) // longer → smoother
    const ridgeFactor =
      loc.type === 'origin'
        ? 0.9
        : loc.type === 'visit'
          ? 0.4
          : remap(loc.intensity, 0, 1, 0.3, 0.85)

    const labelOpacity = remap(loc.significance, 0, 1, 0.35, 0.95)
    const haloOpacity = remap(loc.significance, 0, 1, 0.025, 0.1)
    const labelScale = remap(loc.significance, 0, 1, 16, 26)

    const pos = layout.get(loc.id)!.clone()

    return {
      id: loc.id,
      pos,
      baseColor,
      labelOpacity,
      haloOpacity,
      labelScale,
      elevationBias,
      amplitude,
      roughness,
      erosion,
      ridgeFactor,
      isVisit: loc.isVisit,
    }
  })

  // index access
  const byId = new Map<string, MappedLocation>(mapped.map((m) => [m.id, m]))

  const mappedConnections: MappedConnection[] = data.connections
    .map((c) => {
      const from = byId.get(c.from)
      const to = byId.get(c.to)
      if (!from || !to) return null

      const weight = clamp01(c.weight ?? 0.5)
      const yFrom = midpointYear(data.locations.find((l) => l.id === c.from)!)
      const yTo = midpointYear(data.locations.find((l) => l.id === c.to)!)
      const dt = Math.max(1, Math.abs(yTo - yFrom))
      const curvatureY = remap(dt, 1, 10, 3, 16) * (0.6 + weight)

      const color = from.baseColor.clone().lerp(to.baseColor, 0.5)
      const opacity = remap(weight, 0, 1, 0.18, 0.6)

      return { from, to, weight, curvatureY, color, opacity }
    })
    .filter((x): x is MappedConnection => !!x)

  const chromaShift = (xNorm: number) => {
    const c = new THREE.Color()
    c.setRGB(
      remap(1 - xNorm, 0, 1, 0.12, 0.4), // warmer left
      remap(xNorm, 0, 1, 0.08, 0.22),
      remap(xNorm, 0, 1, 0.18, 0.5), // cooler right
    )
    return c
  }

  const exaggeration = 1.35 // global multiplier for "drama"

  return { mapped, mappedConnections, global: { chromaShift, exaggeration } }
}
