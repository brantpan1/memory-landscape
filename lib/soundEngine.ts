import * as THREE from 'three'
import { MappedLocation } from './featureMapping'

// Roughly inspired by parameterSonificationTest's mapping:
// baseFreq, harmonicSpread, modRate, filterCutoff, etc. :contentReference[oaicite:1]{index=1}

export interface SoundUpdateParams {
  cameraPos: THREE.Vector3
  mouseNdc: THREE.Vector2 // [-1, 1] in both axes
  hovered: MappedLocation | null
  time: number
}

export class SoundEngine {
  private audioCtx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private pan: StereoPannerNode | null = null
  private oscA: OscillatorNode | null = null
  private oscB: OscillatorNode | null = null
  private started = false

  private lastBaseFreq = 220

  private ensureContext() {
    if (this.audioCtx) return
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    this.audioCtx = new Ctor()
    this.masterGain = this.audioCtx.createGain()
    this.masterGain.gain.value = 0.25

    this.filter = this.audioCtx.createBiquadFilter()
    this.filter.type = 'lowpass'
    this.filter.frequency.value = 800
    this.filter.Q.value = 0.7

    this.pan = this.audioCtx.createStereoPanner()
    this.pan.pan.value = 0

    // graph: osc -> filter -> pan -> master -> destination
    this.filter.connect(this.pan)
    this.pan.connect(this.masterGain)
    this.masterGain.connect(this.audioCtx.destination)
  }

  start() {
    this.ensureContext()
    if (!this.audioCtx || this.started) return

    const ctx = this.audioCtx

    // two continuous oscillators; we’ll modulate them in update()
    this.oscA = ctx.createOscillator()
    this.oscB = ctx.createOscillator()

    this.oscA.type = 'sine'
    this.oscB.type = 'triangle'

    // temporary base
    this.oscA.frequency.value = 220
    this.oscB.frequency.value = 220 * 1.5

    this.oscA.connect(this.filter!)
    this.oscB.connect(this.filter!)

    const now = ctx.currentTime
    this.masterGain!.gain.setValueAtTime(0.0, now)
    this.masterGain!.gain.linearRampToValueAtTime(0.25, now + 0.4)

    this.oscA.start()
    this.oscB.start()

    this.started = true
  }

  stop() {
    if (!this.audioCtx || !this.started) return
    const ctx = this.audioCtx
    const now = ctx.currentTime

    this.masterGain!.gain.cancelScheduledValues(now)
    this.masterGain!.gain.linearRampToValueAtTime(0, now + 0.3)

    this.oscA?.stop(now + 0.31)
    this.oscB?.stop(now + 0.31)

    this.oscA = null
    this.oscB = null
    this.started = false
  }

  setMasterVolume(v: number) {
    if (!this.masterGain) return
    this.masterGain.gain.value = Math.max(0, Math.min(1, v))
  }

  update(params: SoundUpdateParams) {
    if (!this.audioCtx || !this.started) return
    const { cameraPos, mouseNdc, hovered, time } = params
    const ctx = this.audioCtx

    // --- 1. derive “emotional” parameters from camera / hovered ---

    const r = cameraPos.length() // distance from origin
    const rNorm = THREE.MathUtils.clamp((r - 120) / 260, 0, 1) // ~[0, 1]

    // treat left/right language axis as melodic color
    let langBalance = 0
    let intensity = 0.4
    let valence = 0 // [-1, 1]

    if (hovered) {
      // map x position to fake language balance
      const xNorm = THREE.MathUtils.clamp(
        (hovered.pos.x - -120) / (120 - -120),
        0,
        1,
      )
      langBalance = xNorm * 2 - 1 // 0..1 -> -1..1

      intensity = THREE.MathUtils.clamp(hovered.amplitude / 25, 0, 1)
      // use ridgeFactor to bias valence-ish feeling
      valence = THREE.MathUtils.clamp(hovered.ridgeFactor * 1.2 - 0.6, -1, 1)
    }

    // mouse vertical = “significance” of gesture
    const mouseHeight = THREE.MathUtils.clamp((mouseNdc.y + 1) / 2, 0, 1)
    const significance = mouseHeight

    // --- 2. map to audio params (in spirit of your test file) ---

    const baseFreq = 220 * Math.pow(2, valence) // more positive = higher pitch
    const harmonicSpread = 1 + Math.abs(langBalance) * 2
    const modRate = 0.5 + intensity * 5
    const filterCutoff = 200 + rNorm * 1800 // closer camera = darker, far = brighter

    // smooth base frequency to avoid harsh jumps
    const targetBase = baseFreq
    const smoothedBase = THREE.MathUtils.lerp(
      this.lastBaseFreq,
      targetBase,
      0.1,
    )
    this.lastBaseFreq = smoothedBase

    // --- 3. apply to nodes ---

    if (this.oscA) {
      // camera azimuth from mouse X for slight detune wander
      const detune = Math.sin(time * modRate * 0.3 + mouseNdc.x * Math.PI) * 12
      this.oscA.frequency.setTargetAtTime(
        smoothedBase + detune,
        ctx.currentTime,
        0.05,
      )
    }

    if (this.oscB) {
      const second = smoothedBase * (1 + harmonicSpread / 6)
      this.oscB.frequency.setTargetAtTime(second, ctx.currentTime, 0.08)
    }

    if (this.filter) {
      this.filter.frequency.setTargetAtTime(filterCutoff, ctx.currentTime, 0.05)
      this.filter.Q.setTargetAtTime(
        0.7 + significance * 6,
        ctx.currentTime,
        0.1,
      )
    }

    if (this.pan) {
      // mouseX → stereo pan
      this.pan.pan.setTargetAtTime(mouseNdc.x * 0.75, ctx.currentTime, 0.03)
    }

    if (this.masterGain) {
      // subtle breathing with time so it never feels dead when camera stops
      const breathe = 0.7 + 0.3 * Math.sin(time * 0.2 + mouseNdc.y * Math.PI)
      const baseVol = 0.18 + intensity * 0.12
      const targetGain = baseVol * breathe
      this.masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1)
    }
  }
}
