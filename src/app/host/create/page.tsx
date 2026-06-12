'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { NoteBlock, EventLink } from '@/types/database'

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function CreateParty() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    birthday_person_name: 'Isaac',
    party_title: "Captain Isaac's Birthday Voyage",
    party_story: "Isaac has summoned you aboard the Royal Gondolieri Society. Your presence is requested for a boat adventure, questionable decisions, and one very important birthday mission.",
    party_date: '2026-06-21',
    event_time: '3:00 PM',
    event_location: 'Marina del Rey, CA',
    meeting_point: 'Duffy Dock — meet at the main gate, ask for Pili',
  })
  const [notes, setNotes] = useState<NoteBlock[]>([
    { icon: '⏰', text: 'Arrive by 3:00 PM. The boat leaves at 3:30 sharp.' },
    { icon: '👗', text: 'Italian Riviera vibes — linen encouraged.' },
    { icon: '🤫', text: 'Do not tell Isaac about your mission.' },
  ])
  const [links, setLinks] = useState<EventLink[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('host_auth')) {
      router.replace('/host')
    }
  }, [router])

  function updateForm(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function updateNote(i: number, field: keyof NoteBlock, value: string) {
    setNotes(n => n.map((x, j) => j === i ? { ...x, [field]: value } : x))
  }

  function removeNote(i: number) {
    setNotes(n => n.filter((_, j) => j !== i))
  }

  function updateLink(i: number, field: keyof EventLink, value: string) {
    setLinks(l => l.map((x, j) => j === i ? { ...x, [field]: value } : x))
  }

  function removeLink(i: number) {
    setLinks(l => l.filter((_, j) => j !== i))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data: party, error: err } = await supabase
        .from('parties')
        .insert({
          host_id: 'pili',
          birthday_person_name: form.birthday_person_name,
          birthday_person_photo: null,
          party_title: form.party_title,
          party_story: form.party_story,
          party_date: form.party_date,
          event_time: form.event_time,
          event_location: form.event_location,
          meeting_point: form.meeting_point,
          event_notes: notes,
          event_links: links,
          theme: 'gondolieri',
          adult_count: 0,
          kid_count: 0,
          invite_code: genCode(),
          status: 'live',
          host_notes: null,
        })
        .select()
        .single()

      if (err) throw err
      router.push(`/host/dashboard/${party.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.07)',
    color: 'var(--cream)',
    border: '1px solid rgba(255,255,255,0.1)',
  }

  const labelStyle = {
    color: 'rgba(201,168,76,0.7)',
    fontSize: '0.65rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: '0.35rem',
  }

  return (
    <main className="min-h-screen px-5 py-10" style={{ background: '#0f1a30' }}>
      <div className="max-w-lg mx-auto">
        <p className="text-xs tracking-[0.4em] uppercase mb-2 text-center" style={{ color: 'rgba(201,168,76,0.7)' }}>
          New Party
        </p>
        <h1 className="text-3xl font-bold text-center mb-10" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          Set the Stage
        </h1>

        <form onSubmit={handleCreate} className="flex flex-col gap-5">

          {/* The basics */}
          <section>
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>The Basics</p>
            <div className="flex flex-col gap-3">
              <div>
                <label style={labelStyle}>Birthday person</label>
                <input value={form.birthday_person_name} onChange={e => updateForm('birthday_person_name', e.target.value)} required className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Party title</label>
                <input value={form.party_title} onChange={e => updateForm('party_title', e.target.value)} required className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Invitation story</label>
                <textarea
                  value={form.party_story}
                  onChange={e => updateForm('party_story', e.target.value)}
                  rows={3}
                  placeholder="Isaac has summoned you…"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* Event details */}
          <section>
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>Event Details</p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={form.party_date} onChange={e => updateForm('party_date', e.target.value)} required className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Time</label>
                  <input value={form.event_time} onChange={e => updateForm('event_time', e.target.value)} placeholder="3:00 PM" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input value={form.event_location} onChange={e => updateForm('event_location', e.target.value)} placeholder="Marina del Rey, CA" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Meeting point</label>
                <input value={form.meeting_point} onChange={e => updateForm('meeting_point', e.target.value)} placeholder="Duffy Dock — ask for Pili" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
              </div>
            </div>
          </section>

          {/* Note blocks */}
          <section>
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>Notes for Guests</p>
            <div className="flex flex-col gap-2">
              {notes.map((note, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={note.icon ?? ''}
                    onChange={e => updateNote(i, 'icon', e.target.value)}
                    placeholder="🎉"
                    className="w-12 px-2 py-3 rounded-xl text-center text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    value={note.text}
                    onChange={e => updateNote(i, 'text', e.target.value)}
                    placeholder="Note text"
                    className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => removeNote(i)} className="text-lg leading-none opacity-30 hover:opacity-60 px-1">×</button>
                </div>
              ))}
              {notes.some(n => n.text) && (
                <div className="flex gap-2 items-center">
                  <input placeholder="🔗" className="w-12 px-2 py-2 rounded-xl text-center text-xs outline-none opacity-50" style={inputStyle} disabled />
                  <input
                    value={notes[notes.findIndex(n => n.text && n.link !== undefined)]?.link ?? ''}
                    placeholder="Optional link URL for last note"
                    className="flex-1 px-4 py-2 rounded-xl text-xs outline-none opacity-60"
                    style={inputStyle}
                    onChange={e => {
                      const last = notes.length - 1
                      updateNote(last, 'link', e.target.value)
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setNotes(n => [...n, { icon: '', text: '' }])}
                className="text-xs py-2.5 rounded-xl w-full"
                style={{ color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.06)', border: '1px dashed rgba(201,168,76,0.2)' }}
              >
                + Add note
              </button>
            </div>
          </section>

          {/* Links */}
          <section>
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'rgba(201,168,76,0.5)' }}>Useful Links</p>
            <div className="flex flex-col gap-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={link.label}
                    onChange={e => updateLink(i, 'label', e.target.value)}
                    placeholder="Label"
                    className="w-28 px-3 py-3 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    value={link.url}
                    onChange={e => updateLink(i, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-3 rounded-xl text-sm outline-none"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => removeLink(i)} className="text-lg leading-none opacity-30 hover:opacity-60 px-1">×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLinks(l => [...l, { label: '', url: '' }])}
                className="text-xs py-2.5 rounded-xl w-full"
                style={{ color: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.06)', border: '1px dashed rgba(201,168,76,0.2)' }}
              >
                + Add link (waiver, Venmo, maps…)
              </button>
            </div>
          </section>

          {error && <p className="text-sm text-center" style={{ color: 'var(--terracotta)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all disabled:opacity-50 mt-2"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            {loading ? 'Creating…' : 'Create Party'}
          </button>
        </form>
      </div>
    </main>
  )
}
