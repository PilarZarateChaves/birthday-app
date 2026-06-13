'use client'

import { useEffect, useState, useRef, use, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest } from '@/types/database'

type Stage = 'invite' | 'revealed' | 'accepted' | 'declined'
type CrewMate = { name: string; photo: string | null }

// ─────────────────────────────────────────────────────────
// Confetti — bright festive burst on RSVP
// ─────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#ffd23f', '#ff7a59', '#5fb6e6', '#5fae7e',
  '#f7a8c4', '#ffe57a', '#ffffff', '#ff9f6e',
]

function Confetti() {
  const particles = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => {
      const angle = (i / 48) * Math.PI * 2
      const spread = 90 + (i % 5) * 44
      return {
        id: i,
        x: Math.cos(angle) * spread + (i % 3 - 1) * 30,
        y: -(Math.abs(Math.sin(angle)) * 240 + 70 + (i % 4) * 30),
        rotate: (i % 2 === 0 ? 1 : -1) * (180 + i * 37),
        delay: (i % 8) * 0.04,
        w: 8 + (i % 4) * 3,
        h: 6 + (i % 3) * 3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      }
    })
  , [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      <div style={{ position: 'relative' }}>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.5 }}
            transition={{ duration: 1.5 + p.delay * 2, delay: p.delay, ease: [0.1, 0.6, 0.4, 1] }}
            style={{
              position: 'absolute',
              width: p.w,
              height: p.h,
              borderRadius: p.round ? '50%' : 2,
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
// Crew aboard — avatar cluster of friends who said yes
// ─────────────────────────────────────────────────────────
function CrewAboard({ crew }: { crew: CrewMate[] }) {
  if (crew.length === 0) return null
  const shown = crew.slice(0, 7)
  const extra = crew.length - shown.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className="flex flex-col items-center gap-2 mb-7"
    >
      <div className="flex items-center">
        {shown.map((m, i) => (
          <div
            key={i}
            className="rounded-full flex items-center justify-center overflow-hidden"
            style={{
              width: 34, height: 34,
              marginLeft: i === 0 ? 0 : -10,
              border: '2.5px solid #fff9ee',
              background: 'linear-gradient(135deg, var(--sunny-soft), var(--coral-soft))',
              color: 'var(--coral)',
              fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(45,58,74,0.12)',
              zIndex: shown.length - i,
            }}
          >
            {m.photo
              ? <img src={m.photo} alt="" className="w-full h-full object-cover" />
              : (m.name?.[0] ?? '🍋')}
          </div>
        ))}
        {extra > 0 && (
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 34, height: 34, marginLeft: -10,
              border: '2.5px solid #fff9ee', background: 'var(--sky-soft)',
              color: 'var(--sky)', fontSize: 11, fontWeight: 700,
            }}
          >
            +{extra}
          </div>
        )}
      </div>
      <p className="text-sm" style={{ color: 'var(--riviera-ink-soft)' }}>
        <span style={{ fontWeight: 700, color: 'var(--coral)' }}>{crew.length}</span>
        {crew.length === 1 ? ' friend is' : ' friends'} already aboard 🍋
      </p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────
// Mission card
// ─────────────────────────────────────────────────────────
function MissionCard({
  level, badge, accent, tint, text, delay,
}: {
  level: string
  badge: string
  accent: string
  tint: string
  text: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}
    >
      <div style={{ height: 4, background: accent }} />
      <div className="px-4 py-4" style={{ background: tint }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ fontSize: 13 }}>{badge}</span>
          <span className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
            {level}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink)' }}>
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
  const [crew, setCrew] = useState<CrewMate[]>([])
  const [stage, setStage] = useState<Stage>('invite')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevStage = useRef<Stage>('invite')

  async function loadCrew(partyId: string) {
    const { data } = await supabase
      .from('guests')
      .select('name, photo')
      .eq('party_id', partyId)
      .eq('rsvp_status', 'accepted')
    if (data) setCrew(data as CrewMate[])
  }

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
        prevStage.current = initial
        setStage(initial)
        if (p?.id) loadCrew(p.id)
        setLoading(false)
      })
  }, [guestCode])

  useEffect(() => {
    if (stage === 'revealed' && prevStage.current === 'invite') {
      setShowConfetti(true)
      const t = setTimeout(() => setShowConfetti(false), 2800)
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
    if (party?.id) loadCrew(party.id)
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

  if (loading) return <main className="min-h-screen" style={{ background: 'var(--riviera-bg)' }} />

  if (notFound || !guest || !party) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--riviera-bg)' }}>
      <p style={{ color: 'var(--riviera-ink-soft)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', textAlign: 'center', lineHeight: 1.9 }}>
        This invite link wasn't found.<br />
        <span style={{ fontSize: '0.8rem' }}>Check the URL or message Pili.</span>
      </p>
    </main>
  )

  const partyDateObj = new Date(party.party_date + 'T12:00:00')
  const partyDate = partyDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sleeps = Math.round((partyDateObj.getTime() - today.getTime()) / 86400000)
  const countdownText =
    sleeps > 1 ? `${sleeps} sleeps until we set sail`
    : sleeps === 1 ? 'One sleep until we set sail'
    : sleeps === 0 ? "Today's the day. We set sail! 🎉"
    : 'The voyage has sailed 🌊'

  const notes = Array.isArray(party.event_notes) ? party.event_notes : []
  const links = Array.isArray(party.event_links) ? party.event_links : []
  const hasMissions = !!(guest.mission_easy || guest.mission_medium || guest.mission_legendary)
  const firstName = guest.name.split(' ')[0]

  return (
    <main className="min-h-screen pb-20 relative overflow-hidden" style={{ background: 'var(--riviera-bg)' }}>

      {/* Soft Mediterranean gradient blobs */}
      <div className="fixed pointer-events-none" style={{ top: '-12%', left: '-18%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,210,63,0.5) 0%, transparent 70%)', filter: 'blur(20px)' }} />
      <div className="fixed pointer-events-none" style={{ top: '4%', right: '-22%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,122,89,0.35) 0%, transparent 70%)', filter: 'blur(24px)' }} />
      <div className="fixed pointer-events-none" style={{ bottom: '-14%', left: '-10%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,182,230,0.32) 0%, transparent 70%)', filter: 'blur(26px)' }} />
      <div className="fixed pointer-events-none" style={{ bottom: '6%', right: '-16%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(247,168,196,0.34) 0%, transparent 70%)', filter: 'blur(22px)' }} />

      {showConfetti && <Confetti />}

      <div className="max-w-sm mx-auto px-5 pt-9 relative z-10">

        {/* ── COUNTDOWN PILL ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-7"
        >
          <span
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold"
            style={{ background: '#fff', color: 'var(--coral)', boxShadow: '0 4px 16px rgba(255,122,89,0.18)' }}
          >
            ⛵ {countdownText}
          </span>
        </motion.div>

        {/* ── AVATAR + HEADLINE ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center mb-6"
        >
          <p className="tracking-[0.28em] uppercase mb-5" style={{ fontSize: '0.62rem', color: 'var(--riviera-ink-soft)', opacity: 0.7 }}>
            {party.birthday_person_name}'s Birthday · Boat Day
          </p>

          {guest.photo ? (
            <div className="w-24 h-24 rounded-full mx-auto mb-5 overflow-hidden" style={{
              border: '4px solid #fff',
              boxShadow: '0 10px 30px rgba(45,58,74,0.16)',
            }}>
              <img src={guest.photo} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, var(--sunny) 0%, var(--coral) 100%)',
              border: '4px solid #fff',
              boxShadow: '0 10px 30px rgba(255,122,89,0.28)',
              color: '#fff',
              fontFamily: "'Playfair Display', serif",
              fontSize: '2.2rem',
              fontWeight: 700,
            }}>
              {guest.name[0]}
            </div>
          )}

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--riviera-ink)',
            lineHeight: 1.15,
          }}>
            You're on the crew,
          </h1>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--coral)',
            lineHeight: 1.15,
          }}>
            {firstName}.
          </h1>
        </motion.div>

        {/* ── CREW ABOARD ── */}
        <CrewAboard crew={crew} />

        {/* ── PARTY STORY ── */}
        {party.party_story && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-[0.95rem] text-center leading-[1.85] mb-6"
            style={{ color: 'var(--riviera-ink-soft)' }}
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
            className="rounded-3xl px-5 py-5 mb-4 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--sunny-soft) 0%, var(--coral-soft) 100%)',
              boxShadow: '0 8px 26px rgba(255,180,120,0.22)',
            }}
          >
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', opacity: 0.8, marginBottom: '0.4rem' }}>
              Your boat-day title
            </p>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.35rem',
              fontWeight: 700,
              color: 'var(--riviera-ink)',
              lineHeight: 1.25,
              marginBottom: guest.role_description ? '0.5rem' : 0,
            }}>
              {guest.role_name}
            </p>
            {guest.role_description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>
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
          className="rounded-3xl px-5 py-4 mb-4"
          style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}
        >
          <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--sky)', marginBottom: '0.85rem' }}>
            Departure details
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-start gap-3">
              <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>📅</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--riviera-ink)' }}>{partyDate}</p>
                {party.event_time && <p className="text-xs mt-0.5" style={{ color: 'var(--riviera-ink-soft)' }}>{party.event_time}</p>}
              </div>
            </div>
            {party.event_location && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>📍</span>
                <p className="text-sm" style={{ color: 'var(--riviera-ink)' }}>{party.event_location}</p>
              </div>
            )}
            {party.meeting_point && (
              <div className="flex items-start gap-3">
                <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>🚢</span>
                <p className="text-sm" style={{ color: 'var(--riviera-ink)' }}>{party.meeting_point}</p>
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
            className="rounded-3xl px-5 py-4 mb-4"
            style={{ background: 'var(--leaf-soft)', boxShadow: '0 6px 22px rgba(95,174,126,0.12)' }}
          >
            <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--leaf)', marginBottom: '0.85rem' }}>
              Before boarding
            </p>
            <div className="flex flex-col gap-2.5">
              {notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  {note.icon && <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{note.icon}</span>}
                  <div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink)' }}>{note.text}</p>
                    {note.link && (
                      <a href={note.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs underline mt-0.5 block" style={{ color: 'var(--leaf)' }}>
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
                style={{ background: '#fff', boxShadow: '0 4px 16px rgba(45,58,74,0.06)', color: 'var(--sky)', textDecoration: 'none' }}>
                <span className="text-sm font-semibold">{link.label}</span>
                <span style={{ opacity: 0.5, fontSize: 12 }}>↗</span>
              </a>
            ))}
          </motion.div>
        )}

        {/* ── DIVIDER ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.46 }}
          className="flex items-center gap-3 my-7"
          style={{ color: 'rgba(45,58,74,0.12)' }}
        >
          <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
          <span style={{ fontSize: 14 }}>🥂</span>
          <div className="flex-1 h-px" style={{ background: 'currentColor' }} />
        </motion.div>

        {/* ── CTA / MISSIONS ── */}
        <AnimatePresence mode="wait">

          {/* INVITE */}
          {stage === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, transition: { duration: 0.3 } }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {hasMissions && (
                <p className="text-sm text-center mb-5 leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>
                  Say you're coming and we'll reveal<br />your 3 secret boat-day missions 🤫
                </p>
              )}
              <button
                onClick={rsvpAccept}
                disabled={saving}
                className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'var(--sunny)', color: 'var(--riviera-ink)', boxShadow: '0 8px 24px rgba(255,210,63,0.45)' }}
              >
                {saving ? 'One sec…' : "I'm coming aboard 🚢"}
              </button>
              <button
                onClick={rsvpDecline}
                disabled={saving}
                className="w-full py-3 mt-1.5 text-sm font-medium"
                style={{ color: 'var(--riviera-ink-soft)', opacity: 0.55 }}
              >
                I can't make it
              </button>
            </motion.div>
          )}

          {/* REVEALED + ACCEPTED */}
          {(stage === 'revealed' || stage === 'accepted') && (
            <motion.div
              key="missions"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="text-center mb-6"
              >
                <motion.p
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, type: 'spring', stiffness: 200 }}
                  style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}
                >
                  🎉
                </motion.p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.3rem' }}>
                  Yesss. You're officially aboard.
                </p>
                <p className="text-sm" style={{ color: 'var(--riviera-ink-soft)' }}>
                  Here are your 3 boat-day missions. Made for real life, not your phone.
                </p>
              </motion.div>

              {hasMissions && (
                <div className="flex flex-col gap-3 mb-7">
                  {guest.mission_easy && (
                    <MissionCard level="Easy" badge="🟢" accent="var(--leaf)" tint="var(--leaf-soft)" text={guest.mission_easy} delay={0.12} />
                  )}
                  {guest.mission_medium && (
                    <MissionCard level="Medium" badge="🟡" accent="#e0a93c" tint="var(--sunny-soft)" text={guest.mission_medium} delay={0.22} />
                  )}
                  {guest.mission_legendary && (
                    <MissionCard level="Legendary" badge="🔥" accent="var(--coral)" tint="var(--coral-soft)" text={guest.mission_legendary} delay={0.32} />
                  )}
                </div>
              )}

              <AnimatePresence mode="wait">
                {stage === 'revealed' && (
                  <motion.div
                    key="check"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
                    transition={{ duration: 0.4, delay: 0.38 }}
                  >
                    <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--riviera-ink-soft)', textAlign: 'center', marginBottom: '0.7rem', opacity: 0.7 }}>
                      Final check
                    </p>
                    <button
                      onClick={acceptMissions}
                      disabled={saving}
                      className="w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl text-left active:scale-[0.98] transition-all disabled:opacity-50"
                      style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.08)' }}
                    >
                      <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ border: '2px solid var(--coral)', background: 'transparent' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--riviera-ink)' }}>
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
                    className="rounded-3xl px-5 py-5 text-center"
                    style={{ background: 'var(--leaf-soft)', boxShadow: '0 8px 24px rgba(95,174,126,0.18)' }}
                  >
                    <p style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>✅</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--riviera-ink)', marginBottom: '0.3rem' }}>
                      Perfect. You're all set.
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>
                      Remember your missions and enjoy the party. See you on the water 🌊
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* DECLINED */}
          {stage === 'declined' && (
            <motion.div
              key="declined"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-center py-2"
            >
              <p style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>🥲</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>
                You'll be missed.<br />Isaac will understand. Probably.
              </p>
              <button
                onClick={rsvpAccept}
                className="text-sm font-semibold mt-5 underline"
                style={{ color: 'var(--coral)' }}
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
          style={{ color: 'var(--riviera-ink-soft)', opacity: 0.4, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}
        >
          Made with love by Pili
        </motion.p>

      </div>
    </main>
  )
}
