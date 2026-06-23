'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party, Guest, Newspaper, Tribute } from '@/types/database'

const PAPER = '#f4efe1'
const INK = '#2a2620'
const INK_SOFT = '#6b6356'
const serif = "'Playfair Display', Georgia, serif"
const body = "Georgia, 'Times New Roman', serif"

const isVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)

export default function BirthdayNewspaperPage({ params }: { params: Promise<{ partyId: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen" style={{ background: PAPER }} />}>
      <BirthdayNewspaper params={params} />
    </Suspense>
  )
}

function BirthdayNewspaper({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = use(params)
  const search = useSearchParams()
  const hostMode = search.get('host') === '1'
  const [party, setParty] = useState<Party | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [tributes, setTributes] = useState<Tribute[]>([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<string[]>([])
  const [bottlesOpen, setBottlesOpen] = useState(false)
  const [printing, setPrinting] = useState(false)

  function downloadPdf() {
    setPrinting(true)
    setBottlesOpen(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrinting(false), 600)
    }, 450)
  }

  async function downloadImage(url: string) {
    const fallbackName = (url.split('/').pop() || 'photo').split('?')[0]
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      const obj = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = obj
      a.download = fallbackName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(obj), 3000)
    } catch {
      // iOS Safari / CORS fallback: open full image so they can long-press → Save
      window.open(url, '_blank')
    }
  }

  useEffect(() => {
    Promise.all([
      supabase.from('parties').select('*').eq('id', partyId).single(),
      supabase.from('guests').select('*').eq('party_id', partyId).eq('rsvp_status', 'accepted').order('created_at'),
      supabase.from('tributes').select('*').eq('party_id', partyId).order('created_at'),
    ]).then(([{ data: p }, { data: g }, t]) => {
      setParty(p)
      setGuests((g ?? []).filter((x: Guest) => x.name))
      setTributes((t?.data ?? []) as Tribute[])
      const npHidden = (p?.newspaper as Newspaper | undefined)?.hidden
      setHidden(Array.isArray(npHidden) ? npHidden : [])
      setLoading(false)
    })
  }, [partyId])

  async function toggleHidden(key: string) {
    if (!party) return
    const next = hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key]
    setHidden(next)
    const np = { ...(party.newspaper ?? {}), hidden: next }
    await supabase.from('parties').update({ newspaper: np }).eq('id', partyId)
    setParty(p => p ? { ...p, newspaper: np } : p)
  }

  const [uploadingHostPhoto, setUploadingHostPhoto] = useState(false)
  async function uploadHostPhotos(files: FileList) {
    if (!party || uploadingHostPhoto || !files.length) return
    setUploadingHostPhoto(true)
    const np0: Newspaper = party.newspaper ?? {}
    const existing = Array.isArray(np0.host_photos) ? np0.host_photos : []
    const added: string[] = []
    const list = Array.from(files)
    for (let i = 0; i < list.length; i++) {
      const f = list[i]
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `newspaper/${partyId}/${Date.now()}-${i}.${ext}`
      const { error } = await supabase.storage.from('party-media').upload(path, f, { upsert: true })
      if (!error) { const { data } = supabase.storage.from('party-media').getPublicUrl(path); added.push(data.publicUrl) }
    }
    const np = { ...np0, host_photos: [...existing, ...added] }
    const { error: upErr } = await supabase.from('parties').update({ newspaper: np }).eq('id', partyId)
    if (!upErr) setParty(p => p ? { ...p, newspaper: np } : p)
    else alert('Couldn\'t save photos. Run the one-line "newspaper" column SQL Pili gave you, then try again.')
    setUploadingHostPhoto(false)
  }
  async function removeHostPhoto(url: string) {
    if (!party) return
    const np0: Newspaper = party.newspaper ?? {}
    const existing = Array.isArray(np0.host_photos) ? np0.host_photos : []
    const np = { ...np0, host_photos: existing.filter(u => u !== url) }
    await supabase.from('parties').update({ newspaper: np }).eq('id', partyId)
    setParty(p => p ? { ...p, newspaper: np } : p)
    const marker = '/party-media/'
    const idx = url.indexOf(marker)
    if (idx >= 0) supabase.storage.from('party-media').remove([url.slice(idx + marker.length)])
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
      <p style={{ color: INK, opacity: 0.4, fontFamily: serif, fontStyle: 'italic' }}>Printing the morning edition…</p>
    </main>
  )
  if (!party) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: PAPER }}>
      <p style={{ color: INK_SOFT, fontFamily: serif, fontStyle: 'italic' }}>This edition wasn't found.</p>
    </main>
  )

  const np: Newspaper = party.newspaper ?? {}
  const bday = party.birthday_person_name
  const dateLine = new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const cover = np.cover_photo || party.birthday_person_photo
  const headline = np.headline || `Captain ${bday} Takes the Day`
  const subheadline = np.subheadline || 'Crew confirms: excellent birthday, questionable navigation, strong snack performance.'
  const captainsLog = np.captains_log || `On a sunny afternoon, Captain ${bday} gathered the crew for one very important voyage. There were snacks, music, tiny missions, and enough birthday energy to make a Duffy boat feel like a yacht. The navigation was questionable. The company was not.`
  const show = (key: string) => !hidden.includes(key)

  const roster = guests.filter(g => g.role_name)
  const highlights = guests.flatMap(g => {
    const mp = g.mission_progress ?? {}
    return ([['easy', g.mission_easy], ['medium', g.mission_medium], ['legendary', g.mission_legendary]] as const)
      .filter(([k, txt]) => txt && mp[k]?.done)
      .map(([k, txt]) => ({ key: `m:${g.id}:${k}`, name: g.name.split(' ')[0], text: txt as string }))
  }).filter(h => show(h.key))
  const notes = guests
    .filter(g => g.memory_favorite_moment && g.memory_favorite_moment.trim())
    .map(g => ({ key: `note:${g.id}`, name: g.name.split(' ')[0], text: g.memory_favorite_moment! }))
    .filter(n => show(n.key))
  const photos: { url: string; name: string; mission?: string }[] = []
  ;(np.host_photos ?? []).forEach(u => photos.push({ url: u, name: 'The host' }))
  guests.forEach(g => {
    const first = g.name.split(' ')[0]
    ;(Array.isArray(g.memory_photos) ? g.memory_photos : []).forEach(u => photos.push({ url: u, name: first }))
    const mp = g.mission_progress ?? {}
    const tierText: Record<string, string | null> = { easy: g.mission_easy, medium: g.mission_medium, legendary: g.mission_legendary }
    for (const [tier, e] of Object.entries(mp)) {
      const cap = (e?.done && tierText[tier]) ? (tierText[tier] as string) : undefined
      ;(e?.media ?? []).forEach(u => photos.push({ url: u, name: first, mission: cap }))
    }
  })
  const visiblePhotos = photos.filter(p => show(p.url))
  const hostPhotoSet = new Set(np.host_photos ?? [])
  const visibleTributes = tributes.filter(t => show('bottle:' + t.id))

  const Rule = ({ thick }: { thick?: boolean }) => <div style={{ borderTop: `${thick ? 3 : 1}px solid ${INK}` }} />
  const HideBtn = ({ k }: { k: string }) => hostMode ? (
    <button onClick={() => toggleHidden(k)} className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: hidden.includes(k) ? '#c4622d' : 'rgba(0,0,0,0.6)', color: '#fff' }}>
      {hidden.includes(k) ? 'show' : 'hide'}
    </button>
  ) : null

  return (
    <main className="min-h-screen py-6 px-3 np-paper-wrap" style={{ background: '#e7e0cf', fontFamily: body, color: INK }}>
      {/* Download as PDF — little button at the top */}
      <div className="no-print max-w-2xl mx-auto flex justify-end mb-2">
        <button onClick={downloadPdf}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold active:scale-95 transition-all"
          style={{ background: INK, color: PAPER, boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
          📄 {printing ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto np-paper" style={{ background: PAPER, boxShadow: '0 10px 50px rgba(0,0,0,0.18)', padding: '28px 22px' }}>

        {hostMode && (
          <div className="mb-4 px-3 py-2 rounded text-center text-xs" style={{ background: INK, color: PAPER }}>
            Host preview · tap “hide” on anything to keep it out of Isaac’s gift
          </div>
        )}

        {/* ── MASTHEAD ── */}
        <div className="text-center">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest" style={{ color: INK_SOFT }}>
            <span>Vol. 1 · No. 1</span>
            <span>One Cent</span>
          </div>
          <Rule />
          <h1 style={{ fontFamily: serif, fontSize: 'clamp(2.2rem, 9vw, 3.4rem)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, margin: '0.4rem 0' }}>
            The Boat Day Times
          </h1>
          <Rule />
          <p className="text-[10px] uppercase tracking-[0.25em] py-1.5" style={{ color: INK_SOFT }}>
            {dateLine} · {party.event_location || 'On the Water'}
          </p>
          <Rule thick />
        </div>

        {/* ── FRONT PAGE ── */}
        <div className="pt-5">
          <h2 className="text-center" style={{ fontFamily: serif, fontSize: 'clamp(1.8rem, 7vw, 2.6rem)', fontWeight: 900, lineHeight: 1.05 }}>
            {headline}
          </h2>
          <p className="text-center italic mt-2 mb-5" style={{ color: INK_SOFT, fontSize: '0.95rem' }}>
            {subheadline}
          </p>

          {cover && (
            <figure className="mb-1">
              <div style={{ border: `1px solid ${INK}`, padding: 4, background: '#fff' }}>
                <img src={cover} alt={bday} className="w-full" style={{ display: 'block', filter: 'saturate(0.92) contrast(1.02)' }} />
              </div>
              <figcaption className="text-center text-xs italic mt-1" style={{ color: INK_SOFT }}>
                The captain himself, moments before a strong snack performance.
              </figcaption>
            </figure>
          )}
        </div>

        {/* ── CAPTAIN'S LOG ── */}
        <div className="pt-5">
          <SectionHead title="The Captain's Log" />
          <p style={{ fontSize: '0.98rem', lineHeight: 1.7 }}>
            <span style={{ fontFamily: serif, fontSize: '2.4rem', float: 'left', lineHeight: 0.8, paddingRight: 8, paddingTop: 4, fontWeight: 900 }}>
              {captainsLog.trim().charAt(0)}
            </span>
            {captainsLog.trim().slice(1)}
          </p>
        </div>

        {/* ── QUOTE OF THE DAY ── */}
        {np.quote && np.quote.trim() && (
          <div className="my-6 px-6 py-5 text-center" style={{ borderTop: `3px double ${INK}`, borderBottom: `3px double ${INK}` }}>
            <p style={{ fontFamily: serif, fontSize: '1.4rem', fontStyle: 'italic', lineHeight: 1.3 }}>“{np.quote.trim()}”</p>
            {np.quote_author && <p className="text-xs uppercase tracking-widest mt-2" style={{ color: INK_SOFT }}>— {np.quote_author}</p>}
          </div>
        )}

        {/* ── CREW ROSTER ── */}
        {roster.length > 0 && (
          <div className="pt-4">
            <SectionHead title="The Crew Roster" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-5">
              {roster.map(g => show(`crew:${g.id}`) && (
                <div key={g.id} className="relative text-center">
                  <HideBtn k={`crew:${g.id}`} />
                  <div style={{ border: `1px solid ${INK}`, padding: 3, background: '#fff' }}>
                    {g.photo
                      ? <img src={g.photo} alt="" className="w-full aspect-square object-cover" style={{ display: 'block', filter: 'grayscale(0.15) contrast(1.03)' }} />
                      : <div className="w-full aspect-square flex items-center justify-center" style={{ background: '#ded7c4', fontFamily: serif, fontSize: '2rem', fontWeight: 900 }}>{g.name[0]}</div>}
                  </div>
                  <p style={{ fontFamily: serif, fontWeight: 900, fontSize: '1rem', marginTop: 4 }}>{g.name.split(' ')[0]}</p>
                  <p className="text-xs italic" style={{ color: INK_SOFT, lineHeight: 1.2 }}>{g.role_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MISSION HIGHLIGHTS (hidden — missions now caption their photos) ── */}
        {false && highlights.length > 0 && (
          <div className="pt-7">
            <SectionHead title="Mission Highlights" />
            <ul className="flex flex-col gap-2.5">
              {highlights.map(h => (
                <li key={h.key} className="relative flex items-start gap-2" style={{ paddingRight: hostMode ? 56 : 0 }}>
                  <HideBtn k={h.key} />
                  <span style={{ fontFamily: serif, fontWeight: 900 }}>★</span>
                  <p style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700 }}>{h.text}</span>
                    <span className="italic" style={{ color: INK_SOFT }}> — {h.name}, reporting for duty.</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── GUEST NOTES ── */}
        {notes.length > 0 && (
          <div className="pt-7">
            <SectionHead title="Letters to the Captain" />
            <div className="grid grid-cols-1 gap-3">
              {notes.map(n => (
                <div key={n.key} className="relative px-4 py-3" style={{ border: `1px solid ${INK}`, background: '#fffdf6' }}>
                  <HideBtn k={n.key} />
                  <p className="italic" style={{ fontSize: '0.95rem', lineHeight: 1.45, paddingRight: hostMode ? 48 : 0 }}>“{n.text}”</p>
                  <p className="text-xs uppercase tracking-widest mt-1.5" style={{ color: INK_SOFT }}>— {n.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MESSAGES IN A BOTTLE (under Letters to the Captain) ── */}
        {visibleTributes.length > 0 && (
          <div className="pt-7">
            {!bottlesOpen ? (
              <div>
                {/* open ocean — fades out of the paper, no boxed border */}
                <div className="relative overflow-hidden" style={{ height: 172, background: 'linear-gradient(180deg,#f4efe1 0%,#dbeef7 26%,#a9d9ea 58%,#76bcd2 100%)' }}>
                  <div style={{ position: 'absolute', top: -28, right: -12, width: 96, height: 96, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,233,150,0.95), transparent 68%)' }} />
                  {[{ t: 30, l: '20%', s: 7, d: '0s' }, { t: 44, l: '74%', s: 6, d: '1s' }, { t: 66, l: '38%', s: 5, d: '0.6s' }, { t: 38, l: '54%', s: 5, d: '1.5s' }].map((sp, i) => (
                    <span key={i} style={{ position: 'absolute', top: sp.t, left: sp.l, width: sp.s, height: sp.s, borderRadius: '50%', background: 'radial-gradient(circle,#fff,rgba(255,255,255,0.5),transparent)', animation: `twinkle 2.8s ease-in-out ${sp.d} infinite` }} />
                  ))}
                  <div style={{ position: 'absolute', left: 0, right: 0, top: 50, display: 'flex', justifyContent: 'center' }}>
                    <motion.div animate={{ y: [0, -8, 0], rotate: [-8, 8, -8] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ filter: 'drop-shadow(0 8px 10px rgba(20,60,80,0.3))' }}>
                      <div style={{ transform: 'scale(1.35)', transformOrigin: 'center' }}><BottleGlyph /></div>
                    </motion.div>
                  </div>
                  <svg viewBox="0 0 120 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: 46, animation: 'waveSlide 8s linear infinite', opacity: 0.85 }}>
                    <path d="M0 14 Q7.5 7 15 14 T30 14 T45 14 T60 14 T75 14 T90 14 T105 14 T120 14 V30 H0 Z" fill="#4f9bb8" />
                  </svg>
                  <svg viewBox="0 0 120 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: 40, animation: 'waveSlide 5.5s linear infinite', opacity: 0.95 }}>
                    <path d="M0 18 Q7.5 12 15 18 T30 18 T45 18 T60 18 T75 18 T90 18 T105 18 T120 18 V30 H0 Z" fill="#7cc0d6" />
                  </svg>
                </div>

                <p style={{ fontFamily: serif, fontWeight: 900, fontSize: '1.5rem', textAlign: 'center', marginTop: 14, lineHeight: 1.1 }}>
                  🍾 {visibleTributes.length} Message{visibleTributes.length === 1 ? '' : 's'} in a Bottle
                </p>
                <p className="text-center text-sm italic" style={{ color: INK_SOFT, marginTop: 2 }}>From people who love you but couldn’t be aboard.</p>

                <motion.button onClick={() => setBottlesOpen(true)} whileTap={{ scale: 0.97, y: 2 }}
                  animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-full mt-4 py-4 rounded-lg font-black"
                  style={{ fontFamily: serif, fontSize: '1.15rem', background: '#c98a4a', color: '#fff8ec', border: `2px solid ${INK}`, boxShadow: `0 4px 0 ${INK}` }}>
                  ✉️ Open the Letters →
                </motion.button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-1/2" style={{ top: 0, zIndex: 5, pointerEvents: 'none' }}>
                  {Array.from({ length: 16 }).map((_, i) => {
                    const ang = (i / 16) * Math.PI * 2
                    return <motion.span key={i} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(ang) * 100, y: Math.sin(ang) * 80 - 6, opacity: 0, scale: 0.3 }} transition={{ duration: 1.1, ease: 'easeOut' }}
                      style={{ position: 'absolute', width: 8, height: 8, borderRadius: i % 2 ? '50%' : 2, background: i % 3 === 0 ? '#c9a84c' : i % 3 === 1 ? '#ff7a59' : '#5fa9c4' }} />
                  })}
                </div>
                <motion.div initial={{ rotate: -25, y: -8, opacity: 0, scale: 0.7 }} animate={{ rotate: 0, y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 11 }} className="flex justify-center mb-1">
                  <BottleGlyph />
                </motion.div>
                <SectionHead title="Messages in a Bottle" />
                <p className="text-center text-sm italic mb-4" style={{ color: INK_SOFT }}>Washed ashore from people who love you.</p>
                <div className="flex flex-col gap-4">
                  {visibleTributes.map((t, i) => (
                    <motion.div key={t.id}
                      initial={printing ? false : { opacity: 0, y: 34, scaleY: 0.5, rotate: i % 2 ? 2.5 : -2.5 }}
                      animate={{ opacity: 1, y: 0, scaleY: 1, rotate: i % 2 ? 1.4 : -1.4 }}
                      transition={{ duration: 0.55, delay: 0.3 + i * 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="relative px-4 py-4" style={{ transformOrigin: 'top center', border: `1px solid ${INK}`, background: '#fffdf6', boxShadow: '0 4px 14px rgba(42,38,32,0.12)' }}>
                      <HideBtn k={'bottle:' + t.id} />
                      {t.media_url && (
                        <div className="mb-3" style={{ border: `1px solid ${INK}`, padding: 4, background: '#fff' }}>
                          {t.media_type === 'video'
                            ? <video src={t.media_url} controls className="w-full object-cover" style={{ display: 'block', maxHeight: 280 }} />
                            : <img src={t.media_url} alt="" className="w-full object-cover" style={{ display: 'block', maxHeight: 320, filter: 'saturate(0.95)' }} />}
                        </div>
                      )}
                      {t.message && <p className="italic" style={{ fontSize: '1rem', lineHeight: 1.5, paddingRight: hostMode ? 48 : 0 }}>“{t.message}”</p>}
                      <p className="text-xs uppercase tracking-widest mt-2" style={{ color: INK_SOFT }}>🍾 — {t.name}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PHOTO PAGE ── */}
        {(visiblePhotos.length > 0 || hostMode) && (
          <div className="pt-7">
            <SectionHead title="From the Voyage" />
            <p className="no-print text-center text-xs italic mb-3" style={{ color: INK_SOFT }}>📥 Tap any photo to download it in full quality.</p>

            {hostMode && (
              <div className="mb-4">
                <label className="block">
                  <div className="w-full py-3 rounded text-center text-sm font-bold cursor-pointer active:scale-95 transition-all"
                    style={{ background: INK, color: PAPER }}>
                    {uploadingHostPhoto ? 'Uploading…' : '📷 Upload your best photos'}
                  </div>
                  <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={uploadingHostPhoto}
                    onChange={e => { if (e.target.files && e.target.files.length) uploadHostPhotos(e.target.files); e.currentTarget.value = '' }} />
                </label>
                <p className="text-xs italic mt-1.5 text-center" style={{ color: INK_SOFT }}>
                  Your uploads show first. Guest photos appear below — tap “hide” on any you don’t want.
                </p>
              </div>
            )}

            {visiblePhotos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 np-photos">
                {visiblePhotos.map((p, i) => {
                  const isHostPhoto = hostPhotoSet.has(p.url)
                  return (
                    <figure key={i} className="relative" style={{ transform: `rotate(${[-1.5, 1.2, -0.8, 1.6][i % 4]}deg)` }}>
                      {hostMode && isHostPhoto ? (
                        <button onClick={() => removeHostPhoto(p.url)} className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: '#c4622d', color: '#fff' }}>remove</button>
                      ) : (
                        <HideBtn k={p.url} />
                      )}
                      <div className="relative" style={{ border: `1px solid ${INK}`, padding: 4, background: '#fff' }}>
                        {isVideo(p.url)
                          ? <video src={p.url} controls className="w-full aspect-square object-cover" style={{ display: 'block' }} />
                          : <img src={p.url} alt="" onClick={() => downloadImage(p.url)} title="Download in full quality" className="w-full aspect-square object-cover" style={{ display: 'block', filter: 'saturate(0.95)', cursor: 'pointer' }} />}
                        {/* tap-to-download badge */}
                        <button onClick={() => downloadImage(p.url)} aria-label="Download photo"
                          className="no-print absolute bottom-1.5 right-1.5 z-10 w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(42,38,32,0.78)', color: '#fff', fontSize: 13, boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>⬇</button>
                        {p.mission && (
                          <div style={{ position: 'absolute', left: 4, right: 36, bottom: 4, background: 'rgba(42,38,32,0.82)', color: '#f4efe1', padding: '4px 7px', fontSize: 9.5, lineHeight: 1.3, fontStyle: 'italic' }}>
                            ✓ {p.mission}
                          </div>
                        )}
                      </div>
                      <figcaption className="text-xs italic mt-1" style={{ color: INK_SOFT }}>📷 {isHostPhoto ? 'Captain’s pick' : p.name}</figcaption>
                    </figure>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── FINAL NOTE ── */}
        {np.final_note && np.final_note.trim() && (
          <div className="mt-8 pt-5" style={{ borderTop: `3px double ${INK}` }}>
            <p className="text-center text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: INK_SOFT }}>A note in the margin</p>
            <p className="text-center" style={{ fontFamily: serif, fontSize: '1.15rem', fontStyle: 'italic', lineHeight: 1.5 }}>
              {np.final_note.trim()}
            </p>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="mt-8">
          <Rule thick />
          <p className="text-center text-[10px] uppercase tracking-[0.3em] py-3" style={{ color: INK_SOFT }}>
            Printed with love · The Boat Day Times · Happy Birthday {bday}
          </p>
        </div>
      </div>
    </main>
  )
}

function BottleGlyph() {
  // A real "message in a bottle": glass bottle floating on its side, corked,
  // with a rolled parchment scroll inside and glass highlights.
  return (
    <svg width="116" height="56" viewBox="0 0 116 56" fill="none" aria-hidden>
      <defs>
        <linearGradient id="mbGlass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8ece2" />
          <stop offset="0.55" stopColor="#86cdbd" />
          <stop offset="1" stopColor="#57a695" />
        </linearGradient>
        <linearGradient id="mbCork" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dca265" />
          <stop offset="1" stopColor="#b3753a" />
        </linearGradient>
      </defs>

      {/* glass body */}
      <rect x="5" y="11" width="80" height="34" rx="17" fill="url(#mbGlass)" stroke="#2f7d6e" strokeWidth="2.2" />
      {/* neck */}
      <path d="M82 18 q8.5 1 11.5 4.2 v7.6 q-3 3.2 -11.5 4.2 Z" fill="url(#mbGlass)" stroke="#2f7d6e" strokeWidth="2.2" strokeLinejoin="round" />
      {/* cork */}
      <rect x="92.5" y="18.5" width="15" height="19" rx="3.5" fill="url(#mbCork)" stroke="#8a5a28" strokeWidth="1.6" />
      <path d="M96.5 23.5 h7 M96.5 28 h7 M96.5 32.5 h7" stroke="#8a5a28" strokeWidth="1" strokeLinecap="round" opacity="0.45" />

      {/* rolled parchment scroll inside */}
      <rect x="22" y="19" width="40" height="18" rx="9" fill="#fff6e0" stroke="#e0c78f" strokeWidth="1.3" />
      <path d="M31 26 h22 M31 31 h16" stroke="#c79a4e" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="22" cy="28" r="9" fill="#f4e6c2" stroke="#e0c78f" strokeWidth="1.3" />
      <circle cx="62" cy="28" r="9" fill="#f4e6c2" stroke="#e0c78f" strokeWidth="1.3" />
      <circle cx="22" cy="28" r="3.4" fill="none" stroke="#d8be86" strokeWidth="1.1" />
      <circle cx="62" cy="28" r="3.4" fill="none" stroke="#d8be86" strokeWidth="1.1" />

      {/* glass highlights */}
      <path d="M13 16 q-4 12 1 24" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" opacity="0.7" fill="none" />
      <path d="M20 15 q-3 13 1 26" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.4" fill="none" />
    </svg>
  )
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1" style={{ borderTop: `2px solid ${INK}` }} />
      <h3 style={{ fontFamily: serif, fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</h3>
      <div className="flex-1" style={{ borderTop: `2px solid ${INK}` }} />
    </div>
  )
}
