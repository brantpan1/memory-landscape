'use client'

import React from 'react'
import type { MappedLocation } from '@/lib/featureMapping'

export default function MemoryHUD({ selected }: { selected?: MappedLocation }) {
  if (!selected) return null
  return (
    <div className="pointer-events-none text-xs leading-5 space-y-1">
      <div className="uppercase tracking-widest text-white/60">
        Data → Features
      </div>
      <div className="text-white/80">
        <div>
          <span className="text-white/40">id:</span> {selected.id}
        </div>
        <div>
          <span className="text-white/40">pos:</span>{' '}
          {selected.pos.x.toFixed(1)}, {selected.pos.y.toFixed(1)},{' '}
          {selected.pos.z.toFixed(1)}
        </div>
        <div>
          <span className="text-white/40">elevationBias:</span>{' '}
          {selected.elevationBias.toFixed(2)}
        </div>
        <div>
          <span className="text-white/40">amplitude:</span>{' '}
          {selected.amplitude.toFixed(2)}
        </div>
        <div>
          <span className="text-white/40">roughness:</span>{' '}
          {selected.roughness.toFixed(2)}
        </div>
        <div>
          <span className="text-white/40">erosion:</span>{' '}
          {selected.erosion.toFixed(2)}
        </div>
        <div>
          <span className="text-white/40">ridgeFactor:</span>{' '}
          {selected.ridgeFactor.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
