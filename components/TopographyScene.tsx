'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { journeyData } from '@/lib/journeyData'
import { mapJourneyToFeatures, MappedLocation } from '@/lib/featureMapping'
import { PointCloudSphere } from '@/lib/pointCloudSphere'
import { DataCardSystem } from '@/lib/dataCardSystem'
import { createPostProcessing } from '@/lib/postProcessing'
import MemoryHUD from './MemoryHUD'
import { SoundEngine } from '@/lib/soundEngine'

// ---- focus mode + navigation helpers ----

type FocusMode = 'none' | 'location' | 'memory'

function getNavIds(
  mode: FocusMode,
  focusedLocationId: string | null,
  focusedMemoryIndex: number | null,
) {
  if (!focusedLocationId)
    return { prev: null as string | null, next: null as string | null }

  if (mode === 'memory') {
    const loc = journeyData.locations.find((l) => l.id === focusedLocationId)
    if (!loc || !loc.memories || loc.memories.length === 0) {
      return { prev: null, next: null }
    }
    const count = loc.memories.length
    const idx = focusedMemoryIndex ?? 0
    const prevIdx = (idx - 1 + count) % count
    const nextIdx = (idx + 1) % count
    return {
      prev: `${focusedLocationId}::mem-${prevIdx}`,
      next: `${focusedLocationId}::mem-${nextIdx}`,
    }
  }

  if (mode === 'location') {
    const index = journeyData.locations.findIndex(
      (l) => l.id === focusedLocationId,
    )
    if (index === -1) return { prev: null, next: null }
    const countLoc = journeyData.locations.length
    const prevLoc = journeyData.locations[(index - 1 + countLoc) % countLoc].id
    const nextLoc = journeyData.locations[(index + 1) % countLoc].id
    return { prev: prevLoc, next: nextLoc }
  }

  return { prev: null, next: null }
}

function getLocationLabelFromMapped(m: MappedLocation | null | undefined) {
  if (!m) return null
  const baseId = m.parentLocationId ?? m.id
  const loc = journeyData.locations.find((l) => l.id === baseId)
  if (!loc) return null
  return { name: loc.name, nameCn: loc.nameCn }
}

