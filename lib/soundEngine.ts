// soundEngine.ts
import * as THREE from 'three'
import { MappedLocation } from './featureMapping'

export interface SoundUpdateParams {
  cameraPos: THREE.Vector3
  mouseNdc: THREE.Vector2
  node: MappedLocation | null
  time: number
}

export class SoundEngine {
  private audioCtx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private pan: StereoPannerNode | null = null
  private padOscs: OscillatorNode[] = []
  private padGains: GainNode[] = []
  private noiseSource: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private started = false

  private lastBaseFreq = 220
  private lastZoneIndex = 0

  private ensureContext() {
    if (this.audioCtx) return

    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctor()
    this.audioCtx = ctx

    const masterGain = ctx.createGain()
    masterGain.gain.value = 0.0 // fade in on start
    this.masterGain = masterGain

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900 // soft, not too bright
    filter.Q.value = 0.5
    this.filter = filter

    const pan = ctx.createStereoPanner()
    pan.pan.value = 0
    this.pan = pan

    // base graph: pads + noise -> filter -> pan -> master -> destination
    filter.connect(pan)
    pan.connect(masterGain)
    masterGain.connect(ctx.destination)

    // create pad oscillators (three-voice chord)
    const baseFreq = 220
    const ratios = [1, 5 / 4, 3 / 2] // root, major third, fifth
    const waveforms: OscillatorType[] = ['sine', 'triangle', 'sine']

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      osc.type = waveforms[i]

      const gain = ctx.createGain()
      gain.gain.value = 0.18 / (i + 1) // quieter for higher voices

      osc.frequency.value = baseFreq * ratios[i]
      osc.connect(gain)
      gain.connect(filter)

      this.padOscs.push(osc)
      this.padGains.push(gain)
    }

    // subtle filtered noise for texture
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25
    }

    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true

    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.04

    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.value = 600
    noiseFilter.Q.value = 0.7

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(filter)

    this.noiseSource = noise
    this.noiseGain = noiseGain
  }

  start() {
    this.ensureContext()
    if (!this.audioCtx || this.started) return
    const ctx = this.audioCtx

    const now = ctx.currentTime

    // Start pads
    for (const osc of this.padOscs) {
      osc.start(now)
    }

    // Start noise
    this.noiseSource?.start(now)

    // Fade in master
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.setValueAtTime(0.0, now)
      this.masterGain.gain.linearRampToValueAtTime(0.18, now + 1.0)
    }

    this.started = true
  }

  stop() {
    if (!this.audioCtx || !this.started) return
    const ctx = this.audioCtx
    const now = ctx.currentTime

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now)
      this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.6)
    }

    for (const osc of this.padOscs) {
      osc.stop(now + 0.61)
    }
    this.noiseSource?.stop(now + 0.61)

    this.padOscs = []
    this.padGains = []
    this.noiseSource = null
    this.started = false
  }

  setMasterVolume(v: number) {
    if (!this.masterGain || !this.audioCtx) return
    const ctx = this.audioCtx
    const now = ctx.currentTime
    const clamped = Math.max(0, Math.min(1, v))
    this.masterGain.gain.setTargetAtTime(clamped, now, 0.2)
  }

  private pickBaseFreq(node: MappedLocation | null): number {
    // Stable but gentle mapping to a small set of notes
    const scale = [
      220.0, // A3
      246.94, // B3
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.0, // G4
    ]

    if (!node) {
      return this.lastBaseFreq || scale[0]
    }

    const id = node.id
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    }
    const idx = hash % scale.length
    this.lastZoneIndex = idx
    return scale[idx]
  }

  update(params: SoundUpdateParams) {
    if (!this.audioCtx || !this.started) return
    const { cameraPos, mouseNdc, node, time } = params
    const ctx = this.audioCtx
    const now = ctx.currentTime

    // --- derive controls from space ---

    // Base pitch from closest node
    const targetBase = this.pickBaseFreq(node)

    // Slight octave shift from camera height
    const heightNorm = THREE.MathUtils.clamp((cameraPos.y + 80) / 260, 0, 1)
    const octaveOffset = heightNorm > 0.7 ? 1 : heightNorm < 0.3 ? -0.5 : 0
    const baseFreq = targetBase * Math.pow(2, octaveOffset)

    // Camera radius -> brightness (filter cutoff)
    const r = cameraPos.length()
    const rNorm = THREE.MathUtils.clamp((r - 80) / 260, 0, 1)
    const cutoff = 300 + 1400 * rNorm // mellow range

    // Mouse X -> gentle pan; mouse Y -> slight loudness/texture change
    const targetPan = mouseNdc.x * 0.5
    const gestureAmount = THREE.MathUtils.clamp((mouseNdc.y + 1) / 2, 0, 1)

    // Node amplitude / ridge factor -> how "present" the pad is
    let presence = 0.4
    if (node) {
      const ampFactor = THREE.MathUtils.clamp(node.amplitude / 25, 0, 1)
      const ridgeFactor = THREE.MathUtils.clamp(node.ridgeFactor, 0, 1)
      presence = 0.25 + 0.25 * ampFactor + 0.15 * ridgeFactor
    }

    // --- apply to audio graph ---

    // Frequencies for the three pad voices (root, third, fifth)
    const ratios = [1, 5 / 4, 3 / 2]
    for (let i = 0; i < this.padOscs.length; i++) {
      const osc = this.padOscs[i]
      const ratio = ratios[i]
      const targetFreq = baseFreq * ratio

      osc.frequency.setTargetAtTime(targetFreq, now, 0.3)
    }

    // Filter: brightness from radius, with slow LFO to keep it alive
    if (this.filter) {
      const lfo = 0.15 * Math.sin(time * 0.15)
      const targetCutoff = cutoff * (1 + lfo)
      this.filter.frequency.setTargetAtTime(targetCutoff, now, 0.25)
      this.filter.Q.setTargetAtTime(0.6 + 0.4 * gestureAmount, now, 0.3)
    }

    // Stereo panning
    if (this.pan) {
      this.pan.pan.setTargetAtTime(targetPan, now, 0.2)
    }

    // Master loudness (always non-zero, just breathing)
    if (this.masterGain) {
      const slowBreathe = 0.15 * Math.sin(time * 0.08)
      const targetGain = THREE.MathUtils.clamp(
        0.12 + presence * 0.18 + slowBreathe,
        0.05,
        0.4,
      )
      this.masterGain.gain.setTargetAtTime(targetGain, now, 0.4)
    }

    // Noise presence: slightly more if gestureAmount is higher
    if (this.noiseGain) {
      const noiseLevel = 0.02 + 0.05 * gestureAmount
      this.noiseGain.gain.setTargetAtTime(noiseLevel, now, 0.5)
    }
  }
}
