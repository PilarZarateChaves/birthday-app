'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Guest, Child } from '@/types/database'

type View = 'card' | 'mission' | 'complete'

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Smooth Sailing', medium: 'Tricky Waters', hard: 'Legendary' }
const DIFFICULTY_COLOR: Record<string, string> = { easy: '#6b7f5e', medium: '#c9a84c', hard: '#c4622d' }

const SPARKLES = [
  { top: 6,  left: 4,  size: 9,  delay: 0,   dur: 3.3, char: '✦', c: 0 },
  { top: 10, left: 90, size: 8,  delay: 0.6,  dur: 2.8, char: '·', c: 1 },
  { top: 30, left: 95, size: 11, delay: 1.2,  dur: 4.0, char: '✦', c: 2 },
  { top: 60, left: 2,  size: 9,  delay: 0.8,  dur: 3.6, char: '✦', c: 0 },
  { top: 75, left: 93, size: 10, delay: 1.6,  dur: 3.9, char: '✦', c: 1 },
  { top: 45, left: 97, size: 7,  delay: 0.3,  dur: 2.6, char: '·', c: 0 },
  { top: 88, left: 10, size: 11, delay: 1.0,  dur: 4.4, char: '✦', c: 2 },
  { top: 3,  left: 60, size: 7,  delay: 1.9,  dur: 3.0, char: '·', c: 1 },
  { top: 92, left: 55, size: 8,  delay: 0.4,  dur: 4.1, char: '✦', c: 0 },
  { top: 20, left: 6,  size: 7,  delay: 1.5,  dur: 3.2, char: '·', c: 2 },
]
const COLORS = ['var(--gold)', 'var(--terracotta)', 'var(--sage)']

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
      if (g?.mission_status !== 'in_progress') setView('complete')
    })
  }, [guestId])

  async function markComplete() {
    await supabase.from('guests').update({ mission_status: 'submitted' }).eq('id', guestId)
    setGuest(g => g ? { ...g, mission_status: 'submitted' } : g)
    setView('complete')
  }

  if (loading) return (
    <main className="min-h-screen" style={{ background: 'var(--plum)' }} />
  )

  if (!guest) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--plum)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.4 }}>Membership not found.</p>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative" style={{ background: 'var(--plum)' }}>
      {/* Warm glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: [
          'radial-gradient(ellipse at 40% 10%, rgba(201,168,76,0.16) 0%, transparent 50%)',
          'radial-gradient(ellipse at 65% 90%, rgba(196,98,45,0.09) 0%, transparent 50%)',
        ].join(', '),
      }} />

      {/* Floating sparkles */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            fontSize: s.size,
            color: COLORS[s.c],
            animation: `twinkle ${s.dur}s ease-in-out infinite ${s.delay}s, floatBob ${s.dur * 1.2}s ease-in-out infinite ${s.delay * 0.7}s`,
          }}
        >
          {s.char}
        </span>
      ))}

      <div className="max-w-sm w-full relative z-10">
        <AnimatePresence mode="wait">

          {/* Membership Card View */}
          {view === 'card' && (
            <motion.div
              key="card"
              initial={{ opacity: 0, scale: 0.9, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs tracking-[0.4em] uppercase text-center mb-7"
                style={{ color: 'var(--gold)', opacity: 0.65 }}
              >
                Welcome aboard
              </motion.p>

              {/* Cream membership card */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl overflow-hidden mb-5"
                style={{
                  background: 'var(--card-cream)',
                  boxShadow: '0 28px 70px rgba(10,4,16,0.55), 0 4px 16px rgba(201,168,76,0.2)',
                }}
              >
                {/* Card top ribbon */}
                <div style={{
                  height: 6,
                  background: 'linear-gradient(90deg, #c4622d 0%, #c9a84c 30%, #6b7f5e 60%, #c9a84c 80%, #c4622d 100%)',
                }} />

                {/* Card header */}
                <div className="px-6 pt-5 pb-1 flex items-center justify-between">
                  <p style={{ color: 'rgba(201,168,76,0.6)', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
                    Royal Gondolieri Society
                  </p>
                  <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 14 }}>⚓</span>
                </div>

                {/* Photo + role */}
                <div className="px-6 pt-4 pb-5 text-center">
                  {guest.photo ? (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden" style={{
                      border: '3px solid rgba(201,168,76,0.6)',
                      boxShadow: '0 4px 16px rgba(201,168,76,0.25)',
                    }}>
                      <img src={guest.photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold" style={{
                      background: 'rgba(201,168,76,0.1)',
                      border: '3px solid rgba(201,168,76,0.4)',
                      color: 'var(--gold)',
                      boxShadow: '0 4px 16px rgba(201,168,76,0.15)',
                    }}>
                      {guest.name[0]}
                    </div>
                  )}

                  <p className="font-semibold text-lg mb-0.5" style={{ color: 'var(--navy)', fontFamily: "'Playfair Display', serif" }}>
                    {guest.name}
                  </p>

                  {guest.role_name ? (
                    <>
                      <p style={{ color: 'rgba(26,39,68,0.45)', fontSize: '0.62rem', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10 }}>
                        Society Member
                      </p>
                      <div className="inline-block px-4 py-1.5 rounded-full mb-3" style={{
                        background: 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.35)',
                      }}>
                        <p style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {guest.role_name}
                        </p>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(26,39,68,0.55)', fontStyle: 'italic' }}>
                        {guest.role_description}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'rgba(26,39,68,0.35)' }}>
                      The host will assign your role shortly.
                    </p>
                  )}
                </div>

                {/* Card footer */}
                <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(26,39,68,0.07)' }}>
                  <p style={{ color: 'rgba(26,39,68,0.3)', fontSize: '0.58rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Membership Card</p>
                  <p style={{ color: 'rgba(26,39,68,0.3)', fontSize: '0.58rem', letterSpacing: '0.15em' }}>2026</p>
                </div>

                {/* Bottom ribbon */}
                <div style={{
                  height: 4,
                  background: 'linear-gradient(90deg, #6b7f5e 0%, #c9a84c 40%, #c4622d 70%, #c9a84c 90%, #6b7f5e 100%)',
                }} />
              </motion.div>

              {/* Children */}
              {children.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mb-5">
                  {children.map(child => (
                    <div key={child.id} className="rounded-2xl px-4 py-3 mb-2 flex items-center gap-3" style={{
                      background: 'rgba(253,246,227,0.04)',
                      border: '1px solid rgba(201,168,76,0.15)',
                    }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{
                        background: 'rgba(201,168,76,0.12)',
                        color: 'var(--gold)',
                      }}>
                        {child.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--cream)' }}>
                          {child.name} <span style={{ opacity: 0.35 }}>({child.age})</span>
                        </p>
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
                  transition={{ delay: 0.8 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setView('mission')}
                  className="w-full py-4 rounded-2xl font-semibold text-sm uppercase"
                  style={{
                    background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)',
                    color: 'var(--navy)',
                    letterSpacing: '0.15em',
                    boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
                  }}
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
                    key="sealed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.88 }}
                    className="text-center"
                  >
                    <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: 'var(--gold)', opacity: 0.65 }}>
                      Classified
                    </p>

                    {/* Wax seal */}
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="w-20 h-20 rounded-full mx-auto mb-7 flex items-center justify-center text-2xl"
                      style={{
                        background: 'radial-gradient(circle at 35% 35%, #dd4444, #8b1a1a)',
                        boxShadow: '0 6px 24px rgba(139,26,26,0.5), inset 0 -3px 6px rgba(0,0,0,0.35)',
                      }}
                    >
                      ⚓
                    </motion.div>

                    <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontStyle: 'italic', lineHeight: 1.85, marginBottom: '2.5rem', opacity: 0.8 }}>
                      The Society has entrusted you<br />with a secret mission.<br /><br />
                      Do not tell anyone.<br />
                      Do not act suspicious.<br />
                      The Captain must never know.
                    </p>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEnvelopeOpen(true)}
                      className="w-full py-5 rounded-2xl font-semibold text-sm uppercase"
                      style={{
                        background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)',
                        color: 'var(--navy)',
                        letterSpacing: '0.15em',
                        boxShadow: '0 6px 24px rgba(201,168,76,0.4)',
                      }}
                    >
                      Break the Seal
                    </motion.button>

                    <button
                      onClick={() => setView('card')}
                      className="w-full py-3 mt-2 text-xs"
                      style={{ color: 'rgba(253,246,227,0.22)' }}
                    >
                      ← Back to card
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mission-open"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="text-xs tracking-[0.4em] uppercase mb-6 text-center" style={{ color: 'var(--gold)', opacity: 0.65 }}>
                      Your orders
                    </p>

                    {/* Mission card — cream, like a physical mission brief */}
                    <div className="rounded-3xl overflow-hidden mb-4" style={{
                      background: 'var(--card-cream)',
                      boxShadow: '0 20px 56px rgba(10,4,16,0.5), 0 4px 16px rgba(201,168,76,0.15)',
                    }}>
                      <div style={{
                        height: 5,
                        background: 'linear-gradient(90deg, #c4622d, #c9a84c, #6b7f5e)',
                      }} />

                      <div className="px-6 pt-6 pb-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <p style={{ color: 'var(--navy)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.3 }}>
                            {guest.mission_title}
                          </p>
                          {guest.mission_difficulty && (
                            <span className="text-xs px-3 py-1 rounded-full flex-shrink-0 mt-0.5 font-medium" style={{
                              background: DIFFICULTY_COLOR[guest.mission_difficulty] + '18',
                              color: DIFFICULTY_COLOR[guest.mission_difficulty],
                              border: `1px solid ${DIFFICULTY_COLOR[guest.mission_difficulty]}55`,
                            }}>
                              {DIFFICULTY_LABEL[guest.mission_difficulty]}
                            </span>
                          )}
                        </div>

                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(26,39,68,0.75)', lineHeight: 1.8 }}>
                          {guest.mission_instructions}
                        </p>

                        {guest.proof_required && (
                          <div className="mt-4 flex items-center gap-2">
                            <span style={{ fontSize: 14 }}>📸</span>
                            <p className="text-xs" style={{ color: 'rgba(201,168,76,0.7)' }}>
                              Proof required · {guest.proof_type}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(26,39,68,0.07)' }}>
                        <p className="text-xs text-center" style={{ color: 'rgba(26,39,68,0.3)', fontStyle: 'italic' }}>
                          Do not share this with anyone.
                        </p>
                      </div>

                      <div style={{
                        height: 4,
                        background: 'linear-gradient(90deg, #6b7f5e, #c9a84c, #c4622d)',
                      }} />
                    </div>

                    {guest.mission_status === 'in_progress' && (
                      guest.proof_required ? (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => router.push(`/guest/${guestId}/submit`)}
                          className="w-full py-4 rounded-2xl font-semibold text-sm uppercase"
                          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)', color: 'var(--navy)', letterSpacing: '0.15em', boxShadow: '0 6px 24px rgba(201,168,76,0.35)' }}
                        >
                          Submit Proof
                        </motion.button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={markComplete}
                          className="w-full py-4 rounded-2xl font-semibold text-sm uppercase"
                          style={{ background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)', color: 'var(--navy)', letterSpacing: '0.15em', boxShadow: '0 6px 24px rgba(201,168,76,0.35)' }}
                        >
                          Mission Complete
                        </motion.button>
                      )
                    )}

                    <button
                      onClick={() => setView('card')}
                      className="w-full py-3 mt-2 text-xs"
                      style={{ color: 'rgba(253,246,227,0.22)' }}
                    >
                      ← Back to card
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Complete state */}
          {view === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs tracking-[0.4em] uppercase mb-6"
                style={{ color: 'var(--gold)', opacity: 0.7 }}
              >
                {guest.mission_status === 'approved' ? 'Mission Approved' : 'Mission Submitted'}
              </motion.p>

              {/* Compact cream card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl px-5 py-4 mb-7 flex items-center gap-4"
                style={{
                  background: 'var(--card-cream)',
                  boxShadow: '0 8px 32px rgba(10,4,16,0.4), 0 2px 8px rgba(201,168,76,0.15)',
                }}
              >
                {guest.photo ? (
                  <img src={guest.photo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid rgba(201,168,76,0.5)' }} />
                ) : (
                  <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg" style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)' }}>
                    {guest.name[0]}
                  </div>
                )}
                <div className="text-left">
                  <p className="font-semibold text-sm" style={{ color: 'var(--navy)', fontFamily: "'Playfair Display', serif" }}>{guest.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--gold)', opacity: 0.8 }}>{guest.role_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(26,39,68,0.45)' }}>
                    {guest.mission_status === 'approved' ? '🏆 Approved' : '🟢 Awaiting approval'}
                  </p>
                </div>
              </motion.div>

              {!guest.memory_appreciation ? (
                <>
                  <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontStyle: 'italic', opacity: 0.75, marginBottom: '2rem', lineHeight: 1.8 }}>
                    One final request<br />from The Society.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => router.push(`/guest/${guestId}/memory`)}
                    className="w-full py-4 rounded-2xl font-semibold text-sm uppercase"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)', color: 'var(--navy)', letterSpacing: '0.15em', boxShadow: '0 6px 24px rgba(201,168,76,0.35)' }}
                  >
                    Leave a note for the Captain
                  </motion.button>
                </>
              ) : (
                <div className="rounded-2xl px-5 py-4" style={{ background: 'rgba(107,127,94,0.12)', border: '1px solid rgba(107,127,94,0.3)' }}>
                  <p className="text-sm" style={{ color: '#a8c99a' }}>Your words are in the newspaper. 🗞️</p>
                </div>
              )}

              {guest.mission_title && (
                <button
                  onClick={() => { setView('mission'); setEnvelopeOpen(true) }}
                  className="w-full py-3 mt-4 text-xs"
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
