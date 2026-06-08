'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Guest, Child } from '@/types/database'

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#6b7f5e',
  medium: '#c9a84c',
  hard: '#c4622d',
}

export default function GuestPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = use(params)
  const router = useRouter()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [missionRevealed, setMissionRevealed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('guests').select('*').eq('id', guestId).single(),
      supabase.from('children').select('*').eq('guest_id', guestId),
    ]).then(([{ data: g }, { data: c }]) => {
      setGuest(g)
      setChildren(c ?? [])
      setLoading(false)
    })
  }, [guestId])

  async function markComplete() {
    await supabase.from('guests').update({ mission_status: 'submitted' }).eq('id', guestId)
    setGuest(g => g ? { ...g, mission_status: 'submitted' } : g)
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.4 }}>Loading…</p>
    </main>
  )

  if (!guest) return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.5 }}>Guest not found.</p>
    </main>
  )

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: 'var(--navy)' }}>
      <div className="max-w-sm mx-auto">
        {/* Character Card */}
        <div className="rounded-3xl overflow-hidden mb-6" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <div className="px-6 pt-6 pb-4">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 text-center" style={{ color: 'var(--gold)' }}>
              Royal Gondolieri Society
            </p>
            <div className="flex flex-col items-center gap-3">
              {guest.photo
                ? <img src={guest.photo} alt="" className="w-20 h-20 rounded-full object-cover" style={{ border: '2px solid var(--gold)' }} />
                : <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>{guest.name[0]}</div>
              }
              <div className="text-center">
                <p className="font-semibold text-lg" style={{ color: 'var(--cream)' }}>{guest.name}</p>
                {guest.role_name && (
                  <p className="text-sm mt-1" style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
                    {guest.role_name}
                  </p>
                )}
              </div>
            </div>
            {guest.role_description && (
              <p className="text-sm text-center mt-4 leading-relaxed" style={{ color: 'var(--cream)', opacity: 0.7 }}>
                {guest.role_description}
              </p>
            )}
          </div>

          {/* Mission status banner */}
          {guest.mission_status === 'approved' && (
            <div className="px-6 py-3 text-center text-sm font-semibold" style={{ background: 'rgba(107,127,94,0.3)', color: '#a8c99a' }}>
              🏆 Mission Approved
            </div>
          )}
          {guest.mission_status === 'submitted' && (
            <div className="px-6 py-3 text-center text-sm" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--cream)', opacity: 0.6 }}>
              🟢 Submitted — awaiting approval
            </div>
          )}
        </div>

        {/* Children cards */}
        {children.length > 0 && (
          <div className="mb-6">
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--gold)' }}>Your Crew</p>
            {children.map(child => (
              <div key={child.id} className="rounded-2xl px-4 py-3 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{child.name} <span style={{ opacity: 0.4 }}>({child.age})</span></p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--gold)' }}>{child.role_name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--cream)', opacity: 0.6 }}>{child.role_description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Mission section */}
        {guest.mission_title && (
          <div className="mb-6">
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--gold)' }}>Your Secret Mission</p>

            {!missionRevealed ? (
              <div
                className="rounded-3xl p-8 text-center cursor-pointer active:scale-95 transition-all"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px dashed var(--gold)' }}
                onClick={() => setMissionRevealed(true)}
              >
                <p className="text-3xl mb-3">🔒</p>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--cream)' }}>Classified</p>
                <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.5 }}>Tap to reveal your mission</p>
              </div>
            ) : (
              <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
                      {guest.mission_title}
                    </p>
                    {guest.mission_difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: DIFFICULTY_COLOR[guest.mission_difficulty] + '33', color: DIFFICULTY_COLOR[guest.mission_difficulty] }}>
                        {guest.mission_difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--cream)', opacity: 0.8 }}>
                    {guest.mission_instructions}
                  </p>
                  {guest.proof_required && (
                    <p className="text-xs mb-1" style={{ color: 'var(--gold)' }}>
                      📸 Proof required ({guest.proof_type})
                    </p>
                  )}
                  <p className="text-xs italic" style={{ color: 'var(--cream)', opacity: 0.4 }}>
                    Do not tell anyone your mission.
                  </p>
                </div>

                {guest.mission_status === 'in_progress' && (
                  <div className="px-5 pb-5 flex flex-col gap-2">
                    {guest.proof_required ? (
                      <button
                        onClick={() => router.push(`/guest/${guestId}/submit`)}
                        className="w-full py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all"
                        style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                      >
                        Submit Proof
                      </button>
                    ) : (
                      <button
                        onClick={markComplete}
                        className="w-full py-3 rounded-2xl font-semibold text-sm active:scale-95 transition-all"
                        style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                      >
                        I completed my mission
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Memory capsule CTA */}
        {(guest.mission_status === 'submitted' || guest.mission_status === 'approved') && !guest.memory_appreciation && (
          <button
            onClick={() => router.push(`/guest/${guestId}/memory`)}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            Add to Isaac's Birthday Newspaper ✍️
          </button>
        )}

        {guest.memory_appreciation && (
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(107,127,94,0.15)', border: '1px solid rgba(107,127,94,0.3)' }}>
            <p className="text-sm" style={{ color: '#a8c99a' }}>✅ Your words are in the newspaper.</p>
          </div>
        )}
      </div>
    </main>
  )
}
