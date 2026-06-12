'use client'

import { useEffect, useState, useRef, use, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest } from '@/types/database'

type Stage = 'invite' | 'revealed' | 'accepted' | 'declined'

// ─────────────────────────────────────────────────────────
// Confetti — colored paper pieces burst from center on RSVP
// ─────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#c9a84c', '#e8c47a', '#c4622d', '#f0a04a',
  '#6b9e7e', '#9ecab5', '#fdf6e3', '#ffffff',
]

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2
      const spread = 80 + (i % 5) * 40
      return {
        id: i,
        x: Math.cos(angle) * spread + (i % 3 - 1) * 30,
        y: -(Math.abs(Math.sin(angle)) * 220 + 60 + (i % 4) * 30),
        rotate: (i % 2 === 0 ? 1 : -1) * (180 + i * 37),
        delay: (i % 8) * 0.04,
        w: 8 + (i % 4) * 3,
        h: 5 + (i % 3) * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      }
    })
  , [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-center overflow-hidden" style={{ paddingBottom: '30vh' }}>
      <div style={{ position: 'relative' }}>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.4 }}
            transition={{ duration: 1.4 + p.delay * 2, delay: p.delay, ease: [0.1, 0.6, 0.4, 1] }}
            style={{
              position: 'absolute',
              width: p.w,
              height: p.h,
              borderRadius: 2,
              background: p.color,
              transformOrigin: 'center center',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Mission card — staggered entrance, lives until the end
// ─────────────────────────────────────────────────────────
function MissionCard({
  level, badge, accentColor, bgColor, text, delay,
}: {
  level: string
  badge: string
  accentColor: string
  bgColor: string
  text: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${accentColor}30` }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}99, transparent)` }} />
      <div className="px-4 py-4" style={{ background: bgColor }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ fontSize: 12 }}>{badge}</span>
          <span className="text-xs font-bold tracking-[0.15em] uppercase" style={{ color: accentColor }}>
            {level}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.82)' }}>
          {text}
        </p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
