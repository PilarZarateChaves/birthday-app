'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import type { Party, Guest } from '@/types/database'

export default function BirthdayNewspaper({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = use(params)
  const [party, setParty] = useState<Party | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('parties').select('*').eq('id', partyId).single(),
      supabase.from('guests').select('*').eq('party_id', partyId).not('name', 'eq', ''),
    ]).then(([{ data: p }, { data: g }]) => {
      setParty(p)
      setGuests((g ?? []).filter(x => !x.email.includes('@gondolieri.local')))
      setLoading(false)
    })
  }, [partyId])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#f5f0e8' }}>
      <p style={{ color: '#1a2744', opacity: 0.4 }}>Printing the newspaper…</p>
    </main>
  )

  if (!party) return null

  const approvedGuests = guests.filter(g => g.mission_status === 'approved')
  const photoGuests = guests.filter(g => g.submission_url)
  const memoriesGuests = guests.filter(g => g.memory_appreciation)
  const appreciations = memoriesGuests.map(g => ({ name: g.name, text: g.memory_appreciation! }))
  const moments = memoriesGuests.map(g => ({ name: g.name, text: g.memory_favorite_moment! }))
  const predictions = memoriesGuests.map(g => ({ name: g.name, text: g.memory_future_prediction! }))

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: '#f5f0e8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="max-w-2xl mx-auto">
        {/* Front page */}
        <div className="text-center border-b-4 pb-6 mb-8" style={{ borderColor: '#1a2744' }}>
          <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: '#c9a84c' }}>
            The Royal Gondolieri Society · Classified Report
          </p>
          <h1 className="text-4xl font-bold mb-1 leading-tight" style={{ color: '#1a2744', fontFamily: "'Playfair Display', serif" }}>
            {party.party_title}
          </h1>
          <p className="text-sm" style={{ color: '#1a2744', opacity: 0.5 }}>
            {new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex-1 h-px" style={{ background: '#1a2744', opacity: 0.15 }} />
            <span className="text-xl">⚓</span>
            <div className="flex-1 h-px" style={{ background: '#1a2744', opacity: 0.15 }} />
          </div>
        </div>

        {/* Mission report */}
        {approvedGuests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1a2744', fontFamily: "'Playfair Display', serif" }}>
              Mission Report
            </h2>
            <div className="flex flex-col gap-3">
              {approvedGuests.map(g => (
                <div key={g.id} className="rounded-2xl p-4" style={{ background: 'white' }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#c9a84c' }}>{g.role_name}</p>
                  <p className="font-semibold text-sm mb-1" style={{ color: '#1a2744' }}>{g.name} — {g.mission_title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#1a2744', opacity: 0.7 }}>
                    {g.mission_instructions?.slice(0, 120)}…
                  </p>
                  {g.submission_note && (
                    <p className="text-xs mt-2 italic" style={{ color: '#6b7f5e' }}>"{g.submission_note}"</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Evidence wall */}
        {photoGuests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#1a2744', fontFamily: "'Playfair Display', serif" }}>
              Evidence Wall
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {photoGuests.map(g => (
                <div key={g.id} className="rounded-2xl overflow-hidden relative">
                  {g.submission_url && (
                    <>
                      <img src={g.submission_url} alt="" className="w-full object-cover" style={{ height: 160 }} />
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ background: 'linear-gradient(transparent, rgba(26,39,68,0.8))' }}>
                        <p className="text-xs text-white font-medium">{g.name}</p>
                        <p className="text-xs text-white opacity-60">{g.role_name}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Messages for Isaac */}
        {memoriesGuests.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-6" style={{ color: '#1a2744', fontFamily: "'Playfair Display', serif" }}>
              Messages for Isaac
            </h2>

            {appreciations.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#c9a84c' }}>What we appreciate about you</p>
                {appreciations.map((a, i) => (
                  <div key={i} className="rounded-2xl p-4 mb-2" style={{ background: 'white' }}>
                    <p className="text-sm leading-relaxed mb-1" style={{ color: '#1a2744' }}>"{a.text}"</p>
                    <p className="text-xs" style={{ color: '#1a2744', opacity: 0.4 }}>— {a.name}</p>
                  </div>
                ))}
              </div>
            )}

            {moments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#c9a84c' }}>Favorite moments</p>
                {moments.map((m, i) => (
                  <div key={i} className="rounded-2xl p-4 mb-2" style={{ background: 'white' }}>
                    <p className="text-sm leading-relaxed mb-1" style={{ color: '#1a2744' }}>"{m.text}"</p>
                    <p className="text-xs" style={{ color: '#1a2744', opacity: 0.4 }}>— {m.name}</p>
                  </div>
                ))}
              </div>
            )}

            {predictions.length > 0 && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#c9a84c' }}>Predictions for your future</p>
                {predictions.map((p, i) => (
                  <div key={i} className="rounded-2xl p-4 mb-2" style={{ background: 'white' }}>
                    <p className="text-sm leading-relaxed mb-1" style={{ color: '#1a2744' }}>"{p.text}"</p>
                    <p className="text-xs" style={{ color: '#1a2744', opacity: 0.4 }}>— {p.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <div className="text-center pt-6 border-t" style={{ borderColor: '#1a2744', opacity: 0.2 }}>
          <p className="text-xs tracking-widest uppercase" style={{ color: '#1a2744', opacity: 0.4 }}>
            The Royal Gondolieri Society · {party.party_date}
          </p>
        </div>
      </div>
    </main>
  )
}
