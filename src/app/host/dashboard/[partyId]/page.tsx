'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Party, Guest } from '@/types/database'

const STATUS_LABEL: Record<string, string> = {
  in_progress: '🟡 In Progress',
  submitted: '🟢 Submitted',
  approved: '🏆 Approved',
}

export default function HostDashboard({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = use(params)
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('host_auth')) { router.replace('/host'); return }
    load()
  }, [partyId])

  async function load() {
    const [{ data: p }, { data: g }] = await Promise.all([
      supabase.from('parties').select('*').eq('id', partyId).single(),
      supabase.from('guests').select('*').eq('party_id', partyId).order('created_at'),
    ])
    setParty(p)
    setGuests(g ?? [])
    setLoading(false)
  }

  async function approve(guestId: string) {
    await supabase.from('guests').update({ mission_status: 'approved' }).eq('id', guestId)
    setGuests(g => g.map(x => x.id === guestId ? { ...x, mission_status: 'approved' } : x))
  }

  async function reject(guestId: string) {
    await supabase.from('guests').update({ mission_status: 'in_progress', submission_url: null }).eq('id', guestId)
    setGuests(g => g.map(x => x.id === guestId ? { ...x, mission_status: 'in_progress', submission_url: null } : x))
  }

  async function updateGuestName(guestId: string, name: string) {
    await supabase.from('guests').update({ name }).eq('id', guestId)
    setGuests(g => g.map(x => x.id === guestId ? { ...x, name } : x))
  }

  function copyLink() {
    if (!party) return
    navigator.clipboard.writeText(`${window.location.origin}/invite/${party.invite_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const activeGuests = guests.filter(g => g.name && !g.email.includes('@gondolieri.local'))
  const slots = guests.filter(g => !g.name || g.email.includes('@gondolieri.local'))

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--navy)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.5 }}>Loading…</p>
    </main>
  )

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: 'var(--navy)' }}>
      <div className="max-w-lg mx-auto">
        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--gold)' }}>Host Dashboard</p>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          {party?.party_title}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--cream)', opacity: 0.5 }}>
          {party?.party_date} · {activeGuests.length} guests joined
        </p>

        {/* Invite link */}
        <div className="rounded-2xl p-4 mb-6 flex items-center justify-between gap-3" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid var(--gold)' }}>
          <div>
            <p className="text-xs tracking-wider uppercase mb-0.5" style={{ color: 'var(--gold)' }}>Invite Link</p>
            <p className="text-xs break-all" style={{ color: 'var(--cream)', opacity: 0.7 }}>
              /invite/{party?.invite_code}
            </p>
          </div>
          <button
            onClick={copyLink}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Joined guests */}
        {activeGuests.length > 0 && (
          <div className="mb-6">
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--gold)' }}>Crew</p>
            <div className="flex flex-col gap-3">
              {activeGuests.map(guest => (
                <GuestCard key={guest.id} guest={guest} onApprove={approve} onReject={reject} />
              ))}
            </div>
          </div>
        )}

        {/* Open slots */}
        {slots.length > 0 && (
          <div className="mb-6">
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--cream)', opacity: 0.4 }}>Open Roles</p>
            <div className="flex flex-col gap-2">
              {slots.map(slot => (
                <SlotCard key={slot.id} slot={slot} onNameSave={updateGuestName} />
              ))}
            </div>
          </div>
        )}

        {/* Generate newspaper */}
        <button
          onClick={() => router.push(`/newspaper/${partyId}`)}
          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide mt-4 active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          Generate Birthday Newspaper
        </button>
      </div>
    </main>
  )
}

function GuestCard({ guest, onApprove, onReject }: {
  guest: Guest
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-3">
          {guest.photo
            ? <img src={guest.photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
            : <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>{guest.name[0]}</div>
          }
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{guest.name}</p>
            <p className="text-xs" style={{ color: 'var(--gold)' }}>{guest.role_name}</p>
          </div>
        </div>
        <span className="text-xs shrink-0 mt-1">{STATUS_LABEL[guest.mission_status]}</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--cream)', opacity: 0.6 }}>{guest.mission_title}</p>
      {guest.submission_url && (
        <img src={guest.submission_url} alt="submission" className="w-full rounded-xl object-cover mb-3" style={{ maxHeight: 160 }} />
      )}
      {guest.mission_status === 'submitted' && (
        <div className="flex gap-2">
          <button onClick={() => onApprove(guest.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--sage)', color: 'var(--cream)' }}>Approve</button>
          <button onClick={() => onReject(guest.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(196,98,45,0.3)', color: 'var(--terracotta)' }}>Reject</button>
        </div>
      )}
    </div>
  )
}

function SlotCard({ slot, onNameSave }: { slot: Guest; onNameSave: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')

  function save() {
    if (name.trim()) { onNameSave(slot.id, name.trim()); setEditing(false) }
  }

  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {editing ? (
        <div className="flex gap-2 flex-1">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="Guest name"
            className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.2)' }}
          />
          <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: 'var(--gold)', color: 'var(--navy)' }}>Save</button>
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.4 }}>Open slot</p>
            <p className="text-xs" style={{ color: 'var(--gold)' }}>{slot.role_name}</p>
          </div>
          <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--cream)' }}>Assign</button>
        </>
      )}
    </div>
  )
}
