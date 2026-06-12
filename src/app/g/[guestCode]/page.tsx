'use client'

import { useEffect, useState, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest } from '@/types/database'

const DIFF_COLOR: Record<string, string> = { easy: '#6b7f5e', medium: '#c9a84c', hard: '#c4622d' }

export default function GuestInvite({ params }: { params: Promise<{ guestCode: string }> }) {
  const { guestCode } = use(params)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [party, setParty] = useState<Party | null>(null)
  const [missionOpen, setMissionOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('guests')
      .select('*, parties(*)')
      .eq('invite_code', guestCode)
      .single()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return }
        setGuest(data as Guest)
        setParty((data as unknown as { parties: Party }).parties)
        setLoading(false)
      })
  }, [guestCode])

  if (loading) return <main className="min-h-screen" style={{ background: '#0f1a30' }} />

  if (notFound || !guest || !party) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f1a30' }}>
      <p style={{ color: 'rgba(253,246,227,0.3)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
        This invitation could not be found.
      </p>
    </main>
  )

  const partyDate = new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const notes = Array.isArray(party.event_notes) ? party.event_notes : []
  const links = Array.isArray(party.event_links) ? party.event_links : []

  return (
    <main className="min-h-screen px-5 py-14 relative overflow-hidden" style={{ background: '#0f1a30' }}>
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% -10%, rgba(201,168,76,0.09) 0%, transparent 65%)',
      }} />

      <div className="max-w-sm mx-auto relative z-10">

        {/* 1. Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <p className="text-xs tracking-[0.4em] uppercase mb-5" style={{ color: 'rgba(201,168,76,0.6)' }}>
            The Royal Gondolieri Society
          </p>

          {guest.photo ? (
            <div className="w-20 h-20 rounded-full mx-auto mb-5 overflow-hidden" style={{ border: '2px solid rgba(201,168,76,0.4)', boxShadow: '0 0 30px rgba(201,168,76,0.12)' }}>
              <img src={guest.photo} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl font-bold" style={{ background: 'rgba(201,168,76,0.12)', border: '2px solid rgba(201,168,76,0.3)', color: 'var(--gold)' }}>
              {guest.name[0]}
            </div>
          )}

          <p className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: 'rgba(253,246,227,0.35)' }}>
            An invitation for
          </p>
          <h1 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '1rem' }}>
            {guest.name}
          </h1>

          <div className="flex items-center justify-center gap-3 mb-6" style={{ color: 'rgba(201,168,76,0.3)' }}>
            <div style={{ height: 1, width: 28, background: 'currentColor' }} />
            <span style={{ fontSize: 10 }}>◆</span>
            <div style={{ height: 1, width: 28, background: 'currentColor' }} />
          </div>
        </motion.div>

        {/* 2. Party story */}
        {party.party_story && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-center mb-10"
          >
            <p style={{ color: 'rgba(253,246,227,0.72)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.85 }}>
              {party.party_story}
            </p>
          </motion.div>
        )}

        {/* 3. Event details */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="rounded-2xl px-5 py-5 mb-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: 'rgba(201,168,76,0.55)' }}>When & Where</p>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 16, marginTop: 1 }}>📅</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{partyDate}</p>
                {party.event_time && <p className="text-xs mt-0.5" style={{ color: 'rgba(253,246,227,0.45)' }}>{party.event_time}</p>}
              </div>
            </div>
            {party.event_location && (
              <div className="flex items-start gap-3">
                <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 16, marginTop: 1 }}>📍</span>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.75)' }}>{party.event_location}</p>
              </div>
            )}
            {party.meeting_point && (
              <div className="flex items-start gap-3">
                <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 16, marginTop: 1 }}>🚢</span>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.75)' }}>{party.meeting_point}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 4. Role card */}
        {guest.role_name && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="rounded-3xl overflow-hidden mb-8"
            style={{
              background: 'linear-gradient(145deg, #1e3058 0%, #152238 100%)',
              border: '1px solid rgba(201,168,76,0.25)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
            }}
          >
            <div className="px-6 pt-5 pb-2 flex items-center justify-between">
              <p style={{ color: 'rgba(201,168,76,0.45)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Society Member
              </p>
              <span style={{ color: 'rgba(201,168,76,0.3)', fontSize: 13 }}>⚓</span>
            </div>
            <div className="px-6 pb-6 text-center">
              <div className="inline-block px-4 py-1.5 rounded-full mb-3" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <p style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {guest.role_name}
                </p>
              </div>
              {guest.role_description && (
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.6)', fontStyle: 'italic' }}>
                  {guest.role_description}
                </p>
              )}
            </div>
            <div className="px-6 py-3 flex justify-between" style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
              <p style={{ color: 'rgba(201,168,76,0.25)', fontSize: '0.55rem', letterSpacing: '0.18em' }}>MEMBERSHIP CARD</p>
              <p style={{ color: 'rgba(201,168,76,0.25)', fontSize: '0.55rem', letterSpacing: '0.18em' }}>2026</p>
            </div>
          </motion.div>
        )}

        {/* 5. Mission — inline reveal */}
        {guest.mission_title && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mb-8"
          >
            <AnimatePresence mode="wait">
              {!missionOpen ? (
                <motion.button
                  key="seal"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setMissionOpen(true)}
                  className="w-full rounded-3xl px-6 py-7 text-center active:scale-95 transition-all cursor-pointer"
                  style={{ background: 'rgba(201,168,76,0.07)', border: '1px dashed rgba(201,168,76,0.25)' }}
                >
                  <p className="text-3xl mb-3">🔏</p>
                  <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Your sealed orders await.
                  </p>
                  <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(201,168,76,0.5)' }}>
                    Tap to open
                  </p>
                </motion.button>
              ) : (
                <motion.div
                  key="mission"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="rounded-3xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="px-5 pt-5 pb-2">
                    <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: 'rgba(201,168,76,0.55)' }}>Your mission</p>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.35 }}>
                        {guest.mission_title}
                      </p>
                      {guest.mission_difficulty && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium" style={{
                          background: DIFF_COLOR[guest.mission_difficulty] + '22',
                          color: DIFF_COLOR[guest.mission_difficulty],
                          border: `1px solid ${DIFF_COLOR[guest.mission_difficulty]}44`,
                        }}>
                          {guest.mission_difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.72)', lineHeight: 1.8 }}>
                      {guest.mission_instructions}
                    </p>
                    {guest.proof_required && (
                      <p className="text-xs mt-3" style={{ color: 'rgba(201,168,76,0.6)' }}>
                        📸 Proof required · {guest.proof_type}
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-xs text-center italic" style={{ color: 'rgba(253,246,227,0.2)' }}>
                      Do not share this with anyone.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* 6. Host notes */}
        {notes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="rounded-2xl px-5 py-5 mb-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>Good to know</p>
            <div className="flex flex-col gap-3">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-3">
                  {note.icon && <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>{note.icon}</span>}
                  <div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.7)' }}>{note.text}</p>
                    {note.link && (
                      <a href={note.link} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-0.5 block" style={{ color: 'rgba(201,168,76,0.6)' }}>
                        Open link →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 7. Links */}
        {links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.62 }}
            className="flex flex-col gap-2 mb-8"
          >
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all active:scale-95"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: 'var(--gold)', textDecoration: 'none' }}
              >
                <span className="text-sm font-medium">{link.label}</span>
                <span style={{ opacity: 0.5, fontSize: 12 }}>↗</span>
              </a>
            ))}
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="text-center"
        >
          <p style={{ color: 'rgba(253,246,227,0.15)', fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            The Royal Gondolieri Society · {party.party_date}
          </p>
        </motion.div>
      </div>
    </main>
  )
}