export default function GuestInvite({ params }: { params: Promise<{ guestCode: string }> }) {
  const { guestCode } = use(params)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [party, setParty] = useState<Party | null>(null)
  const [stage, setStage] = useState<Stage>('invite')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevStage = useRef<Stage>('invite')

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
        const initial: Stage =
          g.rsvp_status === 'declined' ? 'declined'
          : g.mission_accepted ? 'accepted'
          : g.rsvp_status === 'accepted' ? 'revealed'
          : 'invite'
        // Set ref before state so the stage effect doesn't fire confetti on load
        prevStage.current = initial
        setStage(initial)
        setLoading(false)
      })
  }, [guestCode])

  // Fire confetti only on the actual RSVP tap, not on page load
  useEffect(() => {
    if (stage === 'revealed' && prevStage.current === 'invite') {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 2600)
      return () => clearTimeout(t)
    }
    prevStage.current = stage
  }, [stage])

  async function rsvpAccept() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ rsvp_status: 'accepted' }).eq('id', guest.id)
    setGuest(g => g ? { ...g, rsvp_status: 'accepted' } : g)
    setStage('revealed')
    setSaving(false)
  }

  async function rsvpDecline() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ rsvp_status: 'declined' }).eq('id', guest.id)
    setGuest(g => g ? { ...g, rsvp_status: 'declined' } : g)
    setStage('declined')
    setSaving(false)
  }

  async function acceptMissions() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ mission_accepted: true, mission_status: 'submitted' }).eq('id', guest.id)
    setGuest(g => g ? { ...g, mission_accepted: true } : g)
    setStage('accepted')
    setSaving(false)
  }

  if (loading) return <main className="min-h-screen" style={{ background: '#0f1a30' }} />

  if (notFound || !guest || !party) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f1a30' }}>
      <p style={{ color: 'rgba(253,246,227,0.25)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', textAlign: 'center', lineHeight: 1.9 }}>
        This invite link wasn't found.<br />
        <span style={{ fontSize: '0.75rem' }}>Check the URL or message Pili.</span>
      </p>
    </main>
  )

  const partyDate = new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const notes = Array.isArray(party.event_notes) ? party.event_notes : []
  const links = Array.isArray(party.event_links) ? party.event_links : []
  const hasMissions = !!(guest.mission_easy || guest.mission_medium || guest.mission_legendary)

  return (
    <main className="min-h-screen pb-20 relative" style={{ background: '#0f1a30' }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 100%)',
      }} />

      {showConfetti && <Confetti />}

      <div className="max-w-sm mx-auto px-5 pt-10 relative z-10">

        {/* ── TOP LABEL ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.1 }}
          className="text-center mb-8 tracking-[0.3em] uppercase"
          style={{ fontSize: '0.65rem', color: 'rgba(201,168,76,0.35)' }}
        >
          {party.birthday_person_name}'s Birthday · Boat Day
        </motion.p>

        {/* ── AVATAR + HEADLINE ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-center mb-7"
        >
          {guest.photo ? (
            <div className="w-[88px] h-[88px] rounded-full mx-auto mb-5 overflow-hidden" style={{
              border: '2px solid rgba(201,168,76,0.3)',
              boxShadow: '0 0 0 4px rgba(201,168,76,0.06), 0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <img src={guest.photo} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-[88px] h-[88px] rounded-full mx-auto mb-5 flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(196,98,45,0.08))',
              border: '2px solid rgba(201,168,76,0.25)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              color: 'var(--gold)',
              fontFamily: "'Playfair Display', serif",
              fontSize: '2rem',
              fontWeight: 700,
            }}>
              {guest.name[0]}
            </div>
          )}

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.85rem',
            fontWeight: 700,
            color: 'var(--cream)',
            lineHeight: 1.2,
            marginBottom: '0.25rem',
          }}>
            You're on the crew,
          </h1>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '1.85rem',
            fontWeight: 700,
            color: 'var(--gold)',
            lineHeight: 1.2,
          }}>
            {guest.name.split(' ')[0]}.
          </h1>
        </motion.div>

        {/* ── PARTY STORY ── */}
        {party.party_story && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-sm text-center leading-[1.95] mb-6"
            style={{ color: 'rgba(253,246,227,0.48)', fontStyle: 'italic' }}
          >
            {party.party_story}
          </motion.p>
        )}

        {/* ── ROLE CARD ── */}
        {guest.role_name && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="rounded-2xl px-5 py-5 mb-5"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.11) 0%, rgba(196,98,45,0.06) 100%)',
              border: '1px solid rgba(201,168,76,0.22)',
            }}
          >
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.4)', marginBottom: '0.5rem' }}>
              Your boat-day title
            </p>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--gold)',
              lineHeight: 1.3,
              marginBottom: guest.role_description ? '0.5rem' : 0,
            }}>
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.35 }}
          className="rounded-2xl px-5 py-4 mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.38)', marginBottom: '0.85rem' }}>
            Departure details
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 14, opacity: 0.45, marginTop: 1, flexShrink: 0 }}>📅</span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{partyDate}</p>
                {party.event_time && <p className="text-xs mt-0.5" style={{ color: 'rgba(253,246,227,0.38)' }}>{party.event_time}</p>}
              </div>
            </div>
            {party.event_location && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 14, opacity: 0.45, marginTop: 1, flexShrink: 0 }}>📍</span>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.62)' }}>{party.event_location}</p>
              </div>
            )}
            {party.meeting_point && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 14, opacity: 0.45, marginTop: 1, flexShrink: 0 }}>🚢</span>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.62)' }}>{party.meeting_point}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── BEFORE BOARDING NOTES ── */}
        {notes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl px-5 py-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.38)', marginBottom: '0.85rem' }}>
              Before boarding
            </p>
            <div className="flex flex-col gap-2.5">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {note.icon && <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{note.icon}</span>}
                  <div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.58)' }}>{note.text}</p>
                    {note.link && (
                      <a href={note.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline mt-0.5 block" style={{ color: 'rgba(201,168,76,0.45)' }}>
                        Open →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── EVENT LINKS ── */}
        {links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.43 }}
            className="flex flex-col gap-2 mb-4"
          >
            {links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between px-5 py-3.5 rounded-2xl active:scale-95 transition-all"
                style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.14)', color: 'var(--gold)', textDecoration: 'none' }}>
                <span className="text-sm font-medium">{link.label}</span>
                <span style={{ opacity: 0.35, fontSize: 11 }}>↗</span>
              </a>
            ))}
          </motion.div>
        )}

        {/* ── DIVIDER ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.46 }}
          className="flex items-center gap-3 my-8"
          style={{ color: 'rgba(201,168,76,0.12)' }}
        >
          <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
          <span style={{ fontSize: 13 }}>🥂</span>
          <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
        </motion.div>

        {/* ── CTA / MISSIONS — transitions between stages ── */}
        <AnimatePresence mode="wait">

          {/* ── INVITE STAGE ── */}
          {stage === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {hasMissions && (
                <p className="text-sm text-center mb-6 leading-relaxed" style={{ color: 'rgba(253,246,227,0.35)' }}>
                  Confirm you're coming and we'll reveal<br />your 3 boat-day missions.
                </p>
              )}

              <button
                onClick={rsvpAccept}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'var(--gold)', color: '#1a2744' }}
              >
                {saving ? 'One sec…' : "I'm coming aboard 🚢"}
              </button>

              <button
                onClick={rsvpDecline}
                disabled={saving}
                className="w-full py-3 mt-1 text-sm"
                style={{ color: 'rgba(253,246,227,0.2)' }}
              >
                I can't make it
              </button>
            </motion.div>
          )}

          {/* ── REVEALED + ACCEPTED STAGES ──
               Both show missions. Only the bottom section swaps. ── */}
          {(stage === 'revealed' || stage === 'accepted') && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Celebration header */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="text-center mb-7"
              >
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
                  style={{ fontSize: '2rem', marginBottom: '0.6rem' }}
                >
                  🎉
                </motion.p>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  marginBottom: '0.3rem',
                }}>
                  You're officially on the crew.
                </p>
                <p className="text-sm" style={{ color: 'rgba(253,246,227,0.38)' }}>
                  Here are your 3 boat-day missions.
                </p>
              </motion.div>

              {/* Mission cards — staggered deal */}
              {hasMissions && (
                <div className="flex flex-col gap-3 mb-7">
                  {guest.mission_easy && (
                    <MissionCard
                      level="Easy"
                      badge="🟢"
                      accentColor="#6b9e7e"
                      bgColor="rgba(107,158,126,0.07)"
                      text={guest.mission_easy}
                      delay={0.12}
                    />
                  )}
                  {guest.mission_medium && (
                    <MissionCard
                      level="Medium"
                      badge="🟡"
                      accentColor="#c9a84c"
                      bgColor="rgba(201,168,76,0.07)"
                      text={guest.mission_medium}
                      delay={0.22}
                    />
                  )}
                  {guest.mission_legendary && (
                    <MissionCard
                      level="Legendary"
                      badge="🔥"
                      accentColor="#c4622d"
                      bgColor="rgba(196,98,45,0.07)"
                      text={guest.mission_legendary}
                      delay={0.32}
                    />
                  )}
                </div>
              )}

              {/* Final check — transitions from checkbox → done */}
              <AnimatePresence mode="wait">
                {stage === 'revealed' && (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.4, delay: 0.38 }}
                  >
                    <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.35)', textAlign: 'center', marginBottom: '0.75rem' }}>
                      Final check
                    </p>
                    <button
                      onClick={acceptMissions}
                      disabled={saving}
                      className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl text-left active:scale-[0.98] transition-all disabled:opacity-50"
                      style={{ background: 'rgba(201,168,76,0.07)', border: '1.5px solid rgba(201,168,76,0.2)' }}
                    >
                      <div
                        className="w-5 h-5 rounded-md flex-shrink-0"
                        style={{ border: '1.5px solid rgba(201,168,76,0.35)', background: 'transparent' }}
                      />
                      <span className="text-sm" style={{ color: 'rgba(253,246,227,0.7)' }}>
                        {saving ? 'Saving…' : 'I accept my boat-day missions'}
                      </span>
                    </button>
                  </motion.div>
                )}

                {stage === 'accepted' && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl px-5 py-5 text-center"
                    style={{ background: 'rgba(107,158,126,0.09)', border: '1px solid rgba(107,158,126,0.22)' }}
                  >
                    <p style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>✅</p>
                    <p className="text-sm font-semibold" style={{ color: 'rgba(253,246,227,0.85)', marginBottom: '0.3rem' }}>
                      Perfect. You're all set.
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(253,246,227,0.38)' }}>
                      Remember your missions and enjoy the party.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── DECLINED STAGE ── */}
          {stage === 'declined' && (
            <motion.div
              key="declined"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-center py-2"
            >
              <p style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>😔</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.4)' }}>
                You'll be missed.<br />Isaac will understand. Probably.
              </p>
              <button
                onClick={rsvpAccept}
                className="text-xs mt-5 underline"
                style={{ color: 'rgba(201,168,76,0.38)' }}
              >
                Wait — actually I can make it
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-12"
          style={{ color: 'rgba(253,246,227,0.08)', fontSize: '0.55rem', letterSpacing: '0.22em', textTransform: 'uppercase' }}
        >
          Made with love by Pili
        </motion.p>

      </div>
    </main>
  )
}
