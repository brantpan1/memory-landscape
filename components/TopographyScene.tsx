'use client'

import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { journeyData } from '@/lib/journeyData'
import { mapJourneyToFeatures, MappedLocation } from '@/lib/featureMapping'
import { TerrainEngine } from '@/lib/terrainEngine'
import MemoryHUD from './MemoryHUD'

export default function TopographyScene() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const [selected, setSelected] = useState<MappedLocation | undefined>(
    undefined,
  )

  useEffect(() => {
    if (rendererRef.current) return
    if (!mountRef.current) return
    mountRef.current.innerHTML = ''

    const rect = mountRef.current.getBoundingClientRect()
    const W = rect.width || window.innerWidth
    const H = rect.height || window.innerHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x000511, 0.0016)

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1500)
    camera.position.set(160, 150, 160)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 1)
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // lights
    scene.add(new THREE.AmbientLight(0x8899bb, 0.65))
    const sun = new THREE.DirectionalLight(0xfff5e6, 0.95)
    sun.position.set(130, 160, 110)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x4fc3f7, 0.35)
    rim.position.set(-120, 90, -80)
    scene.add(rim)

    // controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.minDistance = 90
    controls.maxDistance = 420
    controls.maxPolarAngle = Math.PI * 0.49

    // data → features
    const features = mapJourneyToFeatures(journeyData)

    // terrain
    const engine = new TerrainEngine(101)
    const terrain = engine.generate(features)
    scene.add(terrain)

    // center/look
    const bb = new THREE.Box3().setFromObject(terrain)
    const center = bb.getCenter(new THREE.Vector3())
    controls.target.copy(center)
    camera.lookAt(center)

    // halos
    const haloGroup = new THREE.Group()
    features.mapped.forEach((m) => {
      const g = new THREE.SphereGeometry(m.isVisit ? 16 : 22, 16, 16)
      const mat = new THREE.MeshBasicMaterial({
        color: m.baseColor,
        transparent: true,
        opacity: m.haloOpacity,
        side: THREE.BackSide,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(g, mat)
      mesh.position.set(m.pos.x, Math.max(6, m.elevationBias * 0.22), m.pos.z)
      haloGroup.add(mesh)
    })
    scene.add(haloGroup)

    // labels (sprites)
    const labelGroup = new THREE.Group()
    features.mapped.forEach((m) => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 256
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const loc = journeyData.locations.find((l) => l.id === m.id)!
      ctx.clearRect(0, 0, 512, 256)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font =
        'bold 56px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(loc.name, 256, 110)

      if (loc.nameCn) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)'
        ctx.font =
          '40px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
        ctx.fillText(loc.nameCn, 256, 158)
      }

      // show period succinctly if available
      const subtitle = loc.period
        ? `${loc.period.start.slice(0, 4)}${loc.period.end ? '–' + loc.period.end.slice(0, 4) : ''}`
        : (loc.year ?? '')
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.font =
        '32px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
      ctx.fillText(String(subtitle), 256, 205)

      const tex = new THREE.CanvasTexture(canvas)
      const sm = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: m.labelOpacity,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(sm)
      sprite.position.set(m.pos.x, 20, m.pos.z)
      sprite.scale.set(m.labelScale, m.labelScale * 0.5, 1)
      ;(sprite as any).__mapped = m
      labelGroup.add(sprite)
    })
    scene.add(labelGroup)

    // arcs
    const pathGroup = new THREE.Group()
    features.mappedConnections.forEach((c) => {
      const A = c.from.pos.clone().setY(0.6)
      const B = c.to.pos.clone().setY(0.6)
      const M = A.clone().add(B).multiplyScalar(0.5)
      M.y = c.curvatureY

      const curve = new THREE.CatmullRomCurve3([A, M, B])
      const pts = curve.getPoints(120)
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({
        color: c.color,
        transparent: true,
        opacity: c.opacity,
      })
      const line = new THREE.Line(geo, mat)
      line.position.y = 0.8 + c.weight * 0.7
      pathGroup.add(line)

      // light “thickness” copies
      const copies = Math.round(c.weight * 5)
      for (let i = 0; i < copies; i++) {
        const off = (i + 1) * 0.03
        const g2 = new THREE.BufferGeometry().setFromPoints(
          pts.map((p) => p.clone().add(new THREE.Vector3(off, 0, 0))),
        )
        const l2 = new THREE.Line(g2, mat.clone())
        ;(l2.material as THREE.LineBasicMaterial).opacity = c.opacity * 0.65
        l2.position.y = line.position.y
        pathGroup.add(l2)
      }
    })
    scene.add(pathGroup)

    // picking
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const onPointerDown = (ev: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect()
      mouse.x = ((ev.clientX - bounds.left) / bounds.width) * 2 - 1
      mouse.y = -(((ev.clientY - bounds.top) / bounds.height) * 2 - 1)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(labelGroup.children, false)
      if (hits[0]) {
        const sp = hits[0].object as any
        const mapped: MappedLocation | undefined = sp.__mapped
        setSelected(mapped)
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown, {
      passive: true,
    })

    // animate
    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      // subtle breathe
      terrain.rotation.y = Math.sin(performance.now() * 0.00045) * 0.012
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // resize
    const onResize = () => {
      if (!mountRef.current) return
      const r = mountRef.current.getBoundingClientRect()
      const w = r.width || window.innerWidth
      const h = r.height || window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      cancelAnimationFrame(raf)

      scene.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material))
            child.material.forEach((m: any) => m.dispose())
          else child.material.dispose()
        }
        if (child.material?.map) child.material.map.dispose?.()
      })

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
      renderer.dispose()
      rendererRef.current = null
    }
  }, [])

  return (
    <>
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{ width: '100vw', height: '100vh' }}
      />
      <div className="absolute bottom-8 left-8 max-w-md pointer-events-none">
        <h2 className="text-xs uppercase tracking-[0.3em] opacity-60 mb-2">
          Data-Driven Topography
        </h2>
        <p className="text-sm opacity-40 leading-relaxed">
          Positions derive from language balance (x) and time spiral (z).
          Terrain drama scales with intensity, valence, significance, and
          duration.
        </p>
      </div>
      <div className="absolute bottom-8 right-8 text-right pointer-events-none">
        <MemoryHUD selected={selected} />
      </div>
    </>
  )
}
