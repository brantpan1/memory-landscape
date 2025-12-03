'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { journeyData } from '@/lib/journeyData'
import { mapJourneyToFeatures, MappedLocation } from '@/lib/featureMapping'
import { PointCloudSphere } from '@/lib/pointCloudSphere'
import { DataCardSystem } from '@/lib/dataCardSystem'
import { createPostProcessing, PostProcessingSetup } from '@/lib/postProcessing'
import MemoryHUD from './MemoryHUD'

export default function TopographyScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  const [selected, setSelected] = useState<MappedLocation | undefined>(
    undefined,
  )
  const [hovered, setHovered] = useState<MappedLocation | null>(null)

  // optional: for sizing the div (keep if you already had this logic)
  const [height, setHeight] = useState<number>(
    typeof window !== 'undefined' ? window.innerHeight : 800,
  )

  useEffect(() => {
    if (rendererRef.current) return
    if (!mountRef.current) return
    mountRef.current.innerHTML = ''

    const rect = mountRef.current.getBoundingClientRect()
    const W = rect.width || window.innerWidth
    const H = rect.height || window.innerHeight
    setHeight(H)

    // renderer
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

    // scene & camera
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020208)

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000)
    camera.position.set(210, 110, 210)

    // lighting – toned down
    const ambient = new THREE.AmbientLight(0xffffff, 0.12)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.32)
    keyLight.position.set(120, 180, 140)
    scene.add(keyLight)

    // controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = true
    controls.minDistance = 110
    controls.maxDistance = 450
    controls.target.set(0, 10, 0)
    controls.autoRotate = false
    controls.autoRotateSpeed = 0

    // data
    const features = mapJourneyToFeatures(journeyData)

    // point cloud sphere
    const sphereEngine = new PointCloudSphere()
    const pointCloud = sphereEngine.generate(features)
    scene.add(pointCloud)

    // cards
    const cardSystem = new DataCardSystem(
      features,
      sphereEngine,
      journeyData.locations,
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
    let postProcessing: PostProcessingSetup | null = null
    try {
      postProcessing = createPostProcessing(renderer, scene, camera)
    } catch (e) {
      console.warn('Post-processing not available:', e)
    }

    // ---------- HOVER / RAYCAST SETUP (step 2) ----------

    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 5 }

    const mouse = new THREE.Vector2()
    let mouseWorld: THREE.Vector3 | null = null
    let hoverDirty = false
    let lastHoveredId: string | null = null
    let isRunning = true

    const onPointerMove = (ev: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      mouse.x = ((ev.clientX - bounds.left) / bounds.width) * 2 - 1
      mouse.y = -(((ev.clientY - bounds.top) / bounds.height) * 2 - 1)
      hoverDirty = true
    }

    const onPointerDown = () => {
      if (!lastHoveredId) return
      const cards = cardSystem.getCards()
      const card = cards.find((c) => c.mapped.id === lastHoveredId)
      if (card) {
        setSelected(card.mapped)
      }
    }

    renderer.domElement.addEventListener('pointermove', onPointerMove, {
      passive: true,
    })
    renderer.domElement.addEventListener('pointerdown', onPointerDown, {
      passive: true,
    })

    // ---------- ANIMATION LOOP ----------

    let raf = 0
    const clock = new THREE.Clock()
    let lastTime = 0

    const animate = () => {
      if (!isRunning) return
      raf = requestAnimationFrame(animate)

      const elapsed = clock.getElapsedTime()
      const deltaTime = Math.min(elapsed - lastTime, 0.1)
      lastTime = elapsed

      // handle hover once per frame
      if (hoverDirty) {
        hoverDirty = false

        raycaster.setFromCamera(mouse, camera)

        // 1) intersect point cloud to find mouseWorld
        const pointHits = raycaster.intersectObject(pointCloud)
        if (pointHits.length > 0) {
          mouseWorld = pointHits[0].point.clone()
        } else {
          // fallback: ray-sphere intersection
          const ray = raycaster.ray
          const sphereRadius = sphereEngine.getBaseRadius()
          const sphereCenter = new THREE.Vector3(0, 0, 0)
          const oc = ray.origin.clone().sub(sphereCenter)
          const a = ray.direction.dot(ray.direction)
          const b = 2 * oc.dot(ray.direction)
          const c = oc.dot(oc) - sphereRadius * sphereRadius * 1.5 // a bit bigger
          const discriminant = b * b - 4 * a * c
          if (discriminant > 0) {
            const t = (-b - Math.sqrt(discriminant)) / (2 * a)
            if (t > 0) {
              mouseWorld = ray.origin
                .clone()
                .add(ray.direction.clone().multiplyScalar(t))
            }
          } else {
            mouseWorld = null
          }
        }

        // 2) find closest card to mouseWorld
        let newHoveredId: string | null = null
        if (mouseWorld) {
          const cards = cardSystem.getCards()
          let closestDist = 20
          cards.forEach((card) => {
            const dist = card.cardMesh.position.distanceTo(mouseWorld!)
            if (dist < closestDist) {
              closestDist = dist
              newHoveredId = card.mapped.id
            }
          })
        }

        // 3) only update React if the hovered card actually changed
        if (newHoveredId !== lastHoveredId) {
          lastHoveredId = newHoveredId

          if (newHoveredId) {
            const cards = cardSystem.getCards()
            const card = cards.find((c) => c.mapped.id === newHoveredId)
            setHovered(card ? card.mapped : null)
          } else {
            setHovered(null)
          }
        }
      }

      // feed mouseWorld into card system for proximity activation
      cardSystem.updateMousePosition(mouseWorld)
      cardSystem.update(deltaTime, elapsed)

      // slow rotation for all elements
      const rotation = elapsed * 0.015
      pointCloud.rotation.y = rotation
      cardSystem.getCardGroup().rotation.y = rotation
      cardSystem.getWireGroup().rotation.y = rotation
      cardSystem.getInterCardWireGroup().rotation.y = rotation
      ambientPoints.rotation.y = rotation * 0.35

      controls.update()

      if (postProcessing) {
        postProcessing.update(elapsed)
        postProcessing.composer.render()
      } else {
        renderer.render(scene, camera)
      }
    }

    animate()

    // resize
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

    // cleanup
    return () => {
      isRunning = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)

      // dispose scene geometry/materials
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

      // you *can* add this if you want:
      // postProcessing?.composer.dispose()

      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  // derive a human-readable location label from hovered node
  let hoveredLocationLabel: { name: string; nameCn?: string } | null = null
  if (hovered) {
    const baseId = hovered.parentLocationId ?? hovered.id
    const loc = journeyData.locations.find((l) => l.id === baseId)
    if (loc) {
      hoveredLocationLabel = { name: loc.name, nameCn: loc.nameCn }
    }
  }

  return (
    <>
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ width: '100vw', height }}
      />

      {/* hovered info pill */}
      {hoveredLocationLabel && (
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-black/70 border border-white/10 shadow-lg backdrop-blur-sm">
            <div className="text-[11px] font-mono tracking-tight">
              {hoveredLocationLabel.name}
            </div>
            {hoveredLocationLabel.nameCn && (
              <div className="text-[10px] opacity-60 mt-0.5">
                {hoveredLocationLabel.nameCn}
              </div>
            )}
          </div>
        </div>
      )}

      {/* selected detailed HUD */}
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <MemoryHUD selected={selected} />
      </div>

      {/* bottom-left data readout */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <div className="text-[9px] font-mono opacity-25 leading-relaxed">
          <div>RENDER: POINT_CLOUD</div>
          <div>NODES: ACTIVE</div>
          <div>INTERACTION: PROXIMITY</div>
        </div>
      </div>
    </>
  )
}
