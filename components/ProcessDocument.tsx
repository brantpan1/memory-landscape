// components/ProcessDocument.tsx
'use client'

import React, { useState } from 'react'

export default function ProcessDocument() {
  const [activeSection, setActiveSection] = useState<string>('signals')

  return (
    <div className="h-full overflow-y-auto pt-20 pb-12 custom-scroll bg-gradient-to-b from-black via-gray-950 to-black">
      <article className="max-w-5xl mx-auto px-6 space-y-16">
        {/* Header */}
        <header className="space-y-6 py-12 border-b border-white/10">
          <h1 className="text-5xl font-extralight tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Memory Landscape: Technical Documentation
          </h1>
          <p className="text-xl text-white/60 max-w-3xl">
            Terrain mesh deformation through autobiographical data parameters.
          </p>
        </header>

        {/* Navigation */}
        <nav className="sticky top-16 z-10 bg-black/80 backdrop-blur-md -mx-6 px-6 py-4 border-y border-white/10">
          <div className="flex gap-8 overflow-x-auto">
            {['signals', 'mapping', 'terrain', 'visual', 'implementation'].map(
              (section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`text-sm uppercase tracking-widest whitespace-nowrap transition-all ${
                    activeSection === section
                      ? 'text-white border-b-2 border-white pb-1'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {section}
                </button>
              ),
            )}
          </div>
        </nav>

        {/* Section 1: Data Signals */}
        <section className="space-y-8" id="signals">
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-extralight text-white/20">01</span>
            <h2 className="text-3xl font-light">Input Parameters</h2>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              Each location accepts five numerical parameters that control
              terrain deformation and visual properties. Parameters are
              normalized to specific ranges for consistent mapping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intensity */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white/90">intensity</h3>
                <span className="text-sm font-mono text-blue-400">
                  float [0,1]
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Magnitude of terrain displacement. Maps directly to amplitude
                parameter through remapping function.
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Input: 0.2</span>
                  <span className="text-white/40">Output amplitude: 9.2</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-1/5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-white/40">Input: 0.9</span>
                  <span className="text-white/40">Output amplitude: 23.8</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-11/12 bg-gradient-to-r from-red-600 to-orange-400 rounded-full" />
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                amplitude = remap(intensity, 0, 1, 6, 26)
              </div>
            </div>

            {/* Valence */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white/90">valence</h3>
                <span className="text-sm font-mono text-purple-400">
                  float [-1,1]
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Signed value affecting vertical offset. Positive values increase
                elevation, negative values decrease.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-16">-1.0</span>
                  <div className="flex-1 h-2 bg-gradient-to-r from-red-600 via-white/20 to-green-600 rounded-full" />
                  <span className="text-xs text-white/40 w-16 text-right">
                    +1.0
                  </span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                elevationBias += valence * 10
              </div>
            </div>

            {/* Language Balance */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white/90">
                  languageBalance
                </h3>
                <span className="text-sm font-mono text-cyan-400">
                  float [-1,1]
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Controls x-axis position and roughness coefficient. Negative
                values shift west, positive east. Absolute value determines
                surface roughness.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center">
                  <div className="h-16 bg-gradient-to-b from-red-900/40 to-red-600/20 rounded" />
                  <span className="text-xs text-white/40 mt-1">-1.0</span>
                </div>
                <div className="text-center">
                  <div className="h-16 bg-gradient-to-b from-purple-900/40 to-purple-600/20 rounded" />
                  <span className="text-xs text-white/40 mt-1">0.0</span>
                </div>
                <div className="text-center">
                  <div className="h-16 bg-gradient-to-b from-blue-900/40 to-blue-600/20 rounded" />
                  <span className="text-xs text-white/40 mt-1">+1.0</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                x = remap(languageBalance, -1, 1, -120, 120)
              </div>
            </div>

            {/* Significance */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white/90">
                  significance
                </h3>
                <span className="text-sm font-mono text-yellow-400">
                  float [0,1]
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Multiplier for visual prominence. Affects label opacity
                (0.35-0.95), halo opacity (0.025-0.1), and label scale (16-26
                units).
              </p>
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">0.2</span>
                  <div className="w-4 h-4 bg-white/20 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">0.6</span>
                  <div className="w-5 h-5 bg-white/50 rounded-full" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/40">0.95</span>
                  <div className="w-6 h-6 bg-white/90 rounded-full shadow-lg shadow-white/30" />
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                labelScale = remap(significance, 0, 1, 16, 26)
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white/90">duration</h3>
                <span className="text-sm font-mono text-orange-400">
                  float (years)
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Time value in years. Maps to erosion coefficient (0.15-0.85).
                Higher duration values produce smoother terrain through
                increased erosion.
              </p>
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-20">0.1 years</span>
                  <div
                    className="h-8 bg-white/10 rounded"
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 20 L5 15 L10 22 L15 18 L20 25 L25 16 L30 20 L35 14 L40 20" stroke="white" stroke-width="1" fill="none" opacity="0.3"/%3E%3C/svg%3E")',
                      backgroundSize: '40px 40px',
                    }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-20">2.5 years</span>
                  <div
                    className="h-8 bg-white/10 rounded"
                    style={{
                      backgroundImage:
                        'url("data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 20 Q10 18 20 20 T40 20" stroke="white" stroke-width="1" fill="none" opacity="0.3"/%3E%3C/svg%3E")',
                      backgroundSize: '40px 40px',
                    }}
                  />
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                erosion = remap(duration, 0, 3, 0.15, 0.85)
              </div>
            </div>

            {/* Period */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white/90">period</h3>
                <span className="text-sm font-mono text-indigo-400">
                  ISO 8601
                </span>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Date range with start and optional end. Midpoint calculation
                determines z-axis position along temporal spiral.
              </p>
              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="p-2 bg-black/30 rounded text-gray-400">
                  <span className="text-indigo-400">period:</span> {`{`}
                  <br />
                  &nbsp;&nbsp;<span className="text-green-400">
                    start:
                  </span>{' '}
                  '2022-01-01',
                  <br />
                  &nbsp;&nbsp;<span className="text-green-400">end:</span>{' '}
                  '2022-06-30'
                  <br />
                  {`}`} <span className="text-gray-500">// 0.5 years</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Spatial Mapping */}
        <section className="space-y-8" id="mapping">
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-extralight text-white/20">02</span>
            <h2 className="text-3xl font-light">Coordinate Calculation</h2>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              3D coordinates derive from data parameters. X-axis maps from
              languageBalance, Z-axis from temporal position on logarithmic
              spiral. Y-axis calculated by terrain engine.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Time Spiral */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Temporal Spiral Function
              </h3>
              <div className="relative h-64 bg-black/30 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-48 h-48">
                  <defs>
                    <linearGradient
                      id="spiral-gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.8" />
                      <stop
                        offset="50%"
                        stopColor="#4ecdc4"
                        stopOpacity="0.8"
                      />
                      <stop
                        offset="100%"
                        stopColor="#45b7d1"
                        stopOpacity="0.8"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 100 100 Q 120 100 120 80 Q 120 60 100 60 Q 80 60 80 80 Q 80 100 100 100 Q 140 100 140 60 Q 140 20 100 20 Q 60 20 60 60 Q 60 100 100 100"
                    stroke="url(#spiral-gradient)"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.6"
                  />
                  <circle cx="100" cy="100" r="3" fill="#ff6b6b" />
                  <circle cx="120" cy="90" r="3" fill="#feca57" />
                  <circle cx="110" cy="60" r="3" fill="#48dbfb" />
                  <circle cx="80" cy="70" r="3" fill="#ff9ff3" />
                  <circle cx="90" cy="100" r="3" fill="#54a0ff" />
                </svg>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                const spiral = (year) =&gt {`{`}
                <br />
                &nbsp;&nbsp;const t = (year - minYear) / range
                <br />
                &nbsp;&nbsp;const angle = t * Math.PI * 2.2
                <br />
                &nbsp;&nbsp;const radius = remap(t, 0, 1, 20, 120)
                <br />
                &nbsp;&nbsp;return {`{`} angle, radius {`}`}
                <br />
                {`}`}
              </div>
            </div>

            {/* X-Axis Mapping */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                X-Axis Distribution
              </h3>
              <div className="space-y-6">
                <div className="relative h-32 bg-black/30 rounded-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 opacity-50" />
                  </div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-xs text-white/60 mt-2 block">
                      -120
                    </span>
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-xs text-white/60 mt-2 block">
                      +120
                    </span>
                  </div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span className="text-xs text-white/60 mt-8 block">0</span>
                  </div>
                </div>
                <p className="text-sm text-white/60">
                  Linear remapping from languageBalance [-1,1] to world
                  coordinates [-120,120]. Additional jitter prevents overlap.
                </p>
                <div className="p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                  x = languageBalance * 120 + sin(index * 2.17) * 8
                </div>
              </div>
            </div>
          </div>

          {/* Position Jitter */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 mt-8">
            <h3 className="text-lg font-medium text-white/90 mb-4">
              Position Disambiguation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2">
                  Initial Positions
                </h4>
                <div className="h-32 bg-black/30 rounded flex items-center justify-center">
                  <div className="relative">
                    <div className="w-3 h-3 bg-white/50 rounded-full absolute top-0 left-0" />
                    <div className="w-3 h-3 bg-white/50 rounded-full absolute top-0 left-1" />
                    <div className="w-3 h-3 bg-white/50 rounded-full absolute top-0 left-2" />
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Overlapping markers
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2">
                  After Jitter
                </h4>
                <div className="h-32 bg-black/30 rounded flex items-center justify-center">
                  <div className="relative w-20 h-20">
                    <div className="w-3 h-3 bg-white/50 rounded-full absolute top-0 left-2" />
                    <div className="w-3 h-3 bg-white/50 rounded-full absolute top-8 left-8" />
                    <div className="w-3 h-3 bg-white/50 rounded-full absolute bottom-2 right-3" />
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-2">8-unit separation</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2">
                  Offset Calculation
                </h4>
                <div className="h-32 bg-black/30 rounded p-3 flex items-center">
                  <div className="text-xs font-mono text-green-400">
                    x += sin(i * 2.17) * 8<br />z += cos(i * 1.31) * 6
                  </div>
                </div>
                <p className="text-xs text-white/40 mt-2">Index-based</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Terrain Generation */}
        <section className="space-y-8" id="terrain">
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-extralight text-white/20">03</span>
            <h2 className="text-3xl font-light">Height Field Generation</h2>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              Terrain height calculated through fractal noise base layer plus
              localized deformations from memory influence fields. Each memory
              location affects surrounding vertices within specified radius.
            </p>
          </div>

          {/* Noise Composition */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8 border border-white/10">
            <h3 className="text-lg font-medium text-white/90 mb-6">
              Fractal Noise Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div
                  className="h-24 bg-gradient-to-t from-white/10 to-transparent rounded"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
                  }}
                />
                <p className="text-xs text-white/60 mt-2">Octave 1</p>
                <p className="text-xs font-mono text-white/40">
                  amp: 1.0, freq: 1.0
                </p>
              </div>
              <div>
                <div
                  className="h-24 bg-gradient-to-t from-white/10 to-transparent rounded"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)',
                  }}
                />
                <p className="text-xs text-white/60 mt-2">Octave 2</p>
                <p className="text-xs font-mono text-white/40">
                  amp: 0.48, freq: 2.0
                </p>
              </div>
              <div>
                <div
                  className="h-24 bg-gradient-to-t from-white/10 to-transparent rounded"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, transparent, transparent 2.5px, rgba(255,255,255,0.05) 2.5px, rgba(255,255,255,0.05) 5px)',
                  }}
                />
                <p className="text-xs text-white/60 mt-2">Octave 3</p>
                <p className="text-xs font-mono text-white/40">
                  amp: 0.23, freq: 4.0
                </p>
              </div>
              <div>
                <div className="h-24 bg-gradient-to-t from-white/20 to-white/5 rounded" />
                <p className="text-xs text-white/60 mt-2">Sum</p>
                <p className="text-xs font-mono text-white/40">normalized</p>
              </div>
            </div>
            <div className="mt-6 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
              lacunarity: 2.0, gain: 0.48, baseFreq: 1.0, octaves: 5
            </div>
          </div>

          {/* Influence Fields */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8 border border-white/10 mt-8">
            <h3 className="text-lg font-medium text-white/90 mb-6">
              Memory Influence Calculation
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-4">
                  Shape Interpolation
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-black/30 rounded flex items-end justify-center p-2">
                      <div
                        className="w-full h-full border-b-2 border-l-2 border-white/30"
                        style={{ borderBottomRightRadius: '100%' }}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">ridgeFactor: 0.2</p>
                      <p className="text-xs text-white/40">Gaussian profile</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 bg-black/30 rounded flex items-end justify-center p-2">
                      <div
                        className="w-full h-full border-b-2 border-white/30"
                        style={{
                          clipPath: 'polygon(0 100%, 50% 0%, 100% 100%)',
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">ridgeFactor: 0.9</p>
                      <p className="text-xs text-white/40">Ridge profile</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-white/70 mb-4">
                  Distance Falloff
                </h4>
                <div className="h-32 bg-black/30 rounded-lg p-4">
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path
                      d="M 0 45 Q 25 20 50 5 Q 75 20 100 45"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1"
                      fill="none"
                    />
                    <text
                      x="50"
                      y="48"
                      className="fill-white/40 text-[6px]"
                      textAnchor="middle"
                    >
                      Distance
                    </text>
                    <text x="5" y="10" className="fill-white/40 text-[6px]">
                      Height
                    </text>
                  </svg>
                </div>
                <div className="mt-2 text-xs font-mono text-green-400">
                  falloff = pow(1 - dist/radius, 2.2)
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-black/30 rounded">
              <pre className="text-xs font-mono text-green-400 overflow-x-auto">
                {`for (const memory of memories) {
  const dist = hypot(x - memory.x, z - memory.z)
  const radius = memory.isVisit ? 28 : 46
  
  if (dist < radius) {
    const t = 1 - dist / radius
    const falloff = pow(t, 2.2)
    
    // Ridge/hill interpolation
    const ridge = abs(noise(x * 0.065, z * 0.065) - 0.5) * 2 - 0.5
    const hill = base - 0.5
    const shape = ridgeFactor * ridge + (1 - ridgeFactor) * hill
    
    height += amplitude * shape * 10 * falloff * exaggeration
    height += elevationBias * 0.6 * falloff
    height = lerp(height, height * 0.7, erosion * 0.4)
  }
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* Section 4: Visual Encoding */}
        <section className="space-y-8" id="visual">
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-extralight text-white/20">04</span>
            <h2 className="text-3xl font-light">Visual Encoding</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Color Mapping */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Color Function
              </h3>
              <div className="h-20 bg-gradient-to-r from-red-900 via-purple-900 to-blue-900 rounded-lg mb-4" />
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-red-400">X: -120</p>
                  <p className="text-xs font-mono text-white/30 mt-1">
                    R: 0.4
                    <br />
                    G: 0.15
                    <br />
                    B: 0.1
                  </p>
                </div>
                <div>
                  <p className="text-purple-400">X: 0</p>
                  <p className="text-xs font-mono text-white/30 mt-1">
                    R: 0.22
                    <br />
                    G: 0.15
                    <br />
                    B: 0.35
                  </p>
                </div>
                <div>
                  <p className="text-blue-400">X: +120</p>
                  <p className="text-xs font-mono text-white/30 mt-1">
                    R: 0.12
                    <br />
                    G: 0.22
                    <br />
                    B: 0.5
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-black/30 rounded text-xs font-mono text-green-400">
                chromaShift(xNorm) =&gt Color
              </div>
            </div>

            {/* Height Modulation */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Height-Based Luminance
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-full h-8 bg-gradient-to-r from-black via-gray-800 to-white/30 rounded" />
                </div>
                <p className="text-sm text-white/60">
                  Vertex color luminance increases with elevation. Range: [-30,
                  30] maps to luminance offset [0, 0.22].
                </p>
                <div className="text-xs font-mono text-green-400">
                  t = clamp((height + 30) / 60, 0, 1)
                  <br />
                  color.offsetHSL(0, 0, t * 0.22)
                </div>
              </div>
            </div>

            {/* Label Properties */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Label Rendering
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-black/30 rounded">
                  <span className="text-2xl text-white/95">Boston</span>
                  <span className="text-xs text-white/40">
                    sig: 0.9, scale: 24.4
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/30 rounded">
                  <span className="text-lg text-white/70">London</span>
                  <span className="text-xs text-white/40">
                    sig: 0.75, scale: 21.5
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-black/30 rounded">
                  <span className="text-sm text-white/50">Shanghai</span>
                  <span className="text-xs text-white/40">
                    sig: 0.5, scale: 18.0
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/40 mt-3">
                Sprite scale and opacity determined by significance parameter
              </p>
            </div>

            {/* Connection Arcs */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Connection Rendering
              </h3>
              <div className="h-32 bg-black/30 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 200 100" className="w-full h-20">
                  <defs>
                    <linearGradient
                      id="arc-gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.6" />
                      <stop
                        offset="100%"
                        stopColor="#45b7d1"
                        stopOpacity="0.6"
                      />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20 80 Q 100 20 180 80"
                    stroke="url(#arc-gradient)"
                    strokeWidth="2"
                    fill="none"
                  />
                  <circle cx="20" cy="80" r="3" fill="#ff6b6b" />
                  <circle cx="180" cy="80" r="3" fill="#45b7d1" />
                </svg>
              </div>
              <p className="text-sm text-white/60 mt-3">
                CatmullRomCurve3 with midpoint elevation. Multiple line
                instances create thickness.
              </p>
              <div className="text-xs font-mono text-green-400 mt-2">
                curvatureY = remap(deltaTime, 1, 10, 3, 16) * weight
                <br />
                copies = round(weight * 5)
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Implementation */}
        <section className="space-y-8 pb-16" id="implementation">
          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-extralight text-white/20">05</span>
            <h2 className="text-3xl font-light">Implementation Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Module Structure */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Module Architecture
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">schema.ts</p>
                    <p className="text-xs text-white/40">
                      Type definitions, interfaces
                    </p>
                  </div>
                </div>
                <div className="w-0.5 h-4 bg-white/20 ml-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">featureMapping.ts</p>
                    <p className="text-xs text-white/40">
                      Parameter transformation
                    </p>
                  </div>
                </div>
                <div className="w-0.5 h-4 bg-white/20 ml-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">terrainEngine.ts</p>
                    <p className="text-xs text-white/40">Mesh generation</p>
                  </div>
                </div>
                <div className="w-0.5 h-4 bg-white/20 ml-4" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">TopographyScene.tsx</p>
                    <p className="text-xs text-white/40">Three.js rendering</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dependencies */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-medium text-white/90 mb-4">
                Dependencies
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-black/30 rounded flex justify-between items-center">
                  <span className="text-sm text-white/80">Runtime</span>
                  <span className="text-sm font-mono text-blue-400">
                    Next.js 14
                  </span>
                </div>
                <div className="p-3 bg-black/30 rounded flex justify-between items-center">
                  <span className="text-sm text-white/80">3D Library</span>
                  <span className="text-sm font-mono text-purple-400">
                    three@0.159
                  </span>
                </div>
                <div className="p-3 bg-black/30 rounded flex justify-between items-center">
                  <span className="text-sm text-white/80">Noise</span>
                  <span className="text-sm font-mono text-green-400">
                    Custom impl
                  </span>
                </div>
                <div className="p-3 bg-black/30 rounded flex justify-between items-center">
                  <span className="text-sm text-white/80">Types</span>
                  <span className="text-sm font-mono text-yellow-400">
                    TypeScript 5
                  </span>
                </div>
                <div className="p-3 bg-black/30 rounded flex justify-between items-center">
                  <span className="text-sm text-white/80">Styles</span>
                  <span className="text-sm font-mono text-cyan-400">
                    Tailwind 3
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 mt-8">
            <h3 className="text-lg font-medium text-white/90 mb-4">
              Performance Characteristics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-light text-white/90">220×220</p>
                <p className="text-xs text-white/40">Mesh resolution</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light text-white/90">48,400</p>
                <p className="text-xs text-white/40">Vertices</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light text-white/90">96,800</p>
                <p className="text-xs text-white/40">Triangles</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-light text-white/90">1.35</p>
                <p className="text-xs text-white/40">Exaggeration factor</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-black/30 rounded">
              <p className="text-xs text-white/50">
                Single PlaneGeometry instance. Vertex colors reduce draw calls.
                No instancing required. OrbitControls with damping factor 0.07.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 pt-12 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-light text-white/80 mb-3">
                Parameter Space
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                All terrain features derive from input parameters. Modification
                of any signal value triggers automatic recalculation through the
                mapping pipeline. No manual adjustments required.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-light text-white/80 mb-3">
                Extensions
              </h3>
              <ul className="text-sm text-white/50 space-y-1">
                <li>• Normal map generation for enhanced lighting</li>
                <li>• LOD system for distant terrain</li>
                <li>• GPU-based noise calculation via shaders</li>
                <li>• Height-based texture splatting</li>
                <li>• Export to standard 3D formats (GLTF)</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <p className="text-xs text-white/30 text-center">
              Terrain mesh procedurally generated from autobiographical data
              parameters
            </p>
          </div>
        </footer>
      </article>
    </div>
  )
}
