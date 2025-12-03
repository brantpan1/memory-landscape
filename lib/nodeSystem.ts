import * as THREE from 'three'
import type { FeatureBundle, MappedLocation } from './featureMapping'
import type { SphereEngine } from './sphereEngine'

export interface NodeState {
  position: THREE.Vector3
  mapped: MappedLocation
  activation: number // smoothed value [0,1]
  targetActivation: number
  focusBias: number // extra boost if this is the closest node
  noiseSeed: number // random seed per node
}

export interface ConnectionState {
  from: NodeState
  to: NodeState
  line: THREE.Line
  activation: number
  noiseSeed: number
}

/**
 * NodeSystem:
 * - Builds nodes on the sphere from mapped locations
 * - Primary connections from your data graph
 * - Extra geodesic neighbor connections for mesh-like network
 * - Node glow + ring + inner core
 * - Flashing based on time + proximity
 */
export class NodeSystem {
  private nodes: NodeState[] = []
  private connections: ConnectionState[] = []

  private nodeGroup: THREE.Group
  private connectionGroup: THREE.Group

  private particleSystem: THREE.Points | null = null
  private particlePositions!: Float32Array
  private particleVelocities!: Float32Array
  private particleLifetimes!: Float32Array
  private particleColors!: Float32Array
  private maxParticles = 1500

  private activationRadius = 55
  private features: FeatureBundle

  constructor(features: FeatureBundle, engine: SphereEngine) {
    this.features = features
    this.nodeGroup = new THREE.Group()
    this.connectionGroup = new THREE.Group()

    // create node states from mapped locations
    features.mapped.forEach((m, idx) => {
      const position = engine.getLocationPosition(m)
      this.nodes.push({
        position,
        mapped: m,
        activation: 0,
        targetActivation: 0,
        focusBias: 0,
        noiseSeed: idx * 13.713,
      })
    })

    // connections from data graph
    this.initDataConnections()

    // extra neighbor connections for chaotic mesh
    this.initNeighborConnections()

    // draw node meshes
    this.initNodeMeshes()

    // ambient burst particle system
    this.initParticleSystem()
  }

  // -------------------------------------------------------
  // connections
  // -------------------------------------------------------

  private initDataConnections() {
    this.features.mappedConnections.forEach((c, idx) => {
      const fromNode = this.nodes.find((n) => n.mapped.id === c.from.id)
      const toNode = this.nodes.find((n) => n.mapped.id === c.to.id)
      if (!fromNode || !toNode) return

      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(6)
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const mat = new THREE.LineBasicMaterial({
        color: c.color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      })

      const line = new THREE.Line(geo, mat)
      this.connectionGroup.add(line)

      this.connections.push({
        from: fromNode,
        to: toNode,
        line,
        activation: 0,
        noiseSeed: idx * 97.123,
      })
    })
  }

