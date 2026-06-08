'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GONDOLIERI_MISSIONS } from '@/lib/missions'

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export default function CreateParty() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    birthday_person_name: 'Isaac',
    party_title: "Captain Isaac's Birthday Voyage",
    party_date: '2026-06-21',
    adult_count: 8,
    kid_count: 3,
    host_notes: 'Please arrive by 3 PM. Wear Italian Riviera vibes if you want. Do not tell Isaac about your mission.',
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('host_auth')) {
      router.replace('/host')
    }
  }, [router])

  function update(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const invite_code = generateCode()
      const { data: party, error: partyErr } = await supabase
        .from('parties')
        .insert({
          host_id: 'pili',
          birthday_person_name: form.birthday_person_name,
          birthday_person_photo: null,
          party_title: form.party_title,
          party_date: form.party_date,
          theme: 'gondolieri',
          adult_count: Number(form.adult_count),
          kid_count: Number(form.kid_count),
          invite_code,
          status: 'live',
          host_notes: form.host_notes,
        })
        .select()
        .single()

      if (partyErr) throw partyErr

      // Pre-create guest slots from mission templates
      const guestSlots = GONDOLIERI_MISSIONS.map(m => ({
        party_id: party.id,
        name: '',
        email: `placeholder-${Math.random().toString(36).slice(2)}@gondolieri.local`,
        role_name: m.role_name,
        role_description: m.role_description,
        mission_title: m.mission_title,
        mission_instructions: m.mission_instructions,
        mission_difficulty: m.mission_difficulty,
        proof_required: m.proof_required,
        proof_type: m.proof_type,
        mission_status: 'in_progress' as const,
        is_host: false,
      }))

      await supabase.from('guests').insert(guestSlots)

      router.push(`/host/dashboard/${party.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: 'var(--navy)' }}>
      <div className="max-w-sm mx-auto">
        <p className="text-xs tracking-[0.3em] uppercase mb-3 text-center" style={{ color: 'var(--gold)' }}>
          New Party
        </p>
        <h1 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          Create the Voyage
        </h1>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label className="text-xs tracking-wider uppercase mb-1 block" style={{ color: 'var(--gold)' }}>Birthday Person</label>
            <input
              value={form.birthday_person_name}
              onChange={e => update('birthday_person_name', e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </div>

          <div>
            <label className="text-xs tracking-wider uppercase mb-1 block" style={{ color: 'var(--gold)' }}>Party Title</label>
            <input
              value={form.party_title}
              onChange={e => update('party_title', e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </div>

          <div>
            <label className="text-xs tracking-wider uppercase mb-1 block" style={{ color: 'var(--gold)' }}>Date</label>
            <input
              type="date"
              value={form.party_date}
              onChange={e => update('party_date', e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs tracking-wider uppercase mb-1 block" style={{ color: 'var(--gold)' }}>Adults</label>
              <input
                type="number"
                min={1}
                value={form.adult_count}
                onChange={e => update('adult_count', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs tracking-wider uppercase mb-1 block" style={{ color: 'var(--gold)' }}>Kids</label>
              <input
                type="number"
                min={0}
                value={form.kid_count}
                onChange={e => update('kid_count', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs tracking-wider uppercase mb-1 block" style={{ color: 'var(--gold)' }}>Host Notes for Guests</label>
            <textarea
              value={form.host_notes}
              onChange={e => update('host_notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
          </div>

          {error && <p className="text-sm text-center" style={{ color: 'var(--terracotta)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide mt-2 active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            {loading ? 'Creating the Voyage…' : 'Launch the Party'}
          </button>
        </form>
      </div>
    </main>
  )
}
