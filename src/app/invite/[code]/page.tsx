'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase.from('parties').select('*').eq('invite_code', code).single()
      .then(({ data }) => {
        if (data) setParty(data)
        else setNotFound(true)
      })
  }, [code])

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.5 }}>Invitation not found.</p>
    </main>
  )

  if (!party) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.4 }}>Loading…</p>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--navy)' }}>
      <div className="max-w-sm w-full text-center">
        {/* Crest / emblem */}
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl" style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid var(--gold)' }}>
          ⚓
        </div>

        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--gold)' }}>
          You have been summoned
        </p>
        <h1 className="text-3xl font-bold mb-2 leading-tight" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          {party.party_title}
        </h1>
        <p className="text-sm mb-1" style={{ color: 'var(--cream)', opacity: 0.6 }}>
          In honor of {party.birthday_person_name}
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--cream)', opacity: 0.4 }}>
          {new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        {party.host_notes && (
          <div className="rounded-2xl p-4 mb-8 text-left" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-xs tracking-wider uppercase mb-2" style={{ color: 'var(--gold)' }}>From the host</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.8 }}>{party.host_notes}</p>
          </div>
        )}

        <button
          onClick={() => router.push(`/join/${code}`)}
          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all"
          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
        >
          Join the Voyage
        </button>
      </div>
    </main>
  )
}
