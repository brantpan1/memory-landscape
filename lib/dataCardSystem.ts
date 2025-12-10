import * as THREE from 'three'
import { MappedLocation, FeatureBundle } from './featureMapping'
import { PointCloudSphere } from './pointCloudSphere'

type MemoryType = 'receipt' | 'photo' | 'letter' | 'document'

interface LocationMeta {
  id: string
  name: string
  nameCn?: string
  period?: { start: string; end?: string }
  year?: number
  memories?: Array<Memory>
}

interface Memory {
  type: MemoryType
  content: string
  date?: string
  sentiment?: number
  language?: 'en' | 'zh' | 'mixed'
}

interface CardMaterialRef {
  mat: THREE.Material & { opacity?: number }
  baseOpacity: number
}

interface DataCard {
  mapped: MappedLocation
  surfacePos: THREE.Vector3
  cardPos: THREE.Vector3
  cardMesh: THREE.Group
  wire: THREE.Line
  anchorDot: THREE.Mesh
  activation: number
  targetActivation: number
  floatPhase: number
  tiltX: number
  tiltY: number
  materials: CardMaterialRef[]
  flatSurfacePos: THREE.Vector3
  sphereSurfacePos: THREE.Vector3
  baseOffset: THREE.Vector3
}

interface ConnectionWire {
  from: DataCard
  to: DataCard
  line: THREE.Line
}

export class DataCardSystem {
  private cards: DataCard[] = []
  private wires: ConnectionWire[] = []
  private cardGroup: THREE.Group
  private wireGroup: THREE.Group
  private interCardWireGroup: THREE.Group
  private features: FeatureBundle
  private activationRadius = 55

