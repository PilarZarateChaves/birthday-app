'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <div className="text-center max-w-sm w-full">
        <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--gold)' }}>
          Est. 2026
        </p>
        <h1 className="font-display text-4xl font-bold mb-2 leading-tight" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          The Royal<br />Gondolieri Society
        </h1>
        <p className="text-sm mt-4 mb-10" style={{ color: 'var(--cream)', opacity: 0.6 }}>
          A secret society for special occasions.
        </p>
        <button
          onClick={() => router.push('/host')}
          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all active:scale-95"
          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
        >
          Host a Party
        </button>
      </div>
    </main>
  )
}