  /**
   * Add k-nearest neighbors per node to make a denser, more chaotic graph
   */
  private initNeighborConnections() {
    const k = 4

    this.nodes.forEach((node, idx) => {
      const neighbors = this.nodes
        .map((other, j) => ({
          index: j,
          node: other,
          dist: node.position.distanceTo(other.position),
        }))
        .filter((n) => n.index !== idx)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, k)

      neighbors.forEach(({ node: other }, nIdx) => {
        // avoid duplicates
        const exists = this.connections.find(
          (conn) =>
            (conn.from === node && conn.to === other) ||
            (conn.from === other && conn.to === node),
        )
        if (exists) return

        const geo = new THREE.BufferGeometry()
        const positions = new Float32Array(6)
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

        const mixedColor = new THREE.Color()
          .copy(node.mapped.baseColor as any)
          .lerp(other.mapped.baseColor as any, 0.5)

        const mat = new THREE.LineBasicMaterial({
          color: mixedColor,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
        })

        const line = new THREE.Line(geo, mat)
        this.connectionGroup.add(line)

        this.connections.push({
          from: node,
          to: other,
          line,
          activation: 0,
          noiseSeed: idx * 131.21 + nIdx * 11.3,
        })
      })
    })
  }

  // -------------------------------------------------------
  // node meshes
  // -------------------------------------------------------

  private initNodeMeshes() {
    this.nodes.forEach((node) => {
      const baseColor = node.mapped.baseColor as any as THREE.Color

      // inner core
      const coreGeo = new THREE.SphereGeometry(1.4, 24, 24)
      const coreMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
      })
      const core = new THREE.Mesh(coreGeo, coreMat)
      core.position.copy(node.position)
      ;(core as any).__node = node
      ;(core as any).__type = 'core'
      this.nodeGroup.add(core)

      // ring (facing outward a bit)
      const ringGeo = new THREE.RingGeometry(2.6, 3.4, 48)
      const ringMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.copy(node.position)
      ring.lookAt(node.position.clone().multiplyScalar(1.2))
      ;(ring as any).__node = node
      ;(ring as any).__type = 'ring'
      this.nodeGroup.add(ring)

      // glow shell
      const glowGeo = new THREE.SphereGeometry(4.2, 16, 16)
      const glowMat = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.copy(node.position)
      ;(glow as any).__node = node
      ;(glow as any).__type = 'glow'
      this.nodeGroup.add(glow)
    })
  }

  // -------------------------------------------------------
  // particles
  // -------------------------------------------------------

  private initParticleSystem() {
    this.particlePositions = new Float32Array(this.maxParticles * 3)
    this.particleVelocities = new Float32Array(this.maxParticles * 3)
    this.particleLifetimes = new Float32Array(this.maxParticles)
    this.particleColors = new Float32Array(this.maxParticles * 3)

    for (let i = 0; i < this.maxParticles; i++) {
      this.particleLifetimes[i] = 0
      this.particlePositions[i * 3] = 0
      this.particlePositions[i * 3 + 1] = -1000
      this.particlePositions[i * 3 + 2] = 0
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particlePositions, 3),
    )
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.particleColors, 3),
    )

    const material = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.particleSystem = new THREE.Points(geometry, material)
  }

  // -------------------------------------------------------
  // interaction
  // -------------------------------------------------------

  /**
   * Mouse world position → sets target activation per node.
   * Actual activation is smoothed in update().
   */
  updateMousePosition(worldPosition: THREE.Vector3 | null) {
    // reset focus
    this.nodes.forEach((n) => (n.focusBias = 0))

    if (!worldPosition) {
      this.nodes.forEach((node) => {
        node.targetActivation = 0
      })
      return
    }

    // compute base target activations
    let bestNode: NodeState | null = null
    let bestT = 0

    this.nodes.forEach((node) => {
      const dist = node.position.distanceTo(worldPosition)
      const tRaw = Math.max(0, 1 - dist / this.activationRadius)
      const t = tRaw * tRaw // soften with square
      node.targetActivation = t

      if (t > bestT) {
        bestT = t
        bestNode = node
      }
    })

    // closest node gets focus boost (tracking)
    if (bestNode && bestT > 0.05) {
      bestNode.focusBias = 0.6 // extra energy
    }
  }

  // -------------------------------------------------------
  // update loop
  // -------------------------------------------------------

  update(deltaTime: number, time: number) {
    const smoothing = 5

    // animate activations
    this.nodes.forEach((node) => {
      const target = THREE.MathUtils.clamp(
        node.targetActivation + node.focusBias,
        0,
        1,
      )
      node.activation = THREE.MathUtils.lerp(
        node.activation,
        target,
        Math.min(1, deltaTime * smoothing),
      )
    })

    // update node meshes (flashing / on-off)
    this.nodeGroup.children.forEach((mesh) => {
      const node = (mesh as any).__node as NodeState
      const type = (mesh as any).__type as string
      if (!node) return

      const mat = mesh.material as THREE.MeshBasicMaterial
      const a = node.activation

      // time-based pulse with random phase
      const pulse =
        0.5 +
        0.5 *
          Math.sin(
            time * (1.5 + node.noiseSeed * 0.07) + node.noiseSeed * 10.123,
          )

      // gating for "turning off" behaviour
      // if activation is very low and pulse is low, hard kill
      const gate =
        a < 0.08 && pulse < 0.3
          ? 0
          : THREE.MathUtils.smoothstep(a * pulse, 0, 1.0)

      if (type === 'core') {
        const baseOpacity = 0.18 + a * 0.6
        mat.opacity = baseOpacity * (0.4 + pulse * 0.6) * gate
        const scale = 1 + a * 0.7 + pulse * 0.2
        mesh.scale.setScalar(scale)
      } else if (type === 'ring') {
        const baseOpacity = a * 1.2
        mat.opacity = baseOpacity * (0.2 + pulse * 0.9) * gate
        const scale = 1.1 + a * 0.9 + pulse * 0.2
        mesh.scale.setScalar(scale)
        mesh.rotation.z += deltaTime * (0.5 + a * 4.0)
      } else if (type === 'glow') {
        const baseOpacity = a * 1.1
        mat.opacity = baseOpacity * (0.5 + pulse * 0.8) * gate
        const scale = 1.0 + a * 1.4 + pulse * 0.3
        mesh.scale.setScalar(scale)
      }
    })

    // update connections (flashing)
    this.connections.forEach((conn) => {
      const combined = Math.max(conn.from.activation, conn.to.activation)
      const base = THREE.MathUtils.lerp(conn.activation, combined, 0.2)
      conn.activation = base

      const mat = conn.line.material as THREE.LineBasicMaterial

      const pulse =
        0.5 +
        0.5 *
          Math.sin(
            time * (1.7 + conn.noiseSeed * 0.03) + conn.noiseSeed * 5.3121,
          )

      let opacity = base * 0.7 * (0.2 + pulse * 0.9)

      // occasionally fully kill some low-activity lines for glitchy feel
      if (base < 0.2 && pulse < 0.25) {
        opacity *= 0.1
      }

      mat.opacity = opacity

      const positions = conn.line.geometry.attributes
        .position as THREE.BufferAttribute
      positions.setXYZ(
        0,
        conn.from.position.x,
        conn.from.position.y,
        conn.from.position.z,
      )
      positions.setXYZ(
        1,
        conn.to.position.x,
        conn.to.position.y,
        conn.to.position.z,
      )
      positions.needsUpdate = true
    })

    // particles: bursts from nodes that cross activation threshold peaks
    this.updateParticles(deltaTime, time)
  }

  private updateParticles(deltaTime: number, time: number) {
    if (!this.particleSystem) return
    const positions = this.particleSystem.geometry.attributes
      .position as THREE.BufferAttribute
    const colors = this.particleSystem.geometry.attributes
      .color as THREE.BufferAttribute

    // spawn from nodes whose activation is high and pulsing
    this.nodes.forEach((node) => {
      if (node.activation > 0.35) {
        const pulse =
          0.5 +
          0.5 *
            Math.sin(
              time * (1.5 + node.noiseSeed * 0.08) + node.noiseSeed * 3.77,
            )
        const spawnChance = node.activation * pulse * 0.35
        if (Math.random() < spawnChance * deltaTime * 20) {
          this.spawnParticle(node)
        }
      }
    })

    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particleLifetimes[i] > 0) {
        this.particleLifetimes[i] -= deltaTime

        if (this.particleLifetimes[i] <= 0) {
          // move offscreen
          this.particlePositions[i * 3] = 0
          this.particlePositions[i * 3 + 1] = -1000
          this.particlePositions[i * 3 + 2] = 0
        } else {
          this.particlePositions[i * 3] +=
            this.particleVelocities[i * 3] * deltaTime
          this.particlePositions[i * 3 + 1] +=
            this.particleVelocities[i * 3 + 1] * deltaTime
          this.particlePositions[i * 3 + 2] +=
            this.particleVelocities[i * 3 + 2] * deltaTime

          // subtle fade to black
          this.particleColors[i * 3] *= 0.992
          this.particleColors[i * 3 + 1] *= 0.992
          this.particleColors[i * 3 + 2] *= 0.992
        }
      }
    }

    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  private spawnParticle(node: NodeState) {
    const baseColor = node.mapped.baseColor as any as THREE.Color
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particleLifetimes[i] <= 0) {
        this.particlePositions[i * 3] = node.position.x
        this.particlePositions[i * 3 + 1] = node.position.y
        this.particlePositions[i * 3 + 2] = node.position.z

        const outward = node.position.clone().normalize()
        const tangent = new THREE.Vector3()
          .copy(outward)
          .applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            (Math.random() - 0.5) * Math.PI * 0.5,
          )
        const speed = 9 + Math.random() * 16
        this.particleVelocities[i * 3] =
          outward.x * speed + tangent.x * 3 * Math.random()
        this.particleVelocities[i * 3 + 1] =
          outward.y * speed + (Math.random() - 0.5) * 3
        this.particleVelocities[i * 3 + 2] =
          outward.z * speed + tangent.z * 3 * Math.random()

        this.particleLifetimes[i] = 0.8 + Math.random() * 1.4

        const jitter = 0.2 + Math.random() * 0.3
        this.particleColors[i * 3] = baseColor.r + jitter
        this.particleColors[i * 3 + 1] = baseColor.g + jitter * 0.4
        this.particleColors[i * 3 + 2] = baseColor.b + jitter * 0.2
        break
      }
    }

    const positions = this.particleSystem!.geometry.attributes
      .position as THREE.BufferAttribute
    const colors = this.particleSystem!.geometry.attributes
      .color as THREE.BufferAttribute
    positions.needsUpdate = true
    colors.needsUpdate = true
  }

  // -------------------------------------------------------
  // public getters
  // -------------------------------------------------------

  getNodeGroup(): THREE.Group {
    return this.nodeGroup
  }

  getConnectionGroup(): THREE.Group {
    return this.connectionGroup
  }

  getParticleSystem(): THREE.Points | null {
    return this.particleSystem
  }

  getNodes(): NodeState[] {
    return this.nodes
  }

  setActivationRadius(r: number) {
    this.activationRadius = r
  }
}
