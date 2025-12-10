import * as THREE from 'three'
import {
  JourneyData,
  MemoryLocation,
  MemoryConnection,
  MemoryDocument,
} from './schema'

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
  parentLocationId?: string
  memoryType?: MemoryDocument['type']
  memoryIndex?: number
  memoryCount?: number
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

// ----------------- helpers -----------------

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const remap = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => outMin + clamp01((v - inMin) / (inMax - inMin || 1)) * (outMax - outMin)

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

// Base city positions:
// x ← languageBalance; z ← time spiral
function positionFromData(locs: MemoryLocation[]): Map<string, THREE.Vector3> {
  const years = locs.map(midpointYear).filter((y) => y > 0)
  const minYear = years.length ? Math.min(...years) : 2000
  const maxYear = years.length ? Math.max(...years) : 2025
  const yearSpan = Math.max(1, maxYear - minYear)

  const layout = new Map<string, THREE.Vector3>()

  const timeSpiral = (year: number) => {
    const t = (year - minYear) / yearSpan
    const angle = t * Math.PI * 3.5

    // ⬆️ much wider spiral radius so locations separate more on the sphere
    const radius = remap(t, 0, 1, 60, 180)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    return new THREE.Vector3(x, 0, z)
  }

  locs.forEach((loc, idx) => {
    const lang = clamp01((loc.languageBalance + 1) / 2) // -1..+1 → 0..1

    // ⬆️ widen language band so east–west spread is larger
    const xLang = remap(lang, 0, 1, -150, 150)

    const year = midpointYear(loc) || (minYear + maxYear) / 2
    const tPos = timeSpiral(year)

    // lean a bit more on language separation than time spiral x
    const x = xLang * 0.7 + tPos.x * 0.3
    const z = tPos.z

    // ⬆️ slightly larger jitter to keep things visually distinct
    const jitter = 10
    const jx =
      (Math.sin(idx * 12.917) * 0.5 + (loc.isVisit ? 0.25 : 0)) * jitter
    const jz = Math.cos(idx * 9.731) * 0.5 * jitter

    layout.set(loc.id, new THREE.Vector3(x + jx, 0, z + jz))
  })

  return layout
}

function terrainFromLocation(loc: MemoryLocation) {
  const intensity = clamp01(loc.intensity)
  const valence = THREE.MathUtils.clamp(loc.valence, -1, 1)
  const significance = clamp01(loc.significance)
  const durationYears = loc.duration ?? 1

  const elevationBias = significance * 18 + intensity * 14 + valence * 10
  const amplitude = remap(intensity, 0, 1, 6, 22)
  const roughness = remap(durationYears, 0, 18, 0.18, 1.1)
  const erosion = remap(1 - significance, 0, 1, 0.12, 0.9)
  const ridgeFactor = remap(Math.abs(valence), 0, 1, 0.05, 0.95)

  return { elevationBias, amplitude, roughness, erosion, ridgeFactor }
}

function modFromDocument(doc: MemoryDocument | undefined) {
  if (!doc) {
    return {
      ampMul: 0.9,
      roughMul: 1.0,
      ridgeMul: 1.0,
      biasAdd: 0,
      colorTint: new THREE.Color(1, 1, 1),
    }
  }

  const sentiment = doc.sentiment ?? 0
  const lang = doc.language === 'zh' ? -1 : doc.language === 'en' ? 1 : 0

  let ampMul = 1.0
  let roughMul = 1.0
  let ridgeMul = 1.0
  let biasAdd = 0

  switch (doc.type) {
    case 'receipt':
      ampMul = 0.85
      roughMul = 1.2
      biasAdd = sentiment * 3.5
      break
    case 'photo':
      ampMul = 1.25
      ridgeMul = 1.15
      biasAdd = sentiment * 6
      break
    case 'letter':
      ampMul = 1.15
      roughMul = 1.25
      biasAdd = sentiment * 5
      break
    case 'document':
      ampMul = 0.95
      roughMul = 0.85
      ridgeMul = 0.9
      biasAdd = sentiment * 2.5
      break
  }

  const colorTint = new THREE.Color(
    1 + sentiment * 0.22,
    1 + sentiment * 0.12,
    1 + lang * 0.12,
  )

  return { ampMul, roughMul, ridgeMul, biasAdd, colorTint }
}

// ----------------- main mapping -----------------

