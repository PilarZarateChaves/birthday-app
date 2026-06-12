'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Guest, Child } from '@/types/database'

type View = 'card' | 'mission' | 'complete'

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }
const DIFFICULTY_COLOR: Record<string, string> = { easy: '#6b7f5e', medium: '#c9a84c', hard: '#c4622d' }

export default function GuestPage({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = use(params)
  const router = useRouter()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [view, setView] = useState<View>('card')
  const [envelopeOpen, setEnvelopeOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('guests').select('*').eq('id', guestId).single(),
      supabase.from('children').select('*').eq('guest_id', guestId),
    ]).then(([{ data: g }, { data: c }]) => {
      setGuest(g)
      setChildren(c ?? [])
      setLoading(false)
      // If they already have a mission status, show mission view
      if (g?.mission_status !== 'in_progress') setView('complete')
    })
  }, [guestId])

  async function markComplete() {
    await supabase.from('guests').update({ mission_status: 'submitted' }).eq('id', guestId)
    setGuest(g => g ? { ...g, mission_status: 'submitted' } : g)
    setView('complete')
  }

  if (loading) return (
    <main className="min-h-screen" style={{ background: '#0f1a30' }} />
  )

  if (!guest) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f1a30' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.4 }}>Membership not found.</p>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative" style={{ background: '#0f1a30' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 60%)',
      }} />

      <div className="max-w-sm w-full relative z-10">
        <AnimatePresence mode="wait">

          {/* Membership Card View */}
          {view === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs tracking-[0.4em] uppercase text-center mb-8"
                style={{ color: 'var(--gold)', opacity: 0.7 }}
              >
                Welcome aboard
              </motion.p>

              {/* The membership card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl overflow-hidden mb-6"
                style={{
                  background: 'linear-gradient(145deg, #1e3058 0%, #152238 100%)',
                  border: '1px solid rgba(201,168,76,0.35)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.2)',
                }}
              >
                {/* Card header */}
                <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                  <p className="text-xs tracking-[0.3em] uppercase" style={{ color: 'rgba(201,168,76,0.6)', fontSize: '0.6rem' }}>
                    Royal Gondolieri Society
                  </p>
                  <span style={{ color: 'rgba(201,168,76,0.4)', fontSize: 14 }}>⚓</span>
                </div>

                {/* Photo + role */}
                <div className="px-6 pt-4 pb-6 text-center">
                  {guest.photo ? (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden" style={{ border: '2px solid rgba(201,168,76,0.5)' }}>
                      <img src={guest.photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold" style={{ background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.4)', color: 'var(--gold)' }}>
                      {guest.name[0]}
                    </div>
                  )}

                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--cream)' }}>{guest.name}</p>

                  {guest.role_name ? (
                    <>
                      <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)', fontSize: '0.65rem' }}>
                        Society Member
                      </p>
                      <div className="inline-block px-4 py-1.5 rounded-full mb-4" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
                        <p style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {guest.role_name}
                        </p>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.55)', fontStyle: 'italic' }}>
                        {guest.role_description}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'rgba(253,246,227,0.3)' }}>
                      The host will assign your role shortly.
                    </p>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                  <p style={{ color: 'rgba(201,168,76,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em' }}>MEMBERSHIP CARD</p>
                  <p style={{ color: 'rgba(201,168,76,0.35)', fontSize: '0.6rem', letterSpacing: '0.15em' }}>2026</p>
                </div>
              </motion.div>

              {/* Children attached to parent */}
              {children.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mb-6">
                  {children.map(child => (
                    <div key={child.id} className="rounded-2xl px-4 py-3 mb-2 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
                        {child.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>{child.name} <span style={{ opacity: 0.35 }}>({child.age})</span></p>
                        <p className="text-xs" style={{ color: 'var(--gold)', opacity: 0.7 }}>{child.role_name}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Mission CTA */}
              {guest.mission_title && (
                <motion.button
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  onClick={() => setView('mission')}
                  className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all"
                  style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                >
                  Reveal My Mission
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Mission Reveal */}
          {view === 'mission' && (
            <motion.div
              key="mission"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <AnimatePresence mode="wait">
                {!envelopeOpen ? (
                  <motion.div
                    key="envelope"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-center"
                  >
                    <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                      Classified
                    </p>
                    <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.8, marginBottom: '2.5rem', opacity: 0.8 }}>
                      The Society has entrusted you<br />with a secret mission.<br /><br />
                      Do not tell anyone.<br />
                      Do not act suspicious.<br />
                      The Captain must never know.
                    </p>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEnvelopeOpen(true)}
                      className="w-full py-5 rounded-2xl font-semibold text-sm tracking-widest uppercase"
                      style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                    >
                      Open Sealed Orders
                    </motion.button>

                    <button
                      onClick={() => setView('card')}
                      className="w-full py-3 mt-2 text-xs"
                      style={{ color: 'rgba(253,246,227,0.25)' }}
                    >
                      ← Back to card
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mission-content"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="text-xs tracking-[0.4em] uppercase mb-6 text-center" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                      Your orders
                    </p>

                    <div className="rounded-3xl overflow-hidden mb-4" style={{
                      background: 'linear-gradient(145deg, #1e3058 0%, #152238 100%)',
                      border: '1px solid rgba(201,168,76,0.25)',
                      boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                    }}>
                      <div className="px-6 pt-6 pb-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3 }}>
                            {guest.mission_title}
                          </p>
                          {guest.mission_difficulty && (
                            <span className="text-xs px-2 py-1 rounded-full flex-shrink-0 mt-0.5 font-medium" style={{
                              background: DIFFICULTY_COLOR[guest.mission_difficulty] + '22',
                              color: DIFFICULTY_COLOR[guest.mission_difficulty],
                              border: `1px solid ${DIFFICULTY_COLOR[guest.mission_difficulty]}44`,
                            }}>
                              {DIFFICULTY_LABEL[guest.mission_difficulty]}
                            </span>
                          )}
                        </div>

                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.75)', lineHeight: 1.8 }}>
                          {guest.mission_instructions}
                        </p>

                        {guest.proof_required && (
                          <div className="mt-4 flex items-center gap-2">
                            <span style={{ color: 'var(--gold)', fontSize: 14 }}>📸</span>
                            <p className="text-xs" style={{ color: 'rgba(201,168,76,0.7)' }}>
                              Proof required · {guest.proof_type}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-xs text-center" style={{ color: 'rgba(253,246,227,0.25)', fontStyle: 'italic' }}>
                          Do not share this with anyone.
                        </p>
                      </div>
                    </div>

                    {guest.mission_status === 'in_progress' && (
                      guest.proof_required ? (
                        <button
                          onClick={() => router.push(`/guest/${guestId}/submit`)}
                          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all"
                          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                        >
                          Submit Proof
                        </button>
                      ) : (
                        <button
                          onClick={markComplete}
                          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all"
                          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                        >
                          Mission Complete
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setView('card')}
                      className="w-full py-3 mt-2 text-xs"
                      style={{ color: 'rgba(253,246,227,0.25)' }}
                    >
                      ← Back to card
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Complete / memory state */}
          {view === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                {guest.mission_status === 'approved' ? 'Mission Approved' : 'Mission Submitted'}
              </p>

              {/* Compact card */}
              <div className="rounded-3xl px-6 py-5 mb-6 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)' }}>
                {guest.photo ? (
                  <img src={guest.photo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid rgba(201,168,76,0.4)' }} />
                ) : (
                  <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>{guest.name[0]}</div>
                )}
                <div className="text-left">
                  <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{guest.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gold)', opacity: 0.7 }}>{guest.role_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(253,246,227,0.35)' }}>
                    {guest.mission_status === 'approved' ? '🏆 Approved' : '🟢 Awaiting approval'}
                  </p>
                </div>
              </div>

              {!guest.memory_appreciation ? (
                <>
                  <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontStyle: 'italic', opacity: 0.7, marginBottom: '2rem', lineHeight: 1.8 }}>
                    One final request<br />from The Society.
                  </p>
                  <button
                    onClick={() => router.push(`/guest/${guestId}/memory`)}
                    className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all"
                    style={{ background: 'var(--gold)', color: 'var(--navy)' }}
                  >
                    Leave a note for the Captain
                  </button>
                </>
              ) : (
                <div className="rounded-2xl px-5 py-4" style={{ background: 'rgba(107,127,94,0.12)', border: '1px solid rgba(107,127,94,0.25)' }}>
                  <p className="text-sm" style={{ color: '#a8c99a' }}>Your words are in the newspaper. 🗞️</p>
                </div>
              )}

              {/* Reveal mission again if they want */}
              {guest.mission_title && (
                <button
                  onClick={() => { setView('mission'); setEnvelopeOpen(true) }}
                  className="w-full py-3 mt-3 text-xs"
                  style={{ color: 'rgba(253,246,227,0.2)' }}
                >
                  Review your mission
                </button>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}
