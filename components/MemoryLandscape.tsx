'use client'

import React, { useState } from 'react'
import TopographyScene from './TopographyScene'
import ProcessDocument from './ProcessDocument'

export default function MemoryLandscape() {
  const [activeTab, setActiveTab] = useState<'topography' | 'process'>(
    'topography',
  )

  return (
    <div className="w-full h-screen bg-black text-white font-sans">
      {/* Tab Navigation */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm border-b border-white/10 pointer-events-none">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('topography')}
              className={`py-4 px-2 text-sm uppercase tracking-widest transition-all pointer-events-auto ${
                activeTab === 'topography'
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Topography
            </button>
            <button
              onClick={() => setActiveTab('process')}
              className={`py-4 px-2 text-sm uppercase tracking-widest transition-all pointer-events-auto ${
                activeTab === 'process'
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Process
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'topography' ? <TopographyScene /> : <ProcessDocument />}
    </div>
  )
}