export default function TopographyScene() {
  const [focusMode, setFocusMode] = useState<FocusMode>('none')
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(
    null,
  )
  const [focusedMemoryIndex, setFocusedMemoryIndex] = useState<number | null>(
    null,
  )

  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  const [selected, setSelected] = useState<MappedLocation | undefined>(
    undefined,
  )
  const [hovered, setHovered] = useState<MappedLocation | null>(null)
  const [height, setHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )

  const queueFocusRef = useRef<(id: string) => void>(() => {})
  const soundRef = useRef<SoundEngine | null>(null)

  useEffect(() => {
    if (rendererRef.current) return
    if (!mountRef.current) return
    mountRef.current.innerHTML = ''

    const rect = mountRef.current.getBoundingClientRect()
    const W = rect.width || window.innerWidth
    const H = rect.height || window.innerHeight
    setHeight(H)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.75
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020208)

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000)
    camera.position.set(210, 110, 210)

    const ambient = new THREE.AmbientLight(0xffffff, 0.12)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.32)
    keyLight.position.set(120, 180, 140)
    scene.add(keyLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = true
    controls.minDistance = 15
    controls.maxDistance = 450
    controls.target.set(0, 10, 0)
    controls.autoRotate = false
    controls.autoRotateSpeed = 0

    const features = mapJourneyToFeatures(journeyData)

    const sphereEngine = new PointCloudSphere()
    const pointCloud = sphereEngine.generate(features)
    scene.add(pointCloud)

    const cardSystem = new DataCardSystem(
      features,
      sphereEngine,
      journeyData.locations as any,
    )
    scene.add(cardSystem.getCardGroup())
    scene.add(cardSystem.getWireGroup())
    scene.add(cardSystem.getInterCardWireGroup())

    // ambient particles
    const ambientParticleCount = 800
    const ambientPositions = new Float32Array(ambientParticleCount * 3)
    for (let i = 0; i < ambientParticleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 100 + Math.random() * 150
      ambientPositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
      ambientPositions[i * 3 + 1] = r * Math.cos(phi)
      ambientPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const ambientGeo = new THREE.BufferGeometry()
    ambientGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(ambientPositions, 3),
    )
    const ambientMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    })
    const ambientPoints = new THREE.Points(ambientGeo, ambientMat)
    scene.add(ambientPoints)

    // post-processing
    let postProcessing: ReturnType<typeof createPostProcessing> | null = null
    try {
      postProcessing = createPostProcessing(renderer, scene, camera)
    } catch (e) {
      console.warn('Post-processing not available:', e)
    }

    // sound
    const soundEngine = new SoundEngine()
    soundRef.current = soundEngine

    // hover / raycast
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 5 }

    const mouse = new THREE.Vector2()
    let mouseWorld: THREE.Vector3 | null = null
    let hoverDirty = false
    let lastHoveredId: string | null = null
    let currentHoveredMapped: MappedLocation | null = null
    let audioNodeForFrame: MappedLocation | null = null

    // focus state (in-space zoom)
    const focusState = {
      active: false,
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos: camera.position.clone(),
      toTarget: controls.target.clone(),
      t: 0,
    }
    let pendingFocusId: string | null = null
    let rotationAngle = 0

    const queueFocus = (id: string) => {
      pendingFocusId = id
    }
    queueFocusRef.current = queueFocus

    const onPointerMove = (ev: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      mouse.x = ((ev.clientX - bounds.left) / bounds.width) * 2 - 1
      mouse.y = -(((ev.clientY - bounds.top) / bounds.height) * 2 - 1)
      hoverDirty = true
    }

    const onPointerDown = (ev: PointerEvent) => {
      soundEngine.start()

      const bounds = renderer.domElement.getBoundingClientRect()
      mouse.x = ((ev.clientX - bounds.left) / bounds.width) * 2 - 1
      mouse.y = -(((ev.clientY - bounds.top) / bounds.height) * 2 - 1)

      raycaster.setFromCamera(mouse, camera)
      const cardHits = raycaster.intersectObjects(
        cardSystem.getCardGroup().children,
        true,
      )

      if (cardHits.length > 0) {
        let obj: THREE.Object3D | null = cardHits[0].object
        while (obj && !(obj as any).__mapped) {
          obj = obj.parent
        }
        if (obj && (obj as any).__mapped) {
          const mapped = (obj as any).__mapped as MappedLocation

          if (mapped.parentLocationId) {
            // memory
            const locId = mapped.parentLocationId
            const match = mapped.id.match(/::mem-(\d+)/)
            const memIndex = match ? parseInt(match[1], 10) : 0

            setFocusMode('memory')
            setFocusedLocationId(locId)
            setFocusedMemoryIndex(memIndex)
          } else {
            // location hub
            setFocusMode('location')
            setFocusedLocationId(mapped.id)
            setFocusedMemoryIndex(null)
          }

          pendingFocusId = mapped.id
          currentHoveredMapped = mapped
          setHovered(mapped)
          return
        }
      }

      if (lastHoveredId) {
        const cards = cardSystem.getCards()
        const card = cards.find((c) => c.mapped.id === lastHoveredId)
        if (card) {
          const mapped = card.mapped
          if (mapped.parentLocationId) {
            const locId = mapped.parentLocationId
            const match = mapped.id.match(/::mem-(\d+)/)
            const memIndex = match ? parseInt(match[1], 10) : 0
            setFocusMode('memory')
            setFocusedLocationId(locId)
            setFocusedMemoryIndex(memIndex)
          } else {
            setFocusMode('location')
            setFocusedLocationId(mapped.id)
            setFocusedMemoryIndex(null)
          }
        }
        pendingFocusId = lastHoveredId
      }
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove, {
      passive: true,
    })
    renderer.domElement.addEventListener('pointerdown', onPointerDown, {
      passive: true,
    })

    let raf = 0
    const clock = new THREE.Clock()
    let lastTime = 0
    let running = true

    const animate = () => {
      if (!running) return
      raf = requestAnimationFrame(animate)

      const elapsed = clock.getElapsedTime()
      const deltaTime = Math.min(elapsed - lastTime, 0.1)
      lastTime = elapsed

      if (pendingFocusId) {
        const cards = cardSystem.getCards()
        const card = cards.find((c) => c.mapped.id === pendingFocusId)
        if (card) {
          const worldPos = new THREE.Vector3()
          const worldQuat = new THREE.Quaternion()
          card.cardMesh.getWorldPosition(worldPos)
          card.cardMesh.getWorldQuaternion(worldQuat)

          const box = new THREE.Box3().setFromObject(card.cardMesh)
          const size = new THREE.Vector3()
          box.getSize(size)
          const maxDim = Math.max(size.x, size.y)

          const fovRad = THREE.MathUtils.degToRad(camera.fov)
          const baseDistance = maxDim / (2 * Math.tan(fovRad / 2))
          const focusTightness = 0.9
          const focusDistance = baseDistance * focusTightness

          const forward = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(worldQuat)
            .normalize()
          const up = new THREE.Vector3(0, 1, 0)
            .applyQuaternion(worldQuat)
            .normalize()

          const toPos = worldPos
            .clone()
            .add(forward.clone().multiplyScalar(focusDistance))
          const toTarget = worldPos.clone().add(up.clone().multiplyScalar(0.5))

          focusState.fromPos.copy(camera.position)
          focusState.fromTarget.copy(controls.target)
          focusState.toPos.copy(toPos)
          focusState.toTarget.copy(toTarget)
          focusState.t = 0
          focusState.active = true

          setSelected(card.mapped)
        }
        pendingFocusId = null
      }

      if (hoverDirty) {
        hoverDirty = false
        raycaster.setFromCamera(mouse, camera)

        const pointHits = raycaster.intersectObject(pointCloud)
        if (pointHits.length > 0) {
          mouseWorld = pointHits[0].point.clone()
        } else {
          mouseWorld = null
        }

        let newHoveredId: string | null = null
        if (mouseWorld) {
          const cards = cardSystem.getCards()
          let closestDist = 20
          for (const card of cards) {
            const dist = card.cardMesh.position.distanceTo(mouseWorld)
            if (dist < closestDist) {
              closestDist = dist
              newHoveredId = card.mapped.id
            }
          }
        }

        if (newHoveredId !== lastHoveredId) {
          lastHoveredId = newHoveredId
          if (newHoveredId) {
            const cards = cardSystem.getCards()
            const card = cards.find((c) => c.mapped.id === newHoveredId)
            const mapped = card ? card.mapped : null
            currentHoveredMapped = mapped
            setHovered(mapped)
          } else {
            currentHoveredMapped = null
            setHovered(null)
          }
        }
      }

      cardSystem.updateMousePosition(mouseWorld)
      cardSystem.update(deltaTime, elapsed)

      const sceneRotationSpeed = 0.0
      if (!focusState.active) {
        rotationAngle += deltaTime * sceneRotationSpeed
      }

      pointCloud.rotation.y = rotationAngle
      cardSystem.getCardGroup().rotation.y = rotationAngle
      cardSystem.getWireGroup().rotation.y = rotationAngle
      cardSystem.getInterCardWireGroup().rotation.y = rotationAngle
      ambientPoints.rotation.y = rotationAngle * 0.35

      if (focusState.active) {
        const duration = 0.8
        focusState.t = Math.min(focusState.t + deltaTime / duration, 1)
        const ease = 1 - Math.pow(1 - focusState.t, 3)

        camera.position.lerpVectors(focusState.fromPos, focusState.toPos, ease)
        ;(controls.target as any).lerpVectors(
          focusState.fromTarget,
          focusState.toTarget,
          ease,
        )

        if (focusState.t >= 1) {
          focusState.active = false
        }
      }

      controls.update()

      const cardsForAudio = cardSystem.getCards()
      const cameraDir = new THREE.Vector3()
      camera.getWorldDirection(cameraDir)

      let bestScore = Infinity
      let bestMapped: MappedLocation | null = null
      const tmpWorldPos = new THREE.Vector3()
      const tmpToCard = new THREE.Vector3()

      for (const card of cardsForAudio) {
        card.cardMesh.getWorldPosition(tmpWorldPos)
        tmpToCard.copy(tmpWorldPos).sub(camera.position)

        const distance = tmpToCard.length()
        if (distance < 1e-3) continue

        const dir = tmpToCard.normalize()
        const alignment = dir.dot(cameraDir)
        if (alignment <= 0) continue

        const score = distance / Math.max(alignment, 0.15)
        if (score < bestScore) {
          bestScore = score
          bestMapped = card.mapped
        }
      }

      audioNodeForFrame = bestMapped

      soundEngine.update({
        cameraPos: camera.position,
        mouseNdc: mouse,
        node: audioNodeForFrame,
        time: elapsed,
      })

      if (postProcessing) {
        postProcessing.update(elapsed)
        postProcessing.composer.render()
      } else {
        renderer.render(scene, camera)
      }
    }

    animate()

    const onResize = () => {
      if (!mountRef.current) return
      const r = mountRef.current.getBoundingClientRect()
      const newW = r.width || window.innerWidth
      const newH = r.height || window.innerHeight
      setHeight(newH)

      camera.aspect = newW / newH
      camera.updateProjectionMatrix()
      renderer.setSize(newW, newH)
      if (postProcessing) {
        postProcessing.resize(newW, newH)
      }
    }

    window.addEventListener('resize', onResize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)

      scene.traverse((obj) => {
        if ((obj as any).geometry) {
          ;(obj as any).geometry.dispose()
        }
        if ((obj as any).material) {
          const mat = (obj as any).material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })

      postProcessing?.composer.dispose()
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  const hoveredLabel = getLocationLabelFromMapped(hovered)
  const selectedLabel = getLocationLabelFromMapped(selected)
  const navIds = getNavIds(focusMode, focusedLocationId, focusedMemoryIndex)

  const hasFocusedLocationMemories =
    focusedLocationId != null &&
    !!journeyData.locations.find((l) => l.id === focusedLocationId)?.memories
      ?.length

  return (
    <>
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ width: '100vw', height }}
      />

      {/* Hover pill */}
      {hoveredLabel && (
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-black/70 border border-white/10 shadow-lg backdrop-blur-sm">
            <div className="text-[11px] font-mono tracking-tight text-white/80">
              {hoveredLabel.name}
            </div>
            {hoveredLabel.nameCn && (
              <div className="text-[10px] opacity-60 mt-0.5 text-white/70">
                {hoveredLabel.nameCn}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected HUD (detail) */}
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <MemoryHUD selected={selected} />
      </div>

      {/* Focus/navigation HUD */}
      {focusMode !== 'none' && focusedLocationId && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-black/70 border border-white/15 backdrop-blur-sm pointer-events-auto">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                {focusMode === 'location' ? 'LOCATION' : 'MEMORY'}
              </span>
              <span className="text-[11px] font-mono text-white/80">
                {selectedLabel?.name ?? focusedLocationId}
              </span>
              {selectedLabel?.nameCn && (
                <span className="text-[10px] text-white/60">
                  {selectedLabel.nameCn}
                </span>
              )}
            </div>

            <div className="h-8 w-px bg-white/15" />

            {/* prev / next */}
            <button
              disabled={!navIds.prev}
              onClick={() => {
                if (!navIds.prev) return
                queueFocusRef.current(navIds.prev)

                if (focusMode === 'location') {
                  setFocusMode('location')
                  setFocusedLocationId(navIds.prev)
                  setFocusedMemoryIndex(null)
                } else {
                  if (navIds.prev.includes('::mem-')) {
                    const [locId, memPart] = navIds.prev.split('::')
                    const memIndex = parseInt(memPart.replace('mem-', ''), 10)
                    setFocusMode('memory')
                    setFocusedLocationId(locId)
                    setFocusedMemoryIndex(memIndex)
                  } else {
                    setFocusMode('location')
                    setFocusedLocationId(navIds.prev)
                    setFocusedMemoryIndex(null)
                  }
                }
              }}
              className={`text-[11px] font-mono px-2 py-1 rounded-full border transition ${
                navIds.prev
                  ? 'border-white/30 text-white/80 hover:bg-white/10'
                  : 'border-white/10 text-white/30 cursor-default'
              }`}
            >
              ◂ PREV
            </button>

            <button
              disabled={!navIds.next}
              onClick={() => {
                if (!navIds.next) return
                queueFocusRef.current(navIds.next)

                if (focusMode === 'location') {
                  setFocusMode('location')
                  setFocusedLocationId(navIds.next)
                  setFocusedMemoryIndex(null)
                } else {
                  if (navIds.next.includes('::mem-')) {
                    const [locId, memPart] = navIds.next.split('::')
                    const memIndex = parseInt(memPart.replace('mem-', ''), 10)
                    setFocusMode('memory')
                    setFocusedLocationId(locId)
                    setFocusedMemoryIndex(memIndex)
                  } else {
                    setFocusMode('location')
                    setFocusedLocationId(navIds.next)
                    setFocusedMemoryIndex(null)
                  }
                }
              }}
              className={`text-[11px] font-mono px-2 py-1 rounded-full border transition ${
                navIds.next
                  ? 'border-white/30 text-white/80 hover:bg-white/10'
                  : 'border-white/10 text-white/30 cursor-default'
              }`}
            >
              NEXT ▸
            </button>

            {/* enter / exit memories */}
            {focusMode === 'location' && hasFocusedLocationMemories && (
              <button
                onClick={() => {
                  if (!focusedLocationId) return
                  const memId = `${focusedLocationId}::mem-0`
                  setFocusMode('memory')
                  setFocusedMemoryIndex(0)
                  queueFocusRef.current(memId)
                }}
                className="text-[11px] font-mono px-2 py-1 rounded-full border border-white/25 text-white/80 hover:bg-white/10"
              >
                ENTER MEMORIES
              </button>
            )}

            {focusMode === 'memory' && (
              <button
                onClick={() => {
                  if (!focusedLocationId) return
                  setFocusMode('location')
                  setFocusedMemoryIndex(null)
                  queueFocusRef.current(focusedLocationId)
                }}
                className="text-[11px] font-mono px-2 py-1 rounded-full border border-white/25 text-white/80 hover:bg-white/10"
              >
                EXIT TO LOCATION
              </button>
            )}

            {/* global close */}
            <button
              onClick={() => {
                setFocusMode('none')
                setFocusedLocationId(null)
                setFocusedMemoryIndex(null)
                setSelected(undefined)
              }}
              className="text-[11px] font-mono px-2 py-1 rounded-full border border-white/25 text-white/80 hover:bg-white/10 transition"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* bottom-left data readout */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="text-[9px] font-mono opacity-25 leading-relaxed text-white">
          <div>RENDER: POINT_CLOUD + CARDS</div>
          <div>MODE: ORBIT · LOCATION · MEMORY</div>
          <div>I/O: MOUSE · CAMERA · AUDIO</div>
        </div>
      </div>
    </>
  )
}
