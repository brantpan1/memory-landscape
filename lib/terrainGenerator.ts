import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { MemoryLocation } from './journeyData'

export class TerrainGenerator {
  private noise2D: ReturnType<typeof createNoise2D>
  private geometry: THREE.PlaneGeometry
  private width: number = 300
  private height: number = 200
  private segments: number = 200

  constructor(seed?: number) {
    this.noise2D = createNoise2D()
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.height,
      this.segments,
      this.segments,
    )
    this.geometry.rotateX(-Math.PI / 2)
  }

  generateTerrain(locations: MemoryLocation[]): THREE.Mesh {
    const vertices = this.geometry.attributes.position.array
    const colors: number[] = []

    // Generate height map
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const z = vertices[i + 2]

      let height = 0
      const color = new THREE.Color(0x0a0a0f)

      // Base terrain using noise
      const scale1 = 0.01
      const scale2 = 0.02
      const scale3 = 0.05

      height += this.noise2D(x * scale1, z * scale1) * 15
      height += this.noise2D(x * scale2, z * scale2) * 8
      height += this.noise2D(x * scale3, z * scale3) * 3

      // Create memory-influenced topography
      locations.forEach((location) => {
        const distance = Math.sqrt(
          Math.pow(x - location.coords[0], 2) +
            Math.pow(z - location.coords[2], 2),
        )

        // Create elevation features around memories
        if (distance < 40) {
          const influence = Math.max(0, 1 - distance / 40)

          // Different terrain features based on memory type
          switch (location.type) {
            case 'origin':
              // Mountains for origin - sharp peaks
              height += Math.pow(influence, 2) * location.elevation * 1.5
              break
            case 'childhood':
              // Rolling hills for childhood
              height += Math.sin(influence * Math.PI) * location.elevation
              break
            case 'work':
              // Plateaus for work periods
              height += influence > 0.5 ? location.elevation * 0.8 : 0
              break
            case 'present':
              // Gentle slopes for present
              height += influence * location.elevation * 0.5
              break
            default:
              height += influence * location.elevation
          }

          // Blend terrain colors
          const locColor = new THREE.Color(location.color)
          color.lerp(locColor, influence * 0.3)
        }
      })

      // Geographic gradient - China mountainous, America flatter
      const chinaInfluence = Math.max(0, (-x - 50) / 100)
      height += chinaInfluence * 8
      height *= 1 - (Math.max(0, x - 30) / 100) * 0.3

      // Add erosion patterns
      const erosion = this.noise2D(x * 0.1, z * 0.1) * 0.5
      height = height * (0.9 + erosion * 0.1)

      // Set vertex height
      vertices[i + 1] = height

      // Calculate color based on height and region
      const normalizedX = (x + 150) / 300

      // Base biome colors
      if (normalizedX < 0.33) {
        // China - warm earth tones
        color.add(new THREE.Color(0.25, 0.15, 0.1))
      } else if (normalizedX < 0.66) {
        // Pacific/Chicago - deep blues
        color.add(new THREE.Color(0.05, 0.1, 0.2))
      } else {
        // East Coast - cool purples
        color.add(new THREE.Color(0.1, 0.05, 0.15))
      }

      // Height-based color variation
      const heightInfluence = Math.max(0, Math.min(1, height / 30))
      const brightness = 0.3 + heightInfluence * 0.5

      colors.push(
        color.r * brightness,
        color.g * brightness,
        color.b * brightness,
      )
    }

    // Apply colors and compute normals
    this.geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3),
    )
    this.geometry.computeVertexNormals()

    // Create material with vertex colors
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: false,
      side: THREE.DoubleSide,
    })

    const terrain = new THREE.Mesh(this.geometry, material)
    terrain.receiveShadow = true
    terrain.castShadow = true

    return terrain
  }

  // Create memory influence zones (invisible but affect terrain)
  createMemoryField(location: MemoryLocation): THREE.Group {
    const group = new THREE.Group()

    // Create subtle glow at memory location
    const glowGeometry = new THREE.SphereGeometry(20, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: location.color,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.position.set(...location.coords)
    glow.position.y = location.elevation / 2
    group.add(glow)

    return group
  }
}
