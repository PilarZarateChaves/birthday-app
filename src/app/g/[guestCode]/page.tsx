'use client'

import { useEffect, useState, useRef, use, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest, MissionProgress } from '@/types/database'

type Step = 'invitation' | 'role' | 'missions' | 'allset' | 'captainslog' | 'declined'
type CrewMate = { name: string; photo: string | null }

// ─────────────────────────────────────────────────────────
// Confetti
// ─────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#ffd23f', '#ff7a59', '#5fb6e6', '#5fae7e', '#f7a8c4', '#ffe57a', '#ffffff', '#ff9f6e']

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
            style={{ position: 'absolute', width: p.w, height: p.h, borderRadius: p.round ? '50%' : 2, background: p.color }}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Marina ambience — drifting sailboats far in the background
// ─────────────────────────────────────────────────────────
function Sailboat({ tint, scale = 1 }: { tint: string; scale?: number }) {
  return (
    <svg width={46 * scale} height={42 * scale} viewBox="0 0 46 42" fill="none" aria-hidden>
      <path d="M23 5V25" stroke={tint} strokeWidth="1" strokeLinecap="round" opacity="0.9" />
      <path d="M23.5 7C30 11 33.5 17 34.5 24H23.5V7Z" fill={tint} opacity="0.85" />
      <path d="M22.5 9.5C16.5 13 14 17.5 13 24H22.5V9.5Z" fill={tint} opacity="0.55" />
      <path d="M8 25.5H38C36 31.5 31.5 34 23 34C14.5 34 10 31.5 8 25.5Z" fill={tint} opacity="0.9" />
    </svg>
  )
}