  constructor(
    features: FeatureBundle,
    sphere: PointCloudSphere,
    locationData: LocationMeta[],
  ) {
    this.features = features
    this.cardGroup = new THREE.Group()
    this.wireGroup = new THREE.Group()
    this.interCardWireGroup = new THREE.Group()

    features.mapped.forEach((m) => {
      const meta = this.resolveMetaForMapped(m, locationData)
      if (!meta) return
      const { loc, memory, memoryIndex } = meta

      // --- sphere + flat anchors for morph ---
      const sphereSurfacePos = sphere.getSurfacePosition(m.pos)
      const flatSurfacePos = new THREE.Vector3(m.pos.x, 0, m.pos.z)

      const isMemory = !!m.parentLocationId

      // outward from the sphere surface (for nice ring orientation)
      const outward = sphereSurfacePos.clone().normalize()

      // tangent frame around the sphere
      let tangent1 = new THREE.Vector3(0, 1, 0).cross(outward)
      if (tangent1.lengthSq() < 1e-4) {
        tangent1 = new THREE.Vector3(1, 0, 0).cross(outward)
      }
      tangent1.normalize()
      const tangent2 = outward.clone().cross(tangent1).normalize()

      // we'll first build the position in "sphere mode"
      const cardPosSphere = new THREE.Vector3()

      if (!isMemory) {
        // ---- LOCATION HUB CARD ----
        const baseDistance = 28 + Math.random() * 14
        cardPosSphere
          .copy(sphereSurfacePos)
          .add(outward.clone().multiplyScalar(baseDistance))

        const spread = 10
        cardPosSphere.add(
          tangent1.clone().multiplyScalar((Math.random() - 0.5) * spread),
        )
        cardPosSphere.add(
          tangent2.clone().multiplyScalar((Math.random() - 0.5) * spread),
        )
      } else {
        // ---- MEMORY CARD (ring/spiral around location) ----
        const idx = m.memoryIndex ?? memoryIndex ?? 0
        const count = m.memoryCount ?? loc.memories?.length ?? 1

        const ringBase = 26 // base distance outward in tangent plane
        const radialStep = 4
        const ringRadius = ringBase + radialStep * idx

        const angle =
          (idx / Math.max(1, count)) * Math.PI * 2 +
          count * 0.15 +
          (loc.name.length % 7) * 0.08

        const ringOffset = tangent1
          .clone()
          .multiplyScalar(Math.cos(angle) * ringRadius)
          .add(tangent2.clone().multiplyScalar(Math.sin(angle) * ringRadius))

        cardPosSphere.copy(sphereSurfacePos)
        // step off surface a bit, then into ring
        cardPosSphere.add(outward.clone().multiplyScalar(18))
        cardPosSphere.add(ringOffset)

        const ampLayer = (m.amplitude ?? 0) * 0.6
        cardPosSphere.add(outward.clone().multiplyScalar(ampLayer))
      }

      // create card mesh (visual)
      const cardMesh =
        memory && m.parentLocationId
          ? this.createMemoryCardMesh(loc, memory, m, memoryIndex)
          : this.createLocationCardMesh(loc, m)

      // base offset is defined in sphere space
      const baseOffset = cardPosSphere.clone().sub(sphereSurfacePos)

      // initial state = flat mode (t = 0)
      const surfacePos = flatSurfacePos.clone()
      const cardPos = flatSurfacePos.clone().add(baseOffset)

      cardMesh.position.copy(cardPos)

      const tiltX = (Math.random() - 0.5) * 0.4
      const tiltY = (Math.random() - 0.5) * 0.4
      cardMesh.rotation.x = tiltX
      cardMesh.rotation.y = tiltY

      this.cardGroup.add(cardMesh)

      // wire from surface anchor → card
      const wireGeo = new THREE.BufferGeometry()
      const wirePositions = new Float32Array(6)
      wireGeo.setAttribute(
        'position',
        new THREE.BufferAttribute(wirePositions, 3),
      )

      const wireMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
      })
      ;(wireMat as any).userData = { baseOpacity: 0.3 }
      const wire = new THREE.Line(wireGeo, wireMat)
      this.wireGroup.add(wire)

      // anchor dot at surface
      const anchorGeo = new THREE.SphereGeometry(
        m.parentLocationId ? 0.6 : 0.9,
        10,
        10,
      )
      const anchorMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
      })
      ;(anchorMat as any).userData = { baseOpacity: 0.85 }
      const anchorDot = new THREE.Mesh(anchorGeo, anchorMat)
      anchorDot.position.copy(surfacePos)
      this.wireGroup.add(anchorDot)

      const materials = this.collectMaterials(cardMesh)

      this.cards.push({
        mapped: m,
        surfacePos,
        cardPos,
        cardMesh,
        wire,
        anchorDot,
        activation: 0,
        targetActivation: 0,
        floatPhase: Math.random() * Math.PI * 2,
        tiltX,
        tiltY,
        materials,
        flatSurfacePos,
        sphereSurfacePos,
        baseOffset,
      })
    })

    // connections between hubs only
    features.mappedConnections.forEach((c) => {
      const fromCard = this.cards.find((card) => card.mapped.id === c.from.id)
      const toCard = this.cards.find((card) => card.mapped.id === c.to.id)
      if (!fromCard || !toCard) return

      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(6)
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const mat = new THREE.LineBasicMaterial({
        color: c.color,
        transparent: true,
        opacity: 0,
      })
      ;(mat as any).userData = { baseOpacity: 0 }
      const line = new THREE.Line(geo, mat)
      this.interCardWireGroup.add(line)

      this.wires.push({ from: fromCard, to: toCard, line })
    })
  }

  private collectMaterials(group: THREE.Group): CardMaterialRef[] {
    const mats: CardMaterialRef[] = []
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      const mat = mesh.material as THREE.Material & { opacity?: number }
      if (!mat || mat.opacity === undefined) return
      const baseOpacity = (mat as any).userData?.baseOpacity ?? mat.opacity ?? 1
      mats.push({ mat, baseOpacity })
    })
    return mats
  }

  private resolveMetaForMapped(
    m: MappedLocation,
    locationData: LocationMeta[],
  ): {
    loc: LocationMeta
    memory: Memory | null
    memoryIndex: number
  } | null {
    if (m.parentLocationId) {
      const parent = locationData.find((l) => l.id === m.parentLocationId)
      if (!parent) return null
      const mems = parent.memories ?? []
      const match = m.id.match(/::mem-(\d+)/)
      const idx = match ? parseInt(match[1], 10) : 0
      const mem = mems[idx]
      if (!mem) return { loc: parent, memory: null, memoryIndex: idx }
      return { loc: parent, memory: mem, memoryIndex: idx }
    }

    const loc = locationData.find((l) => l.id === m.id)
    if (!loc) return null
    return { loc, memory: null, memoryIndex: -1 }
  }
  // --------- card creation: location hub ---------

  private createLocationCardMesh(
    loc: LocationMeta,
    m: MappedLocation,
  ): THREE.Group {
    const group = new THREE.Group()

    const width = 18
    const height = width * 0.7

    const bgGeo = new THREE.PlaneGeometry(width, height)
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x0b0b10,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
    ;(bgMat as any).userData = { baseOpacity: 0.9 }
    const bg = new THREE.Mesh(bgGeo, bgMat)
    group.add(bg)

    // border
    const borderPoints = [
      new THREE.Vector3(-width / 2, -height / 2, 0.01),
      new THREE.Vector3(width / 2, -height / 2, 0.01),
      new THREE.Vector3(width / 2, height / 2, 0.01),
      new THREE.Vector3(-width / 2, height / 2, 0.01),
      new THREE.Vector3(-width / 2, -height / 2, 0.01),
    ]
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints)
    const borderMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
    })
    ;(borderMat as any).userData = { baseOpacity: 0.45 }
    const border = new THREE.Line(borderGeo, borderMat)
    group.add(border)

    // text canvas
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 340
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#030308'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 40px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(loc.name.toUpperCase(), 24, 60)

      if (loc.nameCn) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.font = '30px sans-serif'
        ctx.fillText(loc.nameCn, 24, 100)
      }

      const period = loc.period
        ? `${loc.period.start.slice(0, 4)}–${loc.period.end ? loc.period.end.slice(0, 4) : 'present'}`
        : loc.year
          ? String(loc.year)
          : ''

      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.font = '18px monospace'
      ctx.fillText(`TIME: ${period}`, 24, 145)

      const totalMems = loc.memories?.length ?? 0
      ctx.fillText(`MEMORY NODES: ${totalMems}`, 24, 170)

      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '16px monospace'
      ctx.fillText(
        `TOPO: A${m.amplitude.toFixed(1)} R${m.roughness.toFixed(2)} E${m.erosion.toFixed(2)}`,
        24,
        200,
      )

      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '14px monospace'
      ctx.fillText('Cluster: receipts · photos · letters · documents', 24, 230)
    }

    const texture = new THREE.CanvasTexture(canvas)
    const textGeo = new THREE.PlaneGeometry(width * 0.9, height * 0.9)
    const textMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 1,
    })
    ;(textMat as any).userData = { baseOpacity: 1 }
    const textMesh = new THREE.Mesh(textGeo, textMat)
    textMesh.position.z = 0.05
    group.add(textMesh)

    // indicator dot
    const dotGeo = new THREE.CircleGeometry(0.45, 18)
    const dotMat = new THREE.MeshBasicMaterial({
      color: m.baseColor,
      transparent: true,
      opacity: 0.95,
    })
    ;(dotMat as any).userData = { baseOpacity: 0.95 }
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(width / 2 - 1.6, height / 2 - 1.6, 0.1)
    group.add(dot)
    ;(group as any).__mapped = m
    return group
  }

  // --------- card creation: memory node (receipt/photo/letter/document) ---------

  private createMemoryCardMesh(
    loc: LocationMeta,
    mem: Memory,
    m: MappedLocation,
    memIndex: number,
  ): THREE.Group {
    const group = new THREE.Group()

    const isReceipt = mem.type === 'receipt'
    const isPhoto = mem.type === 'photo'
    const isLetter = mem.type === 'letter'
    const isDoc = mem.type === 'document'

    const baseWidth = 13
    const width = baseWidth
    let height = baseWidth * 0.75

    if (isReceipt) height *= 1.25
    if (isPhoto) height *= 0.9
    if (isLetter) height *= 1.1

    const bgGeo = new THREE.PlaneGeometry(width, height)

    let bgColor = 0x0b0b10
    if (isReceipt) bgColor = 0xf5f4ee
    else if (isLetter) bgColor = 0xfdfaf2
    else if (isDoc) bgColor = 0x111118

    const bgOpacity = isReceipt || isLetter ? 0.94 : 0.9

    const bgMat = new THREE.MeshBasicMaterial({
      color: bgColor,
      transparent: true,
      opacity: bgOpacity,
      side: THREE.DoubleSide,
    })
    ;(bgMat as any).userData = { baseOpacity: bgOpacity }
    const bg = new THREE.Mesh(bgGeo, bgMat)
    group.add(bg)

    // border / accent
    const borderPoints = [
      new THREE.Vector3(-width / 2, -height / 2, 0.01),
      new THREE.Vector3(width / 2, -height / 2, 0.01),
      new THREE.Vector3(width / 2, height / 2, 0.01),
      new THREE.Vector3(-width / 2, height / 2, 0.01),
      new THREE.Vector3(-width / 2, -height / 2, 0.01),
    ]
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints)
    const borderMat = new THREE.LineBasicMaterial({
      color: isReceipt || isLetter ? 0x111111 : 0xffffff,
      transparent: true,
      opacity: isReceipt || isLetter ? 0.45 : 0.5,
    })
    ;(borderMat as any).userData = {
      baseOpacity: isReceipt || isLetter ? 0.45 : 0.5,
    }
    const border = new THREE.Line(borderGeo, borderMat)
    group.add(border)

    // text canvas
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 384
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (isReceipt) {
        this.drawReceiptMemory(ctx, loc, mem, m, memIndex)
      } else if (isPhoto) {
        this.drawPhotoMemory(ctx, loc, mem, m, memIndex)
      } else if (isLetter) {
        this.drawLetterMemory(ctx, loc, mem, m, memIndex)
      } else {
        this.drawDocumentMemory(ctx, loc, mem, m, memIndex)
      }
    }

    const texture = new THREE.CanvasTexture(canvas)
    const textGeo = new THREE.PlaneGeometry(width * 0.93, height * 0.93)
    const textMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      opacity: 1,
    })
    ;(textMat as any).userData = { baseOpacity: 1 }
    const textMesh = new THREE.Mesh(textGeo, textMat)
    textMesh.position.z = 0.05
    group.add(textMesh)

    // small status dot keyed by location/city
    const dotGeo = new THREE.CircleGeometry(0.32, 16)
    const dotMat = new THREE.MeshBasicMaterial({
      color: m.baseColor,
      transparent: true,
      opacity: 0.95,
    })
    ;(dotMat as any).userData = { baseOpacity: 0.95 }
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(width / 2 - 1.2, height / 2 - 1.2, 0.1)
    group.add(dot)
    ;(group as any).__mapped = m
    return group
  }

  // ---- canvas drawing helpers for memory styles ----

  private drawReceiptMemory(
    ctx: CanvasRenderingContext2D,
    loc: LocationMeta,
    mem: Memory,
    m: MappedLocation,
    memIndex: number,
  ) {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#f7f6f2'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#e3e2da'
    for (let y = 80; y < height - 40; y += 28) {
      ctx.fillRect(0, y, width, 1)
    }

    ctx.fillStyle = '#111111'
    ctx.font = 'bold 32px monospace'
    ctx.fillText(loc.name.toUpperCase(), 30, 48)

    ctx.fillStyle = '#555555'
    ctx.font = '20px monospace'
    const shortCity = loc.name.split(' ')[0].toUpperCase()
    ctx.fillText(`${shortCity} MEMORY RECEIPT`, 30, 78)

    const date = mem.date ?? '—'
    ctx.fillStyle = '#777777'
    ctx.font = '18px monospace'
    ctx.fillText(`DATE     ${date}`, 30, 115)
    ctx.fillText(`ITEM     #${memIndex + 1}`, 30, 140)

    const lines = this.wrapText(ctx, mem.content, 470)
    let y = 175
    ctx.fillStyle = '#333333'
    ctx.font = '17px monospace'
    for (const line of lines.slice(0, 4)) {
      ctx.fillText(line, 30, y)
      y += 22
    }

    ctx.fillStyle = '#999999'
    ctx.font = '14px monospace'
    ctx.fillText(
      `NODE AMP ${m.amplitude.toFixed(1)}  ROUGH ${m.roughness.toFixed(2)}`,
      30,
      height - 56,
    )

    const barY = height - 40
    for (let x = 40; x < width - 40; x += 7) {
      const barH = 28 + ((x * 17.13) % 18)
      ctx.fillRect(x, barY - barH, 3, barH)
    }
  }

  private drawPhotoMemory(
    ctx: CanvasRenderingContext2D,
    loc: LocationMeta,
    mem: Memory,
    m: MappedLocation,
    memIndex: number,
  ) {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#05060a'
    ctx.fillRect(0, 0, width, height)

    const grad = ctx.createLinearGradient(60, 40, width - 60, 240)
    grad.addColorStop(0, '#5b54ff')
    grad.addColorStop(0.5, '#ff6a8c')
    grad.addColorStop(1, '#ffd46b')
    ctx.fillStyle = grad
    ctx.fillRect(60, 40, width - 120, 200)

    ctx.fillStyle = '#ffffff'
    ctx.font = '22px sans-serif'
    ctx.fillText(loc.name, 60, 270)

    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = '16px monospace'
    ctx.fillText(`PHOTO MEMORY #${memIndex + 1}`, 60, 295)

    const date = mem.date ?? '—'
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(date, 60, 320)

    const lines = this.wrapText(ctx, mem.content, 420)
    let y = 345
    ctx.font = '14px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (const line of lines.slice(0, 3)) {
      ctx.fillText(line, 60, y)
      y += 18
    }
  }

  private drawLetterMemory(
    ctx: CanvasRenderingContext2D,
    loc: LocationMeta,
    mem: Memory,
    m: MappedLocation,
    memIndex: number,
  ) {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#fdf7ea'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#e0d4c0'
    for (let y = 70; y < height - 40; y += 24) {
      ctx.beginPath()
      ctx.moveTo(20, y)
      ctx.lineTo(width - 20, y)
      ctx.stroke()
    }

    ctx.fillStyle = '#b34c4c'
    ctx.font = '24px serif'
    ctx.fillText('LETTER MEMORY', 30, 50)

    ctx.fillStyle = '#444444'
    ctx.font = '18px serif'
    ctx.fillText(loc.name, 30, 80)

    const date = mem.date ?? '—'
    ctx.fillStyle = '#777777'
    ctx.font = '14px monospace'
    ctx.fillText(date, width - 160, 50)

    ctx.fillStyle = '#333333'
    ctx.font = '16px serif'
    const lines = this.wrapText(ctx, mem.content, 460)
    let y = 110
    for (const line of lines.slice(0, 5)) {
      ctx.fillText(line, 30, y)
      y += 22
    }
  }

  private drawDocumentMemory(
    ctx: CanvasRenderingContext2D,
    loc: LocationMeta,
    mem: Memory,
    m: MappedLocation,
    memIndex: number,
  ) {
    const { width, height } = ctx.canvas
    ctx.fillStyle = '#050509'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(40, 50, width - 80, height - 100)

    ctx.fillStyle = '#111111'
    ctx.font = '20px monospace'
    ctx.fillText('DOC MEMORY', 55, 80)

    ctx.font = '16px monospace'
    ctx.fillText(loc.name.toUpperCase(), 55, 105)

    const date = mem.date ?? '—'
    ctx.fillStyle = '#555555'
    ctx.fillText(date, 55, 130)

    ctx.fillStyle = '#222222'
    ctx.font = '14px monospace'
    const lines = this.wrapText(ctx, mem.content, width - 120)
    let y = 160
    for (const line of lines.slice(0, 6)) {
      ctx.fillText(line, 55, y)
      y += 20
    }

    ctx.fillStyle = '#bbbbbb'
    ctx.font = '12px monospace'
    ctx.fillText(
      `NODE: A${m.amplitude.toFixed(1)} R${m.roughness.toFixed(2)}`,
      55,
      height - 55,
    )
  }

  // simple text wrapper
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''

    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (ctx.measureText(test).width > maxWidth) {
        if (line) lines.push(line)
        line = w
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  }

  // --------- interactions ---------

  updateMousePosition(worldPosition: THREE.Vector3 | null) {
    this.cards.forEach((card) => {
      if (worldPosition) {
        const distToCard = card.cardPos.distanceTo(worldPosition)
        const distToSurface = card.surfacePos.distanceTo(worldPosition)
        const minDist = Math.min(distToCard, distToSurface)
        const t = Math.max(0, 1 - minDist / this.activationRadius)
        card.targetActivation = t * t
      } else {
        card.targetActivation = 0
      }
    })
  }
  setMorphT(t: number) {
    const clamped = Math.max(0, Math.min(1, t))
    this.cards.forEach((card) => {
      // interpolate surface position
      card.surfacePos.lerpVectors(
        card.flatSurfacePos,
        card.sphereSurfacePos,
        clamped,
      )

      // card base position follows the surface + its original offset
      card.cardPos.copy(card.surfacePos).add(card.baseOffset)

      // keep anchor dot on surface
      card.anchorDot.position.copy(card.surfacePos)
    })
  }

  update(deltaTime: number, time: number) {
    const lerpSpeed = 4

    this.cards.forEach((card) => {
      const prevActivation = card.activation
      card.activation = THREE.MathUtils.lerp(
        card.activation,
        card.targetActivation,
        Math.min(1, deltaTime * lerpSpeed),
      )

      const floatY = Math.sin(time * 0.6 + card.floatPhase) * 1.4
      const floatX = Math.cos(time * 0.4 + card.floatPhase) * 0.9

      card.cardMesh.position.copy(card.cardPos)
      card.cardMesh.position.y += floatY
      card.cardMesh.position.x += floatX

      card.cardMesh.rotation.x =
        card.tiltX + Math.sin(time * 0.5 + card.floatPhase) * 0.05
      card.cardMesh.rotation.y =
        card.tiltY + Math.cos(time * 0.35 + card.floatPhase) * 0.05

      const wirePos = card.wire.geometry.attributes
        .position as THREE.BufferAttribute
      wirePos.setXYZ(0, card.surfacePos.x, card.surfacePos.y, card.surfacePos.z)
      wirePos.setXYZ(
        1,
        card.cardMesh.position.x,
        card.cardMesh.position.y,
        card.cardMesh.position.z,
      )
      wirePos.needsUpdate = true

      const wireMat = card.wire.material as THREE.LineBasicMaterial
      const wireBase = (wireMat as any).userData?.baseOpacity ?? 0.3
      wireMat.opacity = wireBase * (0.6 + card.activation * 0.8)

      const dotScale = 0.75 + card.activation * 0.9
      card.anchorDot.scale.setScalar(dotScale)

      const anchorMat = card.anchorDot.material as THREE.MeshBasicMaterial
      const anchorBase = (anchorMat as any).userData?.baseOpacity ?? 0.85
      anchorMat.opacity = anchorBase * (0.6 + card.activation * 0.6)

      if (Math.abs(card.activation - prevActivation) > 0.001) {
        const factor = 0.85 + card.activation * 0.35
        card.materials.forEach(({ mat, baseOpacity }) => {
          if (mat.opacity === undefined) return
          mat.opacity = baseOpacity * factor
        })
      }
    })

    this.wires.forEach((wire) => {
      const combinedActivation = Math.max(
        wire.from.activation,
        wire.to.activation,
      )

      const pos = wire.line.geometry.attributes
        .position as THREE.BufferAttribute
      pos.setXYZ(
        0,
        wire.from.cardMesh.position.x,
        wire.from.cardMesh.position.y,
        wire.from.cardMesh.position.z,
      )
      pos.setXYZ(
        1,
        wire.to.cardMesh.position.x,
        wire.to.cardMesh.position.y,
        wire.to.cardMesh.position.z,
      )
      pos.needsUpdate = true

      const mat = wire.line.material as THREE.LineBasicMaterial
      const baseOpacity = (mat as any).userData?.baseOpacity ?? 0
      mat.opacity = baseOpacity + combinedActivation * 0.4
    })
  }

  getCardGroup(): THREE.Group {
    return this.cardGroup
  }

  getWireGroup(): THREE.Group {
    return this.wireGroup
  }

  getInterCardWireGroup(): THREE.Group {
    return this.interCardWireGroup
  }

  getCards(): DataCard[] {
    return this.cards
  }
}
