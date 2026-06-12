'use client'

import { useEffect, useState, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest, RsvpStatus } from '@/types/database'

type Stage = 'invite' | 'missions' | 'confirmed' | 'declined'

export default function GuestInvite({ params }: { params: Promise<{ guestCode: string }> }) {
  const { guestCode } = use(params)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [party, setParty] = useState<Party | null>(null)
  const [stage, setStage] = useState<Stage>('invite')
  const [missionAccepted, setMissionAccepted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('guests')
      .select('*, parties(*)')
      .eq('invite_code', guestCode)
      .single()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return }
        const g = data as Guest
        const p = (data as unknown as { parties: Party }).parties
        setGuest(g)
        setParty(p)
        // Restore state if they already acted
        if (g.rsvp_status === 'declined') setStage('declined')
        else if (g.mission_accepted) setStage('confirmed')
        else if (g.rsvp_status === 'accepted') setStage('missions')
        setMissionAccepted(g.mission_accepted)
        setLoading(false)
      })
  }, [guestCode])

  async function rsvp(status: RsvpStatus) {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ rsvp_status: status }).eq('id', guest.id)
    setGuest(g => g ? { ...g, rsvp_status: status } : g)
    setStage(status === 'accepted' ? 'missions' : 'declined')
    setSaving(false)
  }

  async function acceptMission() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ mission_accepted: true, mission_status: 'submitted' }).eq('id', guest.id)
    setMissionAccepted(true)
    setStage('confirmed')
    setSaving(false)
  }

  if (loading) return <main className="min-h-screen" style={{ background: '#0f1a30' }} />

  if (notFound || !guest || !party) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f1a30' }}>
      <p style={{ color: 'rgba(253,246,227,0.3)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', textAlign: 'center' }}>
        This invitation link wasn't found.<br />
        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Double-check the URL or ask Pili.</span>
      </p>
    </main>
  )

  const partyDate = new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const notes = Array.isArray(party.event_notes) ? party.event_notes : []
  const links = Array.isArray(party.event_links) ? party.event_links : []
  const hasMissions = guest.mission_easy || guest.mission_medium || guest.mission_legendary

  return (
    <main className="min-h-screen px-5 pb-16 pt-12 relative overflow-hidden" style={{ background: '#0f1a30' }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% -5%, rgba(201,168,76,0.08) 0%, transparent 60%)',
      }} />

      <div className="max-w-sm mx-auto relative z-10">

        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <p className="text-xs tracking-[0.35em] uppercase mb-6" style={{ color: 'rgba(201,168,76,0.5)' }}>
            Isaac's Birthday Boat Day
          </p>

          {guest.photo ? (
            <div className="w-24 h-24 rounded-full mx-auto mb-5 overflow-hidden" style={{ border: '2.5px solid rgba(201,168,76,0.35)', boxShadow: '0 0 40px rgba(201,168,76,0.1)' }}>
              <img src={guest.photo} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center text-3xl font-bold" style={{ background: 'rgba(201,168,76,0.1)', border: '2px solid rgba(201,168,76,0.25)', color: 'var(--gold)', fontFamily: "'Playfair Display', serif" }}>
              {guest.name[0]}
            </div>
          )}

          <h1 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '0.9rem' }}>
            {guest.name}, you're on the crew.
          </h1>

          {party.party_story && (
            <p style={{ color: 'rgba(253,246,227,0.6)', fontSize: '0.95rem', lineHeight: 1.85, fontStyle: 'italic' }}>
              {party.party_story}
            </p>
          )}
        </motion.div>

        {/* ── ROLE ── */}
        {guest.role_name && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="rounded-2xl px-5 py-4 mb-6 text-center"
            style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.18)' }}
          >
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'rgba(201,168,76,0.5)' }}>
              Your boat-day title
            </p>
            <p style={{ color: 'var(--gold)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              {guest.role_name}
            </p>
            {guest.role_description && (
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.5)' }}>
                {guest.role_description}
              </p>
            )}
          </motion.div>
        )}

        {/* ── DEPARTURE DETAILS ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl px-5 py-5 mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>
            Departure details
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 15, marginTop: 1, opacity: 0.6 }}>📅</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{partyDate}</p>
                {party.event_time && <p className="text-xs mt-0.5" style={{ color: 'rgba(253,246,227,0.4)' }}>{party.event_time}</p>}
              </div>
            </div>
            {party.event_location && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 15, marginTop: 1, opacity: 0.6 }}>📍</span>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.7)' }}>{party.event_location}</p>
              </div>
            )}
            {party.meeting_point && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 15, marginTop: 1, opacity: 0.6 }}>🚢</span>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.7)' }}>{party.meeting_point}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── HOST NOTES ── */}
        {notes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="rounded-2xl px-5 py-5 mb-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>Before boarding</p>
            <div className="flex flex-col gap-3">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-3">
                  {note.icon && <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{note.icon}</span>}
                  <div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.65)' }}>{note.text}</p>
                    {note.link && (
                      <a href={note.link} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-0.5 block" style={{ color: 'rgba(201,168,76,0.55)' }}>
                        Open link →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── LINKS ── */}
        {links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.33 }}
            className="flex flex-col gap-2 mb-8"
          >
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-3.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.15)', color: 'var(--gold)', textDecoration: 'none' }}
              >
                <span className="text-sm font-medium">{link.label}</span>
                <span style={{ opacity: 0.45, fontSize: 13 }}>↗</span>
              </a>
            ))}
          </motion.div>
        )}

        {/* ── RSVP / MISSIONS / CONFIRMED ── */}
        <AnimatePresence mode="wait">

          {/* RSVP */}
          {stage === 'invite' && (
            <motion.div
              key="rsvp"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-5" style={{ color: 'rgba(201,168,76,0.25)' }}>
                <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
                <span style={{ fontSize: 10 }}>🎂</span>
                <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
              </div>

              <button
                onClick={() => rsvp('accepted')}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-50 mb-3"
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {saving ? 'One sec…' : "I'm coming aboard 🚢"}
              </button>
              <button
                onClick={() => rsvp('declined')}
                disabled={saving}
                className="w-full py-3 text-sm"
                style={{ color: 'rgba(253,246,227,0.25)' }}
              >
                I'm sadly staying on land
              </button>
            </motion.div>
          )}

          {/* MISSIONS */}
          {stage === 'missions' && hasMissions && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-3 mb-6" style={{ color: 'rgba(201,168,76,0.25)' }}>
                <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
                <span style={{ fontSize: 10 }}>🎉</span>
                <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
              </div>

              <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Perfect. Your missions are ready.
              </p>
              <p className="text-sm mb-6" style={{ color: 'rgba(253,246,227,0.4)' }}>
                You have 3. Pick whichever ones feel right on the day.
              </p>

              <div className="flex flex-col gap-3 mb-7">
                {guest.mission_easy && (
                  <MissionCard
                    level="Easy"
                    levelColor="#6b7f5e"
                    emoji="🟢"
                    text={guest.mission_easy}
                  />
                )}
                {guest.mission_medium && (
                  <MissionCard
                    level="Medium"
                    levelColor="#c9a84c"
                    emoji="🟡"
                    text={guest.mission_medium}
                  />
                )}
                {guest.mission_legendary && (
                  <MissionCard
                    level="Legendary"
                    levelColor="#c4622d"
                    emoji="🔥"
                    text={guest.mission_legendary}
                  />
                )}
              </div>

              <button
                onClick={acceptMission}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {saving ? 'Saving…' : 'I accept my mission'}
              </button>
            </motion.div>
          )}

          {stage === 'missions' && !hasMissions && (
            <motion.div
              key="missions-empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <button
                onClick={acceptMission}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {saving ? 'Saving…' : "I'm in — see you on the boat 🚢"}
              </button>
            </motion.div>
          )}

          {/* CONFIRMED */}
          {stage === 'confirmed' && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl px-6 py-7 text-center"
              style={{ background: 'rgba(107,127,94,0.1)', border: '1px solid rgba(107,127,94,0.25)' }}
            >
              <p className="text-2xl mb-3">🚢</p>
              <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.6rem' }}>
                You're in. Mission saved.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.5)' }}>
                Phone away. See you on the boat.
              </p>
              {hasMissions && (
                <button
                  onClick={() => setStage('missions')}
                  className="text-xs mt-5 underline"
                  style={{ color: 'rgba(253,246,227,0.25)' }}
                >
                  Review your missions
                </button>
              )}
            </motion.div>
          )}

          {/* DECLINED */}
          {stage === 'declined' && (
            <motion.div
              key="declined"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl px-6 py-6 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-xl mb-2">😔</p>
              <p className="text-sm" style={{ color: 'rgba(253,246,227,0.5)' }}>
                You'll be missed. Isaac will understand. Probably.
              </p>
              <button
                onClick={() => rsvp('accepted')}
                className="text-xs mt-4 underline"
                style={{ color: 'rgba(201,168,76,0.4)' }}
              >
                Wait, actually I can make it
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-10"
          style={{ color: 'rgba(253,246,227,0.12)', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}
        >
          Made with love by Pili · {party.party_date}
        </motion.p>

      </div>
    </main>
  )
}

function MissionCard({ level, levelColor, emoji, text }: {
  level: string
  levelColor: string
  emoji: string
  text: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl px-4 py-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${levelColor}33` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 12 }}>{emoji}</span>
        <span className="text-xs font-semibold tracking-wide" style={{ color: levelColor }}>
          {level}
        </span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.75)' }}>
        {text}
      </p>
    </motion.div>
  )
}