export function mapJourneyToFeatures(data: JourneyData): FeatureBundle {
  const baseLayout = positionFromData(data.locations)

  const xs = data.locations.map((l) => baseLayout.get(l.id)!.x)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const spanX = maxX - minX || 1

  const mapped: MappedLocation[] = []

  // base city nodes
  data.locations.forEach((loc) => {
    const baseColor = new THREE.Color((loc as any).color ?? '#ffffff')

    // ⬆️ if you want EVEN more separation, you can multiply here:
    // const pos = baseLayout.get(loc.id)!.clone().multiplyScalar(1.8)
    const pos = baseLayout.get(loc.id)!.clone()

    const { elevationBias, amplitude, roughness, erosion, ridgeFactor } =
      terrainFromLocation(loc)

    const labelOpacity = remap(loc.significance, 0, 1, 0.35, 1.0)
    const haloOpacity = remap(loc.intensity, 0, 1, 0.3, 0.95)
    const labelScale = remap(loc.significance, 0, 1, 0.9, 1.6)

    mapped.push({
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
      parentLocationId: undefined,
      memoryType: undefined,
    })

    // orbiting memory nodes (grouped by location)
    const memories = loc.memories ?? []
    if (memories.length === 0) return

    // ring radius around each location hub
    const ringRadius = 8 + loc.intensity * 8

    memories.forEach((doc, idx) => {
      const angle =
        (idx / Math.max(1, memories.length)) * Math.PI * 2 +
        loc.languageBalance * 0.5

      const offsetX = Math.cos(angle) * ringRadius
      const offsetZ = Math.sin(angle) * ringRadius
      const offsetY = (loc.valence || 0) * 2.5 + (doc.sentiment ?? 0) * 3.5

      const childPos = pos
        .clone()
        .add(new THREE.Vector3(offsetX, offsetY, offsetZ))

      const mod = modFromDocument(doc)
      const childBaseColor = baseColor.clone().multiply(mod.colorTint)

      const childElevationBias = elevationBias + mod.biasAdd
      const childAmplitude = amplitude * mod.ampMul
      const childRoughness = THREE.MathUtils.clamp(
        roughness * mod.roughMul,
        0.05,
        1.5,
      )
      const childErosion = erosion
      const childRidge = THREE.MathUtils.clamp(
        ridgeFactor * mod.ridgeMul,
        0.01,
        1.5,
      )

      const childLabelOpacity = labelOpacity * 0.9
      const childHaloOpacity = haloOpacity * 1.05
      const childLabelScale = labelScale * 0.85

      mapped.push({
        id: `${loc.id}::mem-${idx}`,
        pos: childPos,
        baseColor: childBaseColor,
        labelOpacity: childLabelOpacity,
        haloOpacity: childHaloOpacity,
        labelScale: childLabelScale,
        elevationBias: childElevationBias,
        amplitude: childAmplitude,
        roughness: childRoughness,
        erosion: childErosion,
        ridgeFactor: childRidge,
        isVisit: loc.isVisit,
        parentLocationId: loc.id,
        memoryType: doc.type,
        memoryIndex: idx,
        memoryCount: memories.length,
      })
    })
  })

  // connections between cities (base nodes)
  const mappedById = new Map<string, MappedLocation>()
  mapped.forEach((m) => mappedById.set(m.id, m))

  const mappedConnections: MappedConnection[] = []

  data.connections.forEach((conn: MemoryConnection) => {
    const fromBase = mappedById.get(conn.from)
    const toBase = mappedById.get(conn.to)
    if (!fromBase || !toBase) return

    const weight = clamp01(conn.weight ?? 0.7)
    const curvatureY = remap(weight, 0, 1, 10, 30)

    const color = new THREE.Color()
    color.copy(fromBase.baseColor).lerp(toBase.baseColor, 0.5)

    const baseOpacity = remap(weight, 0, 1, 0.25, 0.85)

    mappedConnections.push({
      from: fromBase,
      to: toBase,
      weight,
      curvatureY,
      color,
      opacity: baseOpacity,
    })
  })

  // global chroma shift for the sphere
  const chromaShift = (xNorm: number) => {
    const c = new THREE.Color()
    c.setRGB(
      remap(1 - xNorm, 0, 1, 0.16, 0.45),
      remap(xNorm, 0, 1, 0.07, 0.22),
      remap(xNorm, 0, 1, 0.18, 0.55),
    )
    return c
  }

  const exaggeration = 1.35

  return { mapped, mappedConnections, global: { chromaShift, exaggeration } }
}
