'use client'

import { useEffect, useState, use, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party, Guest, Newspaper } from '@/types/database'

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
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('parties').select('*').eq('id', partyId).single(),
      supabase.from('guests').select('*').eq('party_id', partyId).eq('rsvp_status', 'accepted').order('created_at'),
    ]).then(([{ data: p }, { data: g }]) => {
      setParty(p)
      setGuests((g ?? []).filter((x: Guest) => x.name))
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
  const photos: { url: string; name: string }[] = []
  guests.forEach(g => {
    const first = g.name.split(' ')[0]
    ;(Array.isArray(g.memory_photos) ? g.memory_photos : []).forEach(u => photos.push({ url: u, name: first }))
    const mp = g.mission_progress ?? {}
    Object.values(mp).forEach(e => (e?.media ?? []).forEach(u => photos.push({ url: u, name: first })))
  })
  ;(np.host_photos ?? []).forEach(u => photos.push({ url: u, name: 'The host' }))
  const visiblePhotos = photos.filter(p => show(p.url))

  const Rule = ({ thick }: { thick?: boolean }) => <div style={{ borderTop: `${thick ? 3 : 1}px solid ${INK}` }} />
  const HideBtn = ({ k }: { k: string }) => hostMode ? (
    <button onClick={() => toggleHidden(k)} className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: hidden.includes(k) ? '#c4622d' : 'rgba(0,0,0,0.6)', color: '#fff' }}>
      {hidden.includes(k) ? 'show' : 'hide'}
    </button>
  ) : null

  return (
    <main className="min-h-screen py-6 px-3" style={{ background: '#e7e0cf', fontFamily: body, color: INK }}>
      <div className="max-w-2xl mx-auto" style={{ background: PAPER, boxShadow: '0 10px 50px rgba(0,0,0,0.18)', padding: '28px 22px' }}>

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

        {/* ── MISSION HIGHLIGHTS ── */}
        {highlights.length > 0 && (
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

        {/* ── PHOTO PAGE ── */}
        {visiblePhotos.length > 0 && (
          <div className="pt-7">
            <SectionHead title="From the Voyage" />
            <div className="grid grid-cols-2 gap-3">
              {visiblePhotos.map((p, i) => (
                <figure key={i} className="relative" style={{ transform: `rotate(${[-1.5, 1.2, -0.8, 1.6][i % 4]}deg)` }}>
                  <HideBtn k={p.url} />
                  <div style={{ border: `1px solid ${INK}`, padding: 4, background: '#fff' }}>
                    {isVideo(p.url)
                      ? <video src={p.url} controls className="w-full aspect-square object-cover" style={{ display: 'block' }} />
                      : <img src={p.url} alt="" className="w-full aspect-square object-cover" style={{ display: 'block', filter: 'saturate(0.95)' }} />}
                  </div>
                  <figcaption className="text-xs italic mt-1" style={{ color: INK_SOFT }}>📷 {p.name}</figcaption>
                </figure>
              ))}
            </div>
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

function SectionHead({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-1" style={{ borderTop: `2px solid ${INK}` }} />
      <h3 style={{ fontFamily: serif, fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</h3>
      <div className="flex-1" style={{ borderTop: `2px solid ${INK}` }} />
    </div>
  )
}
