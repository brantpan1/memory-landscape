'use client'

import dynamic from 'next/dynamic'

const MemoryLandscape = dynamic(() => import('@/components/MemoryLandscape'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black">
      <p className="text-white/50 uppercase tracking-widest text-sm">
        Loading terrain...
      </p>
    </div>
  ),
})

export default function Home() {
  return <MemoryLandscape />
}