function MarinaBackdrop() {
  const boats = [
    { top: '17%', tint: 'rgba(95,182,230,0.32)', scale: 0.8, dur: 48, delay: '0s', bob: 3.6 },
    { top: '44%', tint: 'rgba(255,122,89,0.22)', scale: 1.05, dur: 64, delay: '-26s', bob: 4.4 },
    { top: '70%', tint: 'rgba(45,58,74,0.13)', scale: 0.66, dur: 56, delay: '-40s', bob: 4 },
  ]
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {boats.map((b, i) => (
        <div key={i} className="marina-anim absolute" style={{ top: b.top, left: 0, animation: `sailDrift ${b.dur}s linear ${b.delay} infinite` }}>
          <div className="marina-anim" style={{ animation: `gentleBob ${b.bob}s ease-in-out infinite` }}>
            <Sailboat tint={b.tint} scale={b.scale} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Tiny waves lapping the bottom of the photo frame
function PhotoWaves() {
  return (
    <div className="absolute left-0 right-0 bottom-0" style={{ height: 28, overflow: 'hidden' }}>
      <svg className="marina-anim" viewBox="0 0 120 28" preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: 28, animation: 'waveSlide 9s linear infinite', opacity: 0.5 }}>
        <path d="M0 16 Q7.5 9 15 16 T30 16 T45 16 T60 16 T75 16 T90 16 T105 16 T120 16 V28 H0 Z" fill="rgba(199,232,247,0.95)" />
      </svg>
      <svg className="marina-anim" viewBox="0 0 120 28" preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: 28, animation: 'waveSlide 6s linear infinite', opacity: 0.75 }}>
        <path d="M0 19 Q7.5 13 15 19 T30 19 T45 19 T60 19 T75 19 T90 19 T105 19 T120 19 V28 H0 Z" fill="rgba(255,255,255,0.9)" />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Step progress dots (1-2-3 wizard)
// ─────────────────────────────────────────────────────────
const WIZARD_STEPS: Step[] = ['invitation', 'role', 'missions']
function StepDots({ current }: { current: Step }) {
  const idx = WIZARD_STEPS.indexOf(current)
  if (idx < 0) return null
  const labels = ['Invitation', 'Your role', 'Missions']
  return (
    <div className="flex flex-col items-center gap-2 pt-7 pb-1">
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              height: 6, borderRadius: 99,
              width: i === idx ? 26 : 6,
              background: i <= idx ? 'var(--coral)' : 'rgba(45,58,74,0.16)',
              transition: 'all 0.4s ease',
            }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: 'var(--riviera-ink-soft)', opacity: 0.7 }}>
        Step {idx + 1} of 3 · {labels[idx]}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Mission card
// ─────────────────────────────────────────────────────────
function MissionCard({ level, badge, accent, tint, text, delay }: {
  level: string; badge: string; accent: string; tint: string; text: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.08)' }}
    >
      <div style={{ height: 4, background: accent }} />
      <div className="px-4 py-4" style={{ background: tint }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span style={{ fontSize: 13 }}>{badge}</span>
          <span className="text-xs font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>{level}</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink)' }}>{text}</p>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────
// Live countdown hero — big days / hours / minutes
// ─────────────────────────────────────────────────────────
function eventTargetMs(dateStr: string, timeStr: string | null): number {
  let h = 15, m = 0
  const match = (timeStr || '').trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (match) {
    h = parseInt(match[1], 10)
    m = match[2] ? parseInt(match[2], 10) : 0
    const ap = match[3]?.toLowerCase()
    if (ap === 'pm' && h < 12) h += 12
    if (ap === 'am' && h === 12) h = 0
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return new Date(`${dateStr}T${pad(h)}:${pad(m)}:00`).getTime()
}

function CountdownHero({ target, subline }: { target: number; subline: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = now == null ? null : Math.max(0, target - now)
  const days = diff == null ? null : Math.floor(diff / 86400000)
  const hours = diff == null ? null : Math.floor((diff % 86400000) / 3600000)
  const mins = diff == null ? null : Math.floor((diff % 3600000) / 60000)
  const sailed = diff != null && diff <= 0

  const headline = days == null ? 'Counting down…'
    : sailed ? "Today's the day. We set sail!"
    : `${days} ${days === 1 ? 'sleep' : 'sleeps'} until we set sail`

  const blocks: { v: number | null; label: string }[] = [
    { v: days, label: 'Days' },
    { v: hours, label: 'Hours' },
    { v: mins, label: 'Minutes' },
  ]

  return (
    <div className="text-center">
      <motion.p
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mb-4" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--coral)' }}>
        ⛵ {headline}
      </motion.p>

      {!sailed && (
        <div className="flex items-stretch justify-center gap-2.5 mb-4">
          {blocks.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 rounded-2xl py-4"
              style={{ background: '#fff', boxShadow: '0 10px 28px rgba(45,58,74,0.12)', maxWidth: 100 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.7rem', fontWeight: 700, lineHeight: 1, color: 'var(--riviera-ink)' }}>
                {b.v == null ? '–' : String(b.v).padStart(2, '0')}
              </p>
              <p className="mt-1.5" style={{ fontSize: '0.56rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--riviera-ink-soft)' }}>
                {b.label}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <p className="text-sm" style={{ color: 'var(--riviera-ink-soft)' }}>{subline}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────
export default function GuestInvite({ params }: { params: Promise<{ guestCode: string }> }) {
  const { guestCode } = use(params)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [party, setParty] = useState<Party | null>(null)
  const [crew, setCrew] = useState<CrewMate[]>([])
  const [step, setStep] = useState<Step>('invitation')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Captain's Log local state
  const [note, setNote] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Mission progress (final screen)
  const [progress, setProgress] = useState<MissionProgress>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [activeMission, setActiveMission] = useState(0)
  const [missionDir, setMissionDir] = useState(1)
  const [evidenceBusy, setEvidenceBusy] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({})
  const [crewOpen, setCrewOpen] = useState(false)

  async function loadCrew(partyId: string) {
    const { data } = await supabase.from('guests').select('name, photo').eq('party_id', partyId).eq('rsvp_status', 'accepted')
    if (data) setCrew(data as CrewMate[])
  }

  function fire() {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2800)
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
        setNote(g.memory_favorite_moment ?? '')
        setPhotos(Array.isArray(g.memory_photos) ? g.memory_photos : [])
        const mp = (g.mission_progress && typeof g.mission_progress === 'object') ? g.mission_progress : {}
        setProgress(mp)
        setNoteDrafts(Object.fromEntries(Object.entries(mp).map(([k, v]) => [k, v?.note ?? ''])))
        const ended = p?.status === 'ended'
        const start: Step =
          g.rsvp_status === 'declined' ? 'declined'
          : ended && g.mission_status === 'approved' ? 'captainslog'
          : g.mission_accepted ? 'allset'
          : g.rsvp_status === 'accepted' ? 'role'
          : 'invitation'
        setStep(start)
        if (p?.id) loadCrew(p.id)
        setLoading(false)
      })
  }, [guestCode])

  async function acceptInvitation() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ rsvp_status: 'accepted' }).eq('id', guest.id)
    setGuest(g => g ? { ...g, rsvp_status: 'accepted' } : g)
    fire()
    setStep('role')
    setSaving(false)
    if (party?.id) loadCrew(party.id)
  }

  async function declineInvitation() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ rsvp_status: 'declined' }).eq('id', guest.id)
    setGuest(g => g ? { ...g, rsvp_status: 'declined' } : g)
    setStep('declined')
    setSaving(false)
  }

  async function acceptMissions() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ mission_accepted: true, mission_status: 'submitted' }).eq('id', guest.id)
    setGuest(g => g ? { ...g, mission_accepted: true } : g)
    fire()
    setStep('allset')
    setSaving(false)
  }

  async function saveNote() {
    if (!guest || saving) return
    setSaving(true)
    await supabase.from('guests').update({ memory_favorite_moment: note }).eq('id', guest.id)
    setNoteSaved(true)
    setSaving(false)
    setTimeout(() => setNoteSaved(false), 2500)
  }

  async function uploadPhoto(file: File) {
    if (!guest || !party || uploadingPhoto) return
    setUploadingPhoto(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `memories/${party.id}/${guest.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('party-media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('party-media').getPublicUrl(path)
      const next = [...photos, data.publicUrl]
      setPhotos(next)
      await supabase.from('guests').update({ memory_photos: next }).eq('id', guest.id)
    }
    setUploadingPhoto(false)
  }

  // ── Mission progress (final screen) ──
  async function persistProgress(next: MissionProgress) {
    setProgress(next)
    if (guest) await supabase.from('guests').update({ mission_progress: next }).eq('id', guest.id)
  }

  function markComplete(key: string) {
    const cur = progress[key] ?? {}
    persistProgress({ ...progress, [key]: { ...cur, done: true } })
    setExpanded(e => ({ ...e, [key]: true }))
  }

  function markNotComplete(key: string) {
    const cur = progress[key] ?? {}
    persistProgress({ ...progress, [key]: { ...cur, done: false } })
    setExpanded(e => ({ ...e, [key]: false }))
  }

  async function saveMemory(key: string) {
    const cur = progress[key] ?? {}
    await persistProgress({ ...progress, [key]: { ...cur, note: noteDrafts[key] ?? '' } })
    setExpanded(e => ({ ...e, [key]: false }))
    setSavedFlash(f => ({ ...f, [key]: true }))
    setTimeout(() => setSavedFlash(f => ({ ...f, [key]: false })), 2400)
  }

  async function uploadEvidenceFiles(key: string, files: FileList) {
    if (!guest || !party || evidenceBusy) return
    setEvidenceBusy(key)
    const cur = progress[key] ?? {}
    const added: string[] = []
    const list = Array.from(files)
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `evidence/${party.id}/${guest.id}/${key}/${Date.now()}-${i}.${ext}`
      const { error } = await supabase.storage.from('party-media').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('party-media').getPublicUrl(path)
        added.push(data.publicUrl)
      }
    }
    const media = [...(cur.media ?? []), ...added]
    await persistProgress({ ...progress, [key]: { ...(progress[key] ?? {}), media } })
    setEvidenceBusy(null)
  }

  async function deleteEvidence(key: string, url: string) {
    const cur = progress[key] ?? {}
    const media = (cur.media ?? []).filter(u => u !== url)
    await persistProgress({ ...progress, [key]: { ...cur, media } })
    const marker = '/party-media/'
    const idx = url.indexOf(marker)
    if (idx >= 0) supabase.storage.from('party-media').remove([url.slice(idx + marker.length)])
  }

  function goMission(dir: number, count: number) {
    setMissionDir(dir)
    setActiveMission(i => Math.min(count - 1, Math.max(0, i + dir)))
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
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const sleeps = Math.round((partyDateObj.getTime() - today.getTime()) / 86400000)
  const countdownText =
    sleeps > 1 ? `${sleeps} sleeps until we set sail`
    : sleeps === 1 ? 'One sleep until we set sail'
    : sleeps === 0 ? "Today's the day. We set sail!"
    : 'The voyage has sailed'

  const targetMs = eventTargetMs(party.party_date, party.event_time)
  const notes = Array.isArray(party.event_notes) ? party.event_notes : []
  const links = Array.isArray(party.event_links) ? party.event_links : []
  const firstName = guest.name.split(' ')[0]
  const bdayName = party.birthday_person_name
  const fill = (s: string) => s.replace(/\{name\}/gi, firstName)
  const inviteHeadline = fill(party.invite_headline || `{name}, ${bdayName} is throwing a boat day 🚢`)
  const storyText = fill(party.party_story || `${bdayName} is gathering favorite people for an afternoon on the water. There will be snacks, sunshine, birthday chaos, and at least one group photo we'll pretend was effortless. We'd love you on the crew.`)
  const titlesLive = party.reveal_titles ?? true
  const missionsLive = party.reveal_missions ?? true
  const missionList = [
    guest.mission_easy && { key: 'easy', level: 'Easy', badge: '🟢', icon: '🌊', accent: 'var(--leaf)', tint: 'var(--leaf-soft)', text: guest.mission_easy },
    guest.mission_medium && { key: 'medium', level: 'Medium', badge: '🟡', icon: '🥂', accent: '#e0a93c', tint: 'var(--sunny-soft)', text: guest.mission_medium },
    guest.mission_legendary && { key: 'legendary', level: 'Legendary', badge: '🔥', icon: '🏆', accent: 'var(--coral)', tint: 'var(--coral-soft)', text: guest.mission_legendary },
  ].filter(Boolean) as { key: string; level: string; badge: string; icon: string; accent: string; tint: string; text: string }[]
  const missionsDone = missionList.filter(m => !!progress[m.key]?.done).length
  const sailDay = sleeps <= 0  // the birthday itself (or after) — countdown becomes celebration
  // Missions close 24h after the celebration, to build the newspaper.
  const missionsClosed = Date.now() > targetMs + 86400000

  const stepIn = { opacity: 0, x: 36 }
  const stepAnim = { opacity: 1, x: 0 }
  const stepOut = { opacity: 0, x: -36 }
  const stepT = { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }

  const sectionLabel = (text: string, color = 'var(--sky)') => (
    <p style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color, marginBottom: '0.8rem' }}>{text}</p>
  )

  const missionCardVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 70 : -70, scale: 0.96 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -70 : 70, scale: 0.96 }),
  }
  const activeIdx = Math.min(activeMission, Math.max(0, missionList.length - 1))
  const isVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ background: 'var(--riviera-bg)' }}>
      {/* Gradient blobs */}
      <div className="fixed pointer-events-none" style={{ top: '-12%', left: '-18%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,210,63,0.5) 0%, transparent 70%)', filter: 'blur(20px)' }} />
      <div className="fixed pointer-events-none" style={{ top: '4%', right: '-22%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,122,89,0.35) 0%, transparent 70%)', filter: 'blur(24px)' }} />
      <div className="fixed pointer-events-none" style={{ bottom: '-14%', left: '-10%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,182,230,0.32) 0%, transparent 70%)', filter: 'blur(26px)' }} />
      <div className="fixed pointer-events-none" style={{ bottom: '6%', right: '-16%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(247,168,196,0.34) 0%, transparent 70%)', filter: 'blur(22px)' }} />

      {(step === 'invitation' || step === 'role' || step === 'allset') && <MarinaBackdrop />}

      {showConfetti && <Confetti />}

      <div className="max-w-sm mx-auto px-5 relative z-10 min-h-screen flex flex-col">

        <StepDots current={step} />

        <AnimatePresence mode="wait">

          {/* ════════ SCREEN 1 — INVITATION ════════ */}
          {step === 'invitation' && (
            <motion.div key="invitation" initial={stepIn} animate={stepAnim} exit={stepOut} transition={stepT}
              className="flex-1 flex flex-col justify-center py-6 text-center">

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="tracking-[0.28em] uppercase mb-5" style={{ fontSize: '0.62rem', color: 'var(--coral)' }}>
                You're invited
              </motion.p>

              {/* Birthday person photo — the emotional anchor */}
              <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }}
                className="relative mx-auto mb-6" style={{ width: '100%', maxWidth: 360 }}>

                {/* sun-reflection sparkles */}
                {[
                  { top: -8 as number | undefined, bottom: undefined as number | undefined, left: '14%', s: 8, d: '0s' },
                  { top: 22 as number | undefined, bottom: undefined as number | undefined, left: '-3%', s: 6, d: '1.1s' },
                  { top: -10 as number | undefined, bottom: undefined as number | undefined, left: '84%', s: 7, d: '0.5s' },
                  { top: undefined as number | undefined, bottom: -7 as number | undefined, left: '88%', s: 6, d: '1.7s' },
                ].map((sp, i) => (
                  <span key={i} className="marina-anim" style={{ position: 'absolute', top: sp.top, bottom: sp.bottom, left: sp.left, width: sp.s, height: sp.s, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(255,210,63,0.6) 55%, transparent 100%)', animation: `twinkle 3.4s ease-in-out ${sp.d} infinite`, zIndex: 4 }} />
                ))}

                <div className="rounded-[2rem] overflow-hidden mx-auto relative" style={{ width: '100%', border: '7px solid #fff', boxShadow: party.birthday_person_photo ? '0 22px 54px rgba(45,58,74,0.26)' : '0 22px 54px rgba(255,122,89,0.32)', ...(party.birthday_person_photo ? {} : { aspectRatio: '9 / 10' }) }}>
                  {party.birthday_person_photo ? (
                    <img src={party.birthday_person_photo} alt={bdayName} className="w-full" decoding="async" loading="eager" draggable={false} style={{ display: 'block', height: 'auto' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--sunny), var(--coral))', color: '#fff', fontSize: '6rem', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                      {bdayName[0]}
                    </div>
                  )}
                  <PhotoWaves />
                </div>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.9rem', fontWeight: 700, color: 'var(--riviera-ink)', lineHeight: 1.2, marginBottom: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {inviteHeadline}
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.32 }}
                className="text-[0.97rem] leading-[1.85] mb-2" style={{ color: 'var(--riviera-ink-soft)', whiteSpace: 'pre-wrap' }}>
                {storyText}
              </motion.p>

              {crew.length > 0 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="text-sm mt-3" style={{ color: 'var(--riviera-ink-soft)' }}>
                  🍋 <span style={{ fontWeight: 700, color: 'var(--coral)' }}>{crew.length}</span>
                  {crew.length === 1 ? ' friend is' : ' friends'} already aboard
                </motion.p>
              )}

              <div className="pt-7 pb-4">
                <button onClick={acceptInvitation} disabled={saving}
                  className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-50"
                  style={{ background: 'var(--sunny)', color: 'var(--riviera-ink)', boxShadow: '0 8px 24px rgba(255,210,63,0.45)' }}>
                  {saving ? 'One sec…' : 'I accept the invitation 🎉'}
                </button>
                <button onClick={declineInvitation} disabled={saving}
                  className="w-full py-3 mt-1.5 text-sm font-medium" style={{ color: 'var(--riviera-ink-soft)', opacity: 0.5 }}>
                  I can't make it
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ SCREEN 2 — ROLE REVEAL ════════ */}
          {step === 'role' && (
            <motion.div key="role" initial={stepIn} animate={stepAnim} exit={stepOut} transition={stepT}
              className="flex-1 flex flex-col justify-center py-6 text-center">

              {/* Guest photo — squared, matching the birthday portrait, same marina animation */}
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.05, type: 'spring', stiffness: 180 }}
                className="relative mx-auto mb-4" style={{ width: 232 }}>

                {/* sun-reflection sparkles */}
                {[
                  { top: -8 as number | undefined, bottom: undefined as number | undefined, left: '12%', s: 7, d: '0s' },
                  { top: 24 as number | undefined, bottom: undefined as number | undefined, left: '-4%', s: 5, d: '1.1s' },
                  { top: -10 as number | undefined, bottom: undefined as number | undefined, left: '86%', s: 6, d: '0.5s' },
                ].map((sp, i) => (
                  <span key={i} className="marina-anim" style={{ position: 'absolute', top: sp.top, bottom: sp.bottom, left: sp.left, width: sp.s, height: sp.s, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(255,210,63,0.6) 55%, transparent 100%)', animation: `twinkle 3.4s ease-in-out ${sp.d} infinite`, zIndex: 4 }} />
                ))}

                {guest.photo ? (
                  <div className="w-full rounded-[1.75rem] overflow-hidden relative" style={{ border: '6px solid #fff', boxShadow: '0 16px 42px rgba(45,58,74,0.26)' }}>
                    <img src={guest.photo} alt={firstName} className="w-full" decoding="async" loading="eager" draggable={false} style={{ display: 'block', height: 'auto' }} />
                    <PhotoWaves />
                  </div>
                ) : (
                  <div className="w-full rounded-[1.75rem] flex items-center justify-center relative overflow-hidden" style={{ aspectRatio: '9 / 10', background: 'linear-gradient(135deg, var(--sunny), var(--coral))', border: '6px solid #fff', color: '#fff', fontSize: '4rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, boxShadow: '0 16px 42px rgba(255,122,89,0.3)' }}>
                    {firstName[0]}
                    <PhotoWaves />
                  </div>
                )}
                <span style={{ position: 'absolute', bottom: -8, right: -8, fontSize: '1.9rem', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.15))', zIndex: 5 }}>🎉</span>
              </motion.div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '1.4rem' }}>
                You're officially aboard, {firstName}!
              </motion.p>

              {/* Countdown */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mx-auto mb-7"
                style={{ background: '#fff', color: 'var(--coral)', boxShadow: '0 6px 20px rgba(255,122,89,0.2)', fontWeight: 700 }}>
                ⛵ {countdownText}
              </motion.div>

              {/* Role */}
              {titlesLive && guest.role_name ? (
                <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-3xl px-6 py-7 mb-2"
                  style={{ background: 'linear-gradient(135deg, var(--sunny-soft) 0%, var(--coral-soft) 100%)', boxShadow: '0 10px 30px rgba(255,180,120,0.26)' }}>
                  <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--coral)', marginBottom: '0.5rem' }}>
                    You are now officially the
                  </p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.55rem', fontWeight: 700, color: 'var(--riviera-ink)', lineHeight: 1.2, marginBottom: guest.role_description ? '0.7rem' : 0 }}>
                    {guest.role_name}
                  </p>
                  {guest.role_description && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>{guest.role_description}</p>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
                  className="rounded-3xl px-6 py-7 mb-2 text-center" style={{ background: '#fff', boxShadow: '0 10px 30px rgba(45,58,74,0.08)', border: '1.5px dashed var(--coral-soft)' }}>
                  <p style={{ fontSize: '1.7rem', marginBottom: '0.3rem' }}>🎁</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.3rem' }}>
                    Your title is still with the Captain
                  </p>
                  <p className="text-sm" style={{ color: 'var(--riviera-ink-soft)' }}>Revealed closer to departure. Keep an eye out 👀</p>
                </motion.div>
              )}

              <div className="pt-7 pb-4">
                <button onClick={() => setStep('missions')}
                  className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all"
                  style={{ background: 'var(--coral)', color: '#fff', boxShadow: '0 8px 24px rgba(255,122,89,0.4)' }}>
                  Reveal my missions →
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════ SCREEN 3 — MISSIONS ════════ */}
          {step === 'missions' && (
            <motion.div key="missions" initial={stepIn} animate={stepAnim} exit={stepOut} transition={stepT}
              className="flex-1 flex flex-col justify-center py-6">

              <div className="text-center mb-6">
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.45rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.3rem' }}>
                  Your 3 boat-day missions
                </p>
                <p className="text-sm" style={{ color: 'var(--riviera-ink-soft)' }}>
                  Made for real life, not your phone. Pick whichever feel right on the day.
                </p>
              </div>

              {missionsLive && missionList.length > 0 ? (
                <>
                  <div className="flex flex-col gap-3 mb-2">
                    {missionList.map((m, i) => (
                      <MissionCard key={m.key} level={m.level} badge={m.badge} accent={m.accent} tint={m.tint} text={m.text} delay={0.1 + i * 0.1} />
                    ))}
                  </div>
                  <div className="pt-7 pb-4">
                    <button onClick={acceptMissions} disabled={saving}
                      className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-50"
                      style={{ background: 'var(--sunny)', color: 'var(--riviera-ink)', boxShadow: '0 8px 24px rgba(255,210,63,0.45)' }}>
                      {saving ? 'Saving…' : 'I accept my boat-day missions ✋'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-3xl px-6 py-8 text-center" style={{ background: '#fff', boxShadow: '0 10px 30px rgba(45,58,74,0.08)', border: '1.5px dashed var(--sunny)' }}>
                    <p style={{ fontSize: '1.9rem', marginBottom: '0.4rem' }}>🤫</p>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.3rem' }}>
                      Your missions are sealed
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>
                      The Captain releases them closer to the day. We'll let you know the moment they unlock 🍋
                    </p>
                  </div>
                  <div className="pt-7 pb-4">
                    <button onClick={() => setStep('allset')}
                      className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all"
                      style={{ background: 'var(--coral)', color: '#fff', boxShadow: '0 8px 24px rgba(255,122,89,0.4)' }}>
                      Got it — see you on the boat 🌊
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ════════ ALL SET (home base after accepting) ════════ */}
          {step === 'allset' && (
            <motion.div key="allset" initial={stepIn} animate={stepAnim} exit={stepOut} transition={stepT}
              className="flex-1 py-6">

              {/* ── HERO: birthday photo + floating countdown ── */}
              <div className="relative mb-7">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
                  className="rounded-[2rem] overflow-hidden relative mx-auto" style={{ width: '100%', border: '7px solid #fff', boxShadow: '0 22px 54px rgba(45,58,74,0.26)', ...(party.birthday_person_photo ? {} : { aspectRatio: '9 / 10' }) }}>
                  {party.birthday_person_photo ? (
                    <img src={party.birthday_person_photo} alt={bdayName} className="w-full" decoding="async" draggable={false} style={{ display: 'block', height: 'auto' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--sunny), var(--coral))', color: '#fff', fontSize: '6rem', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{bdayName[0]}</div>
                  )}
                  <PhotoWaves />
                </motion.div>

                {/* Floating badge overlapping the photo — countdown, or celebration on the day */}
                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative mx-auto rounded-3xl px-4 py-5 overflow-hidden"
                  style={{ width: '92%', marginTop: -46, zIndex: 6,
                    background: sailDay ? 'linear-gradient(135deg, var(--sunny), var(--coral))' : '#fff',
                    boxShadow: sailDay ? '0 18px 44px rgba(255,122,89,0.4)' : '0 18px 44px rgba(45,58,74,0.18)' }}>
                  {sailDay ? (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-1.5 mb-2">
                        <motion.span animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                          style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>
                          The voyage is underway
                        </span>
                      </div>
                      <motion.p animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.7rem', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '0.45rem' }}>
                        🎉 {sleeps === 0 ? 'Today We Sail' : 'The Voyage Has Sailed'}
                      </motion.p>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>The voyage has officially begun.</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.82)' }}>Captain {bdayName}'s crew has been called to duty.</p>

                      {missionList.length > 0 && (
                        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)' }}>
                          <p style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)', marginBottom: '0.3rem', fontWeight: 700 }}>
                            🎯 Today's mission status
                          </p>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>
                            {missionsDone === missionList.length ? 'All missions complete 🏆' : `${missionsDone} of ${missionList.length} completed`}
                          </p>
                          <div className="mt-2 rounded-full overflow-hidden" style={{ height: 6, background: 'rgba(255,255,255,0.3)' }}>
                            <div style={{ height: '100%', width: `${(missionsDone / missionList.length) * 100}%`, background: '#fff', borderRadius: 99, transition: 'width 0.4s ease' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <CountdownHero target={targetMs} subline="The crew is assembling. See you on the water 🌊" />
                  )}
                </motion.div>
              </div>

              {/* ── CREW IS BOARDING (collapsed by default) ── */}
              {crew.length > 0 && (
                <div className="mb-7 rounded-3xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}>
                  <button onClick={() => setCrewOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:scale-[0.99] transition-all">
                    <div className="flex items-center flex-shrink-0">
                      {crew.slice(0, 5).map((c, i) => (
                        <div key={i} className="rounded-full overflow-hidden flex items-center justify-center"
                          style={{ width: 30, height: 30, marginLeft: i === 0 ? 0 : -10, border: '2px solid #fff', background: 'linear-gradient(135deg, var(--sunny-soft), var(--coral-soft))', color: 'var(--coral)', fontSize: 11, fontWeight: 700, zIndex: 5 - i }}>
                          {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" /> : (c.name?.[0] ?? '⚓')}
                        </div>
                      ))}
                      {crew.length > 5 && (
                        <div className="rounded-full flex items-center justify-center" style={{ width: 30, height: 30, marginLeft: -10, border: '2px solid #fff', background: 'var(--sky-soft)', color: 'var(--sky)', fontSize: 10, fontWeight: 700 }}>
                          +{crew.length - 5}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: 'var(--riviera-ink)' }}>⚓ Crew Is Boarding</p>
                      <p className="text-xs" style={{ color: 'var(--riviera-ink-soft)' }}>{crew.length} crew member{crew.length === 1 ? '' : 's'} confirmed</p>
                    </div>
                    <span style={{ color: 'var(--riviera-ink-soft)', fontSize: 10, opacity: 0.6 }}>{crewOpen ? '▲' : '▼'}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {crewOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                        <div className="px-4 pb-6 pt-2 flex flex-wrap justify-center gap-x-3 gap-y-5" style={{ background: 'var(--riviera-bg)' }}>
                          {crew.map((c, i) => {
                            const rot = [-5, 4, -3, 6, -6, 3, -2, 5][i % 8]
                            return (
                              <motion.div key={i}
                                initial={{ opacity: 0, y: 12, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: rot }}
                                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                                style={{ width: 92, background: '#fff', boxShadow: '0 6px 18px rgba(45,58,74,0.18)', borderRadius: 6 }}
                                className="p-1.5 pb-2.5">
                                {c.photo
                                  ? <img src={c.photo} alt="" className="w-full aspect-square object-cover" style={{ borderRadius: 3 }} />
                                  : <div className="w-full aspect-square flex items-center justify-center" style={{ borderRadius: 3, background: 'linear-gradient(135deg, var(--sunny), var(--coral))', color: '#fff', fontSize: '1.8rem', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{c.name?.[0] ?? '⚓'}</div>}
                                <p className="text-center mt-1.5" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--riviera-ink)' }}>{c.name?.split(' ')[0]}</p>
                              </motion.div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── MISSIONS: swipeable deck ── */}
              {missionsLive && missionList.length > 0 && (() => {
                const m = missionList[activeIdx]
                const p = progress[m.key] ?? {}
                const done = !!p.done
                const media = p.media ?? []
                const isOpen = !!expanded[m.key]
                const flashed = !!savedFlash[m.key]
                const photoCount = media.filter(u => !isVideo(u)).length
                const videoCount = media.filter(isVideo).length
                const hasStory = !!(p.note && p.note.trim())
                return (
                  <div className="mb-7">
                    <p className="text-center mb-1" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--riviera-ink)' }}>
                      🎯 You have {missionList.length} mission{missionList.length === 1 ? '' : 's'} to accomplish
                    </p>
                    <p className="text-center text-xs mb-4" style={{ color: 'var(--riviera-ink-soft)' }}>
                      Mission {activeIdx + 1} of {missionList.length} · swipe to flip through
                    </p>

                    <div className="flex items-start gap-1.5">
                      <button onClick={() => goMission(-1, missionList.length)} disabled={activeIdx === 0} aria-label="Previous mission"
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg disabled:opacity-25 transition-all active:scale-90"
                        style={{ background: '#fff', color: 'var(--coral)', boxShadow: '0 4px 14px rgba(45,58,74,0.1)', marginTop: 100 }}>‹</button>

                      <div className="flex-1 relative" style={{ minHeight: 300 }}>
                        <AnimatePresence custom={missionDir} mode="wait">
                          <motion.div key={m.key} custom={missionDir} variants={missionCardVariants}
                            initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
                            onDragEnd={(_, info) => {
                              if (info.offset.x < -55 && activeIdx < missionList.length - 1) goMission(1, missionList.length)
                              else if (info.offset.x > 55 && activeIdx > 0) goMission(-1, missionList.length)
                            }}
                            className="rounded-3xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 12px 34px rgba(45,58,74,0.12)', cursor: 'grab' }}>
                            <div style={{ height: 6, background: m.accent }} />
                            <div className="px-5 py-5" style={{ background: m.tint }}>
                              <div className="flex items-center justify-between mb-3">
                                <span style={{ fontSize: '2rem' }}>{m.icon}</span>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: '#fff', color: m.accent }}>{m.badge} {m.level}</span>
                              </div>
                              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--riviera-ink)', minHeight: 60 }}>{m.text}</p>

                              {/* completion + memory capture — lives inside this mission card */}
                              <div onPointerDown={e => e.stopPropagation()}>

                                {/* STATE 1 — not complete */}
                                {!done && (
                                  missionsClosed ? (
                                    <p className="text-center text-xs py-2" style={{ color: 'var(--riviera-ink-soft)' }}>📰 Submissions are closed</p>
                                  ) : (
                                    <button onClick={() => markComplete(m.key)}
                                      className="w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                                      style={{ background: 'var(--leaf)', color: '#fff' }}>
                                      Mark as Complete
                                    </button>
                                  )
                                )}

                                {/* STATE 2 — complete + capturing/editing */}
                                {done && isOpen && (
                                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-bold" style={{ color: 'var(--leaf)' }}>✅ Mission Accomplished</p>
                                      {!missionsClosed && (
                                        <button onClick={() => markNotComplete(m.key)} className="text-xs underline" style={{ color: 'var(--riviera-ink-soft)' }}>Undo</button>
                                      )}
                                    </div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--riviera-ink)' }}>Help us remember this moment.</p>
                                    <p className="text-xs mb-3" style={{ color: 'var(--riviera-ink-soft)' }}>Photos and your story become part of {bdayName}'s birthday newspaper. Add either, or both.</p>

                                    {media.length > 0 && (
                                      <div className="grid grid-cols-3 gap-2 mb-3">
                                        {media.map((url, i) => (
                                          <div key={i} className="relative">
                                            {isVideo(url)
                                              ? <video src={url} controls className="w-full aspect-square object-cover rounded-xl" />
                                              : <img src={url} alt="" className="w-full aspect-square object-cover rounded-xl" />}
                                            <button onClick={() => deleteEvidence(m.key, url)} aria-label="Delete"
                                              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                              style={{ background: 'var(--coral)', color: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>×</button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <label className="block mb-3">
                                      <div className="w-full py-3 rounded-2xl font-bold text-sm text-center active:scale-95 transition-all cursor-pointer"
                                        style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>
                                        {evidenceBusy === m.key ? 'Uploading…' : '📷 Add Photos or Videos'}
                                      </div>
                                      <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={!!evidenceBusy}
                                        onChange={e => { if (e.target.files && e.target.files.length) uploadEvidenceFiles(m.key, e.target.files); e.currentTarget.value = '' }} />
                                    </label>

                                    <textarea
                                      value={noteDrafts[m.key] ?? ''}
                                      onChange={e => setNoteDrafts(d => ({ ...d, [m.key]: e.target.value }))}
                                      rows={3} placeholder="✍️ Add your story — what happened?"
                                      className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none mb-3"
                                      style={{ background: '#fff', color: 'var(--riviera-ink)', border: '1.5px solid rgba(45,58,74,0.12)' }} />

                                    <button onClick={() => saveMemory(m.key)} disabled={evidenceBusy === m.key}
                                      className="w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
                                      style={{ background: 'var(--coral)', color: '#fff' }}>
                                      Save memory
                                    </button>
                                  </motion.div>
                                )}

                                {/* STATE 3 — complete + collapsed summary */}
                                {done && !isOpen && (
                                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    {flashed && (
                                      <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                        className="text-center text-sm font-bold mb-2" style={{ color: 'var(--leaf)' }}>🎉 Memory saved</motion.p>
                                    )}
                                    <p className="text-sm font-bold mb-2" style={{ color: 'var(--leaf)' }}>✅ Mission Accomplished</p>
                                    <div className="flex flex-col gap-1 mb-3">
                                      {photoCount > 0 && <p className="text-xs" style={{ color: 'var(--riviera-ink-soft)' }}>📸 {photoCount} photo{photoCount === 1 ? '' : 's'}</p>}
                                      {videoCount > 0 && <p className="text-xs" style={{ color: 'var(--riviera-ink-soft)' }}>🎬 {videoCount} video{videoCount === 1 ? '' : 's'}</p>}
                                      {hasStory && <p className="text-xs" style={{ color: 'var(--riviera-ink-soft)' }}>✍️ Story added</p>}
                                      {photoCount === 0 && videoCount === 0 && !hasStory && <p className="text-xs" style={{ color: 'var(--riviera-ink-soft)' }}>No photos or story yet</p>}
                                    </div>
                                    {missionsClosed ? (
                                      <p className="text-xs" style={{ color: 'var(--riviera-ink-soft)', opacity: 0.7 }}>📰 Submissions closed — building the newspaper</p>
                                    ) : (
                                      <button onClick={() => setExpanded(e => ({ ...e, [m.key]: true }))}
                                        className="w-full py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                                        style={{ background: '#fff', color: 'var(--coral)', border: '1.5px solid var(--coral-soft)' }}>
                                        Edit Contribution
                                      </button>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      <button onClick={() => goMission(1, missionList.length)} disabled={activeIdx === missionList.length - 1} aria-label="Next mission"
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg disabled:opacity-25 transition-all active:scale-90"
                        style={{ background: '#fff', color: 'var(--coral)', boxShadow: '0 4px 14px rgba(45,58,74,0.1)', marginTop: 100 }}>›</button>
                    </div>

                    {/* dots */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {missionList.map((mm, i) => (
                        <div key={mm.key} style={{ width: i === activeIdx ? 18 : 6, height: 6, borderRadius: 99, background: i === activeIdx ? 'var(--coral)' : 'rgba(45,58,74,0.16)', transition: 'all 0.3s ease' }} />
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* ── CAPTAIN'S NOTES ── */}
              {notes.length > 0 && (
                <div className="rounded-3xl px-5 py-5 mb-4" style={{ background: 'var(--leaf-soft)' }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.2rem' }}>
                    📝 Captain's Notes
                  </p>
                  <p className="text-xs mb-4" style={{ color: 'var(--riviera-ink-soft)' }}>A few tiny things from the captain before we set sail.</p>
                  <div className="flex flex-col gap-3.5">
                    {notes.map((n, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {n.icon && <span style={{ fontSize: 17, marginTop: 1, flexShrink: 0 }}>{n.icon}</span>}
                        <div className="flex-1">
                          {n.title && <p className="text-sm font-bold" style={{ color: 'var(--riviera-ink)' }}>{n.title}</p>}
                          <p className="text-sm leading-relaxed" style={{ color: n.title ? 'var(--riviera-ink-soft)' : 'var(--riviera-ink)' }}>{n.text}</p>
                          {n.link && (
                            <a href={n.link} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all"
                              style={{ background: 'var(--leaf)', color: '#fff', textDecoration: 'none' }}>
                              {n.button_label || 'Open'} →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── DEPARTURE DETAILS ── */}
              <div className="rounded-3xl px-5 py-4 mb-4" style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}>
                {sectionLabel('Departure details')}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start gap-3">
                    <span style={{ fontSize: 15, marginTop: 1 }}>📅</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--riviera-ink)' }}>{partyDate}</p>
                      {party.event_time && <p className="text-xs mt-0.5" style={{ color: 'var(--riviera-ink-soft)' }}>{party.event_time}</p>}
                    </div>
                  </div>
                  {party.event_location && (
                    <div className="flex items-start gap-3"><span style={{ fontSize: 15, marginTop: 1 }}>📍</span><p className="text-sm" style={{ color: 'var(--riviera-ink)' }}>{party.event_location}</p></div>
                  )}
                  {party.meeting_point && (
                    <div className="flex items-start gap-3"><span style={{ fontSize: 15, marginTop: 1 }}>🚢</span><p className="text-sm" style={{ color: 'var(--riviera-ink)' }}>{party.meeting_point}</p></div>
                  )}
                </div>
              </div>

              {links.length > 0 && (
                <div className="flex flex-col gap-2 mb-2">
                  {links.map((l, i) => (
                    <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-5 py-3.5 rounded-2xl active:scale-95 transition-all"
                      style={{ background: '#fff', boxShadow: '0 4px 16px rgba(45,58,74,0.06)', color: 'var(--sky)', textDecoration: 'none' }}>
                      <span className="text-sm font-semibold">{l.label}</span><span style={{ opacity: 0.5, fontSize: 12 }}>↗</span>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════ SCREEN 4 — THE CAPTAIN'S LOG ════════ */}
          {step === 'captainslog' && (
            <motion.div key="captainslog" initial={stepIn} animate={stepAnim} exit={stepOut} transition={stepT}
              className="flex-1 flex flex-col justify-center py-8">

              <div className="text-center mb-6 pt-4">
                <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, type: 'spring', stiffness: 200 }} style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>⛵</motion.p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.55rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.4rem' }}>
                  Boat Day Complete
                </p>
                {guest.role_name && (
                  <p className="text-sm" style={{ color: 'var(--riviera-ink-soft)' }}>
                    You successfully served as <span style={{ fontWeight: 700, color: 'var(--coral)' }}>{guest.role_name}</span>.
                  </p>
                )}
              </div>

              {missionList.length > 0 && (
                <div className="rounded-3xl px-5 py-4 mb-4" style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}>
                  {sectionLabel('Missions completed', 'var(--leaf)')}
                  <div className="flex flex-col gap-2.5">
                    {missionList.map(m => (
                      <div key={m.level} className="flex items-start gap-2.5">
                        <span style={{ fontSize: 15, marginTop: 1 }}>✅</span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink)' }}>{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-3xl px-5 py-5 mb-4 text-center" style={{ background: 'linear-gradient(135deg, var(--coral-soft), var(--blossom))' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink)' }}>
                  Thanks for being part of {bdayName}'s birthday. This day wouldn't have been the same without you ❤️
                </p>
              </div>

              {/* Leave a note */}
              <div className="rounded-3xl px-5 py-5 mb-4" style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}>
                {sectionLabel(`A message for ${bdayName}`, 'var(--coral)')}
                <p className="text-sm mb-3" style={{ color: 'var(--riviera-ink-soft)' }}>
                  What do you want {bdayName} to remember from today? A favorite moment, a funny memory, a birthday wish.
                </p>
                <textarea value={note} onChange={e => { setNote(e.target.value); setNoteSaved(false) }} rows={4}
                  placeholder="Type your note…"
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
                  style={{ background: 'var(--riviera-bg)', color: 'var(--riviera-ink)', border: '1.5px solid rgba(45,58,74,0.1)' }} />
                <button onClick={saveNote} disabled={saving || !note.trim()}
                  className="w-full py-3.5 mt-3 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: noteSaved ? 'var(--leaf-soft)' : 'var(--coral)', color: noteSaved ? 'var(--leaf)' : '#fff' }}>
                  {saving ? 'Saving…' : noteSaved ? '✓ Saved for ' + bdayName : `Leave a note for ${bdayName}`}
                </button>
              </div>

              {/* Photos */}
              <div className="rounded-3xl px-5 py-5" style={{ background: '#fff', boxShadow: '0 6px 22px rgba(45,58,74,0.07)' }}>
                {sectionLabel('Share your photos', 'var(--sky)')}
                <p className="text-sm mb-3" style={{ color: 'var(--riviera-ink-soft)' }}>
                  Got a photo from boat day? Add it to the memory book.
                </p>
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {photos.map((p, i) => (
                      <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-xl" />
                    ))}
                  </div>
                )}
                <label className="block">
                  <div className="w-full py-3.5 rounded-2xl font-bold text-sm text-center active:scale-95 transition-all cursor-pointer"
                    style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>
                    {uploadingPhoto ? 'Uploading…' : '📷 Upload a photo'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
                </label>
              </div>

            </motion.div>
          )}

          {/* ════════ DECLINED ════════ */}
          {step === 'declined' && (
            <motion.div key="declined" initial={stepIn} animate={stepAnim} exit={stepOut} transition={stepT}
              className="flex-1 flex flex-col items-center justify-center py-8 text-center">
              <p style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>🥲</p>
              <p className="text-base leading-relaxed mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: 'var(--riviera-ink)' }}>
                You'll be missed.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--riviera-ink-soft)' }}>
                {bdayName} will understand. Probably.
              </p>
              <button onClick={acceptInvitation} className="text-sm font-semibold mt-6 underline" style={{ color: 'var(--coral)' }}>
                Wait — actually I can make it
              </button>
            </motion.div>
          )}

        </AnimatePresence>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="text-center pb-6 pt-2" style={{ color: 'var(--riviera-ink-soft)', opacity: 0.4, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Made with love by Pili
        </motion.p>

      </div>
    </main>
  )
}
