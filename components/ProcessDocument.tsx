
// components/ProcessDocument.tsx
'use client'

import React, { useState } from 'react'

type SectionId =
  | 'overview'
  | 'data-model'
  | 'data-links'
  | 'visual-system'
  | 'interaction-audio'

interface MappingRow {
  id: string
  label: string
  source: string
  visual: string
  mapping: string
  notes?: string
}

const dataToVisualMappings: MappingRow[] = [
  {
    id: 'loc-language-x',
    label: 'Location.languageBalance → X position',
    source: 'location.languageBalance ∈ [-1, 1]',
    visual: 'Sphere layout: base X-coordinate of hub node',
    mapping: 'Linear remap to [-80, 80], blended with time spiral X component',
    notes: 'Encodes English↔Chinese language balance into left↔right spatial bias.',
  },
  {
    id: 'loc-year-time',
    label: 'Location.year / period → Time spiral',
    source: 'midpointYear(period.start, period.end) or year',
    visual: 'Sphere layout: time spiral radius + angle (Z and part of X)',
    mapping: 'Normalize year within [minYear, maxYear] → t ∈ [0,1]; angle = 3.5π·t, radius = lerp(30, 90, t)',
    notes: 'Older memories sit closer to the core of the spiral; newer ones further out.',
  },
  {
    id: 'loc-intensity-terrain',
    label: 'Location.intensity → Terrain amplitude',
    source: 'location.intensity ∈ [0,1]',
    visual: 'Topography: elevation amplitude and local deformation strength',
    mapping: 'amplitude = lerp(6, 22, intensity); contributes to elevationBias = 14·intensity + …',
    notes: 'Higher intensity locations push the surface outward and increase local contrast.',
  },
  {
    id: 'loc-significance-bias',
    label: 'Location.significance → Elevation bias',
    source: 'location.significance ∈ [0,1]',
    visual: 'Topography: base elevation offset around location',
    mapping: 'elevationBias includes term 18·significance; erosion = lerp(0.12, 0.9, 1 - significance)',
    notes: 'More significant locations sit on higher plateaus with reduced erosion.',
  },
  {
    id: 'loc-valence-ridge',
    label: 'Location.valence → Ridge factor',
    source: 'location.valence ∈ [-1,1]',
    visual: 'Topography: sharpness of ridges around location',
    mapping: 'ridgeFactor = lerp(0.05, 0.95, |valence|)',
    notes: 'More emotionally charged locations (positive or negative) produce sharper ridges.',
  },
  {
    id: 'loc-duration-roughness',
    label: 'Location.duration → Roughness',
    source: 'location.duration (years)',
    visual: 'Topography: noise roughness around hub',
    mapping: 'roughness = lerp(0.18, 1.1, clamp(duration / 18))',
    notes: 'Longer periods of time correspond to more complex surface detail.',
  },
  {
    id: 'loc-isVisit-jitter',
    label: 'Location.isVisit → Positional jitter',
    source: 'location.isVisit: boolean',
    visual: 'Sphere layout: small jitter applied to position',
    mapping: 'Visit locations receive a slight additional X jitter term',
    notes: 'Separates short visits from long-term “home” locations in the cluster.',
  },
  {
    id: 'memory-ring',
    label: 'Memory[] → Orbiting nodes',
    source: 'location.memories[] array',
    visual: 'Secondary nodes orbiting each hub in a ring',
    mapping: 'angle = 2π·(index / count) + languageBalance·0.5; radius = 6 + 6·intensity; Y-offset from valence & sentiment',
    notes: 'Each memory becomes a distinct node in a structured ring, grouped by location.',
  },
  {
    id: 'memory-type-style',
    label: 'Memory.type → Card style',
    source: 'memory.type ∈ {receipt, photo, letter, document}',
    visual: 'Card background, typography, and decorative motif',
    mapping: 'Switch on type to choose palette (off-white receipt, print photo frame, letter lines, document paper)',
    notes: 'The same data location is presented through different object typologies.',
  },
  {
    id: 'memory-sentiment-terrain',
    label: 'Memory.sentiment → Local terrain modulation',
    source: 'memory.sentiment ∈ [-1,1]',
    visual: 'Child node elevation + amplitude modulation',
    mapping: 'biasAdd ∝ sentiment; ampMul ∈ [0.85, 1.25] depending on type; roughMul, ridgeMul adjusted per type',
    notes: 'Sentiment shifts local height and the aggressiveness of terrain features around a memory.',
  },
  {
    id: 'memory-language-color',
    label: 'Memory.language → Color tint',
    source: 'memory.language ∈ {zh, en, mixed}',
    visual: 'Card accent color + node baseColor tint',
    mapping: 'zh → slight red/orange bias; en → slight blue bias; mixed → neutral',
    notes: 'Subtle chroma shift indicates which language the memory “speaks” in.',
  },
  {
    id: 'global-x-chroma',
    label: 'MappedLocation.pos.x → Global chroma shift',
    source: 'mapped.pos.x normalized across all locations',
    visual: 'Sphere color gradient',
    mapping: 'xNorm ∈ [0,1] → chromaShift(xNorm) adjusting RGB for cooler vs warmer hues',
    notes: 'Horizontal layout (language axis) also controls the sphere’s color palette locally.',
  },
  {
    id: 'connections-weight',
    label: 'Connection.weight → Arc curvature + opacity',
    source: 'connection.weight ∈ [0,1]',
    visual: 'Inter-location wires',
    mapping: 'curvatureY = lerp(10, 30, weight); opacity = lerp(0.25, 0.85, weight)',
    notes: 'Stronger narrative connections arc higher and render more prominently.',
  },
  {
    id: 'card-activation',
    label: 'Mouse proximity → Card activation',
    source: 'min(distance(mouseWorld, cardPos), distance(mouseWorld, surfacePos))',
    visual: 'Card opacity, anchor scale, wire opacity',
    mapping: 'activation = (1 - d / radius)²; used as multiplier for opacity and scale on several elements',
    notes: 'Spatial closeness drives visibility instead of explicit click-only states.',
  },
  {
    id: 'camera-radius-audio',
    label: 'Camera distance → Audio brightness',
    source: 'camera.position.length()',
    visual: 'Sound filter cutoff',
    mapping: 'rNorm = clamp((r - 120) / 260); cutoff = 200 + 1800·rNorm',
    notes: 'Zooming out opens the filter; zooming in darkens the sound.',
  },
  {
    id: 'hovered-node-audio',
    label: 'Hovered node → Pitch and harmonic spread',
    source: 'hovered.amplitude, hovered.ridgeFactor, hovered.pos.x',
    visual: 'Two oscillator frequencies + detune',
    mapping: 'Base frequency from valence-like term; harmonic spread from amplitude; language axis perturbs detune',
    notes: 'Different memory clusters produce different tonal centers.',
  },
  {
    id: 'mouse-ndc-audio',
    label: 'Mouse NDC → Pan and articulation',
    source: 'mouse ∈ [-1,1]²',
    visual: 'Stereo panning + filter Q + gain modulation',
    mapping: 'pan = 0.75·mouse.x; Q and gain modulated from mouse.y and time',
    notes: 'Pointer motion directly shapes stereo field and timbre.',
  },
]

const sections: { id: SectionId; label: string; short: string }[] = [
  { id: 'overview', label: 'Overview', short: 'OVR' },
  { id: 'data-model', label: 'Data Model', short: 'DATA' },
  { id: 'data-links', label: 'Data → Visual', short: 'MAP' },
  { id: 'visual-system', label: 'Visual System', short: 'VIS' },
  { id: 'interaction-audio', label: 'Interaction + Audio', short: 'I/O' },
]

export default function ProcessDocument() {
  const [activeSection, setActiveSection] = useState<SectionId>('data-links')

  return (
    <div className="h-full overflow-y-auto pt-20 pb-12 custom-scroll bg-gradient-to-b from-black via-gray-950 to-black">
      <article className="max-w-5xl mx-auto px-6 space-y-16">
        {/* Header */}
        <header className="space-y-6 py-12 border-b border-white/10">
          <h1 className="text-5xl font-extralight tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Memory Landscape: Process + Mapping
          </h1>
          <p className="text-sm font-mono text-white/50 max-w-2xl">
            Direct documentation of how autobiographical data is transformed into
            geometry, cards, interaction, and sound.
          </p>

          {/* Section tabs */}
          <nav className="mt-6 flex flex-wrap gap-2 text-[11px] font-mono">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-3 py-1 rounded-full border transition ${
                  activeSection === section.id
                    ? 'border-white/70 bg-white/5 text-white'
                    : 'border-white/10 text-white/50 hover:border-white/40 hover:text-white/80'
                }`}
              >
                <span className="opacity-60 mr-1">{section.short}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </header>

        {/* Sections */}
        <section className={activeSection === 'overview' ? 'space-y-6' : 'hidden'}>
          <h2 className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase">
            01 · Overview
          </h2>
          <div className="border border-white/10 rounded-2xl p-6 bg-gradient-to-br from-white/5 via-white/0 to-white/5">
            <p className="text-sm text-white/70">
              The project maps a small set of true locations (Nanjing, Chicago, Boston,
              NYC, London) and their associated memories onto a deformable sphere,
              then derives visuals and audio from those parameters in a deterministic
              way. No visual is arbitrary; every change is tied to data or interaction.
            </p>
            <p className="mt-4 text-xs font-mono text-white/50">
              Locations → hub nodes on the sphere. Memories → orbiting nodes. Each
              field in the data model is connected to at least one visual or sonic
              channel documented in the mapping section.
            </p>
          </div>
        </section>

        <section
          className={activeSection === 'data-model' ? 'space-y-6' : 'hidden'}
        >
          <h2 className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase">
            02 · Data Model
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-white/10 rounded-2xl p-5 bg-black/40">
              <h3 className="text-sm font-mono text-white/80 mb-3">
                Location schema
              </h3>
              <ul className="space-y-1 text-xs font-mono text-white/60">
                <li>
                  <span className="text-white/40">id:</span> string
                </li>
                <li>
                  <span className="text-white/40">name:</span> string
                </li>
                <li>
                  <span className="text-white/40">nameCn:</span> optional string
                </li>
                <li>
                  <span className="text-white/40">period:</span> start, end dates
                </li>
                <li>
                  <span className="text-white/40">year:</span> fallback numeric year
                </li>
                <li>
                  <span className="text-white/40">intensity:</span> [0,1]
                </li>
                <li>
                  <span className="text-white/40">valence:</span> [-1,1]
                </li>
                <li>
                  <span className="text-white/40">languageBalance:</span> [-1,1]
                </li>
                <li>
                  <span className="text-white/40">significance:</span> [0,1]
                </li>
                <li>
                  <span className="text-white/40">duration:</span> years
                </li>
                <li>
                  <span className="text-white/40">isVisit:</span> boolean
                </li>
                <li>
                  <span className="text-white/40">color:</span> base hex color
                </li>
                <li>
                  <span className="text-white/40">memories:</span> Memory[]
                </li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-2xl p-5 bg-black/40">
              <h3 className="text-sm font-mono text-white/80 mb-3">
                Memory schema
              </h3>
              <ul className="space-y-1 text-xs font-mono text-white/60">
                <li>
                  <span className="text-white/40">type:</span> receipt | photo | letter
                  | document
                </li>
                <li>
                  <span className="text-white/40">content:</span> descriptive text
                </li>
                <li>
                  <span className="text-white/40">date:</span> ISO string
                </li>
                <li>
                  <span className="text-white/40">sentiment:</span> [-1,1]
                </li>
                <li>
                  <span className="text-white/40">language:</span> en | zh | mixed
                </li>
              </ul>

              <h3 className="text-sm font-mono text-white/80 mt-5 mb-2">
                Derived mapping entity
              </h3>
              <p className="text-xs font-mono text-white/60 mb-2">
                <span className="text-white/40">MappedLocation:</span> carries:
              </p>
              <ul className="space-y-1 text-xs font-mono text-white/60">
                <li>pos: 3D vector on/near sphere</li>
                <li>baseColor: THREE.Color</li>
                <li>elevationBias, amplitude, roughness, erosion, ridgeFactor</li>
                <li>labelOpacity, haloOpacity, labelScale</li>
                <li>parentLocationId, memoryType</li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className={activeSection === 'data-links' ? 'space-y-6' : 'hidden'}
        >
          <h2 className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase">
            03 · Data → Visual / Audio Mapping
          </h2>

          <div className="border border-white/10 rounded-2xl p-5 bg-black/60">
            <p className="text-xs font-mono text-white/60 mb-4">
              Each row lists a concrete link between a data field and a visual or
              sonic output. No mapping is implicit; every transformation is spelled
              out as a function from input domain to output range.
            </p>

            <div className="grid gap-3">
              {dataToVisualMappings.map((row) => (
                <div
                  key={row.id}
                  className="relative border border-white/10 rounded-xl p-4 bg-gradient-to-br from-white/5 via-transparent to-white/5"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-[11px] font-mono text-white/80">
                      {row.label}
                    </h3>
                    <span className="text-[10px] font-mono text-white/40">
                      {row.id}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-1.5 text-[11px] font-mono text-white/65 md:grid-cols-2">
                    <div>
                      <p className="text-white/40">Source</p>
                      <p>{row.source}</p>
                    </div>
                    <div>
                      <p className="text-white/40">Visual / Audio channel</p>
                      <p>{row.visual}</p>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] font-mono text-white/65">
                    <p className="text-white/40">Mapping</p>
                    <p>{row.mapping}</p>
                  </div>

                  {row.notes && (
                    <p className="mt-2 text-[10px] font-mono text-white/45">
                      {row.notes}
                    </p>
                  )}

                  <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          className={activeSection === 'visual-system' ? 'space-y-6' : 'hidden'}
        >
          <h2 className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase">
            04 · Visual System
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="border border-white/10 rounded-2xl p-5 bg-black/50">
              <h3 className="text-sm font-mono text-white/80 mb-3">
                Sphere + Topography
              </h3>
              <ul className="space-y-1 text-[11px] font-mono text-white/65">
                <li>Base mesh: subdivided sphere.</li>
                <li>
                  Vertex displacement = sum of layered noise modulated by
                  (elevationBias, amplitude, roughness, ridgeFactor).
                </li>
                <li>
                  Each MappedLocation contributes a field falling off with distance.
                </li>
                <li>
                  Color uses chromaShift(xNorm), tying language axis to local hue.
                </li>
              </ul>
            </div>

            <div className="border border-white/10 rounded-2xl p-5 bg-black/50">
              <h3 className="text-sm font-mono text-white/80 mb-3">
                Cards + Wires
              </h3>
              <ul className="space-y-1 text-[11px] font-mono text-white/65">
                <li>
                  Location cards: larger, neutral dark theme, show hub metadata.
                </li>
                <li>
                  Memory cards: type-specific layouts (receipt/photo/letter/document).
                </li>
                <li>
                  Card positions offset from surface along normal + local tangents.
                </li>
                <li>
                  Wires connect surface anchors to card positions; opacity = f(activation).
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className={
            activeSection === 'interaction-audio' ? 'space-y-6' : 'hidden'
          }
        >
          <h2 className="text-xs font-mono tracking-[0.2em] text-white/40 uppercase">
            05 · Interaction + Audio
          </h2>

          <div className="border border-white/10 rounded-2xl p-5 bg-black/60">
            <h3 className="text-sm font-mono text-white/80 mb-3">
              Interaction loop
            </h3>
            <ul className="space-y-1 text-[11px] font-mono text-white/65 mb-4">
              <li>Pointer movement updates mouse NDC once per frame.</li>
              <li>
                Raycaster computes mouseWorld point; nearest card defines hovered node.
              </li>
              <li>
                Card activations updated from distance; activation drives visual states.
              </li>
              <li>
                Camera orbit + scene rotation are combined for motion, no auto-reset.
              </li>
            </ul>

            <h3 className="text-sm font-mono text-white/80 mb-3">
              Audio mapping
            </h3>
            <ul className="space-y-1 text-[11px] font-mono text-white/65">
              <li>
                Two oscillators (sine, triangle) run continuously once the user clicks.
              </li>
              <li>
                Camera radius sets filter cutoff; mouse.x sets stereo pan; mouse.y sets
                Q and contributes to gain modulation.
              </li>
              <li>
                Hovered MappedLocation controls base frequency, harmonic spread, and
                detune through amplitude, ridgeFactor, and language axis.
              </li>
              <li>
                Master gain slowly interpolates to avoid clicks. No audio event is
                triggered without a corresponding interaction or state change.
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-white/10">
          <div className="text-[10px] font-mono text-white/35 flex flex-wrap justify-between gap-2">
            <span>PROCESS DOC: Memory Landscape</span>
            <span>All visuals and sound are parameter-driven.</span>
          </div>
        </footer>
      </article>
    </div>
  )
}

