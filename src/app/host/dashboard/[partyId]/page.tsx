'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest } from '@/types/database'
import { GONDOLIERI_ROLES } from '@/lib/missions'

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

const MISSION_STATUS_LABEL: Record<string, string> = {
  in_progress: '🟡 In progress',
  submitted: '🟢 Submitted',
  approved: '🏆 Approved',
}

const RSVP_LABEL: Record<string, string> = {
  pending: '⏳ Pending',
  accepted: '✅ Coming',
  declined: '❌ Can\'t make it',
}

export default function HostDashboard({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = use(params)
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newGuest, setNewGuest] = useState({
    name: '',
    role_name: '',
    role_description: '',
    mission_easy: '',
    mission_medium: '',
    mission_legendary: '',
  })
  const [selectedTemplate, setSelectedTemplate] = useState(-1)
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
  const [addingGuest, setAddingGuest] = useState(false)
  const [addError, setAddError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [bdayUploading, setBdayUploading] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showCopyEditor, setShowCopyEditor] = useState(false)
  const [headlineDraft, setHeadlineDraft] = useState('')
  const [storyDraft, setStoryDraft] = useState('')
  const [savingCopy, setSavingCopy] = useState(false)
  const [copySaved, setCopySaved] = useState(false)
  const [copyError, setCopyError] = useState('')

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
    if (p) {
      setHeadlineDraft(p.invite_headline ?? `{name}, ${p.birthday_person_name} is throwing a boat day 🚢`)
      setStoryDraft(p.party_story ?? '')
    }
    setGuests((g ?? []).filter((x: Guest) => x.name))
    setLoading(false)
  }

  async function saveCopy() {
    if (!party || savingCopy) return
    setSavingCopy(true)
    setCopySaved(false)
    setCopyError('')
    const headline = headlineDraft.trim() || null
    const story = storyDraft.trim() || null

    const { error } = await supabase.from('parties').update({ invite_headline: headline, party_story: story }).eq('id', partyId)
    if (!error) {
      setParty(p => p ? { ...p, invite_headline: headline, party_story: story } : p)
      setCopySaved(true)
      setTimeout(() => setCopySaved(false), 2500)
      setSavingCopy(false)
      return
    }

    // Headline column may not exist yet — still save the story so editing works today.
    const retry = await supabase.from('parties').update({ party_story: story }).eq('id', partyId)
    if (!retry.error) {
      setParty(p => p ? { ...p, party_story: story } : p)
      setCopyError('Story saved. To edit the headline too, run the one-line SQL (alter table parties add column invite_headline text) then save again.')
    } else {
      setCopyError(retry.error.message)
    }
    setSavingCopy(false)
  }

  function copyLink(guest: Guest) {
    const link = `${window.location.origin}/g/${guest.invite_code}`
    navigator.clipboard.writeText(link)
    setCopiedId(guest.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function applyTemplate(idx: number) {
    const t = GONDOLIERI_ROLES[idx]
    setNewGuest(g => ({
      ...g,
      role_name: t.role_name ?? '',
      role_description: t.role_description ?? '',
      mission_easy: t.mission_easy ?? '',
      mission_medium: t.mission_medium ?? '',
      mission_legendary: t.mission_legendary ?? '',
    }))
    setSelectedTemplate(idx)
  }

  function startEditGuest(guest: Guest) {
    setEditingGuestId(guest.id)
    setNewGuest({
      name: guest.name ?? '',
      role_name: guest.role_name ?? '',
      role_description: guest.role_description ?? '',
      mission_easy: guest.mission_easy ?? '',
      mission_medium: guest.mission_medium ?? '',
      mission_legendary: guest.mission_legendary ?? '',
    })
    setSelectedTemplate(-1)
    setPhotoFile(null)
    setPhotoPreview(guest.photo ?? '')
    setAddError('')
    setConfirmRemoveId(null)
    setShowAddGuest(true)
  }

  function closeDrawer() {
    setShowAddGuest(false)
    setEditingGuestId(null)
    setNewGuest({ name: '', role_name: '', role_description: '', mission_easy: '', mission_medium: '', mission_legendary: '' })
    setPhotoFile(null)
    setPhotoPreview('')
    setSelectedTemplate(-1)
    setAddError('')
  }

  async function handleAddGuest() {
    if (!newGuest.name.trim() || addingGuest) return
    setAddingGuest(true)
    setAddError('')

    try {
      let photoUrl = ''
      if (photoFile) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `guests/${partyId}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('party-media')
          .upload(path, photoFile, { upsert: true })
        if (uploadErr) {
          // Photo is optional — don't block, just note it.
          console.warn('Photo upload failed:', uploadErr.message)
        } else {
          const { data } = supabase.storage.from('party-media').getPublicUrl(path)
          photoUrl = data.publicUrl
        }
      }

      // ── EDIT existing guest ──
      if (editingGuestId) {
        const patch: Record<string, unknown> = {
          name: newGuest.name.trim(),
          role_name: newGuest.role_name.trim() || null,
          role_description: newGuest.role_description.trim() || null,
          mission_easy: newGuest.mission_easy.trim() || null,
          mission_medium: newGuest.mission_medium.trim() || null,
          mission_legendary: newGuest.mission_legendary.trim() || null,
        }
        if (photoUrl) patch.photo = photoUrl
        const { error } = await supabase.from('guests').update(patch).eq('id', editingGuestId)
        if (error) {
          setAddError(error.message || 'Could not save changes. Please try again.')
          return
        }
        setGuests(g => g.map(x => x.id === editingGuestId ? { ...x, ...patch } as Guest : x))
        closeDrawer()
        return
      }

      const code = genCode()
      const { data: guest, error } = await supabase
        .from('guests')
        .insert({
          party_id: partyId,
          name: newGuest.name.trim(),
          email: `${newGuest.name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@gondolieri.local`,
          photo: photoUrl || null,
          role_name: newGuest.role_name || null,
          role_description: newGuest.role_description || null,
          mission_easy: newGuest.mission_easy || null,
          mission_medium: newGuest.mission_medium || null,
          mission_legendary: newGuest.mission_legendary || null,
          mission_status: 'in_progress',
          rsvp_status: 'pending',
          mission_accepted: false,
          invite_code: code,
          is_host: false,
        })
        .select()
        .single()

      if (error) {
        setAddError(error.message || 'Could not add guest. Please try again.')
        return
      }

      if (guest) {
        setGuests(g => [...g, guest])
      } else {
        // Insert succeeded but row not returned (e.g. RLS on select) — reload from DB.
        await load()
      }

      setNewGuest({ name: '', role_name: '', role_description: '', mission_easy: '', mission_medium: '', mission_legendary: '' })
      setPhotoFile(null)
      setPhotoPreview('')
      setSelectedTemplate(-1)
      setShowAddGuest(false)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Something went wrong adding the guest.')
    } finally {
      setAddingGuest(false)
    }
  }

  async function approveGuest(id: string) {
    await supabase.from('guests').update({ mission_status: 'approved' }).eq('id', id)
    setGuests(g => g.map(x => x.id === id ? { ...x, mission_status: 'approved' } : x))
  }

  async function removeGuest(id: string) {
    if (removingId) return
    setRemovingId(id)
    const { error } = await supabase.from('guests').delete().eq('id', id)
    if (!error) {
      setGuests(g => g.filter(x => x.id !== id))
      setConfirmRemoveId(null)
    }
    setRemovingId(null)
  }

  async function toggleReveal(field: 'reveal_titles' | 'reveal_missions') {
    if (!party) return
    const next = !party[field]
    await supabase.from('parties').update({ [field]: next }).eq('id', partyId)
    setParty(p => p ? { ...p, [field]: next } : p)
  }

  async function toggleEnded() {
    if (!party) return
    const next = party.status === 'ended' ? 'live' : 'ended'
    await supabase.from('parties').update({ status: next }).eq('id', partyId)
    setParty(p => p ? { ...p, status: next } : p)
  }

  async function uploadBirthdayPhoto(file: File) {
    if (!party || bdayUploading) return
    setBdayUploading(true)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `birthday/${partyId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('party-media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('party-media').getPublicUrl(path)
      await supabase.from('parties').update({ birthday_person_photo: data.publicUrl }).eq('id', partyId)
      setParty(p => p ? { ...p, birthday_person_photo: data.publicUrl } : p)
    }
    setBdayUploading(false)
  }

  const inputStyle = { background: 'rgba(255,255,255,0.07)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.1)' }
  const labelStyle = { color: 'rgba(201,168,76,0.7)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, display: 'block', marginBottom: '0.3rem' }

  if (loading) return <main className="min-h-screen" style={{ background: '#0f1a30' }} />

  return (
    <main className="min-h-screen px-5 py-8" style={{ background: '#0f1a30' }}>
      <div className="max-w-lg mx-auto">
        <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(201,168,76,0.6)' }}>Host Dashboard</p>

        {/* Birthday person photo — the invitation anchor */}
        <div className="flex items-center gap-4 mb-3">
          <label className="cursor-pointer flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)', border: '2px solid rgba(201,168,76,0.3)' }}>
              {party?.birthday_person_photo
                ? <img src={party.birthday_person_photo} alt="" className="w-full h-full object-cover" />
                : <span className="text-2xl">{bdayUploading ? '⏳' : '📷'}</span>}
            </div>
            <input type="file" accept="image/*" className="hidden" disabled={bdayUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadBirthdayPhoto(f) }} />
          </label>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
              {party?.party_title}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(201,168,76,0.55)' }}>
              {party?.birthday_person_photo ? `Tap photo to change ${party?.birthday_person_name}'s portrait` : `Tap to add ${party?.birthday_person_name}'s photo`}
            </p>
          </div>
        </div>
        <p className="text-sm mb-4" style={{ color: 'rgba(253,246,227,0.35)' }}>
          {party?.party_date} · {party?.event_time} · {guests.length} guests
        </p>

        {/* Edit invitation copy */}
        <div className="mb-4">
          <button
            onClick={() => setShowCopyEditor(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span>✏️ Edit invitation copy</span>
            <span style={{ opacity: 0.5 }}>{showCopyEditor ? '▲' : '▼'}</span>
          </button>

          {showCopyEditor && (
            <div className="rounded-2xl p-4 mt-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs mb-4" style={{ color: 'rgba(253,246,227,0.3)' }}>
                This is the headline and story guests see on the first screen. Type <span style={{ color: 'var(--gold)' }}>{'{name}'}</span> anywhere to drop in each guest's first name.
              </p>

              <label style={labelStyle}>Headline</label>
              <textarea
                value={headlineDraft}
                onChange={e => { setHeadlineDraft(e.target.value); setCopySaved(false) }}
                rows={2}
                placeholder="{name}, Isaac is throwing a boat day 🚢"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none mb-4"
                style={inputStyle}
              />

              <label style={labelStyle}>Invitation story</label>
              <textarea
                value={storyDraft}
                onChange={e => { setStoryDraft(e.target.value); setCopySaved(false) }}
                rows={5}
                placeholder="Isaac is gathering favorite people for an afternoon on the water…"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none mb-4"
                style={inputStyle}
              />

              <button
                onClick={saveCopy}
                disabled={savingCopy}
                className="w-full py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
                style={copySaved
                  ? { background: 'rgba(107,127,94,0.25)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.4)' }
                  : { background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {savingCopy ? 'Saving…' : copySaved ? '✓ Saved — guests see it now' : 'Save invitation copy'}
              </button>

              {copyError && (
                <p className="text-xs mt-3 px-3 py-2.5 rounded-xl leading-relaxed" style={{ background: 'rgba(196,98,45,0.14)', color: '#f0a07a', border: '1px solid rgba(196,98,45,0.3)' }}>
                  {copyError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Build anticipation — the drip */}
        {party && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)' }}>
            <p className="text-xs tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(201,168,76,0.7)' }}>Build anticipation</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(253,246,227,0.3)' }}>
              Drip the surprises. Flip one on, then text everyone to peek at their invitation.
            </p>

            {[
              { field: 'reveal_titles' as const, on: !!party.reveal_titles, label: 'Boat-day titles', hint: 'Guests can see their role' },
              { field: 'reveal_missions' as const, on: !!party.reveal_missions, label: 'Secret missions', hint: 'Missions unlock after RSVP' },
            ].map(row => (
              <div key={row.field} className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>{row.label}</p>
                  <p className="text-xs" style={{ color: 'rgba(253,246,227,0.3)' }}>
                    {row.on ? '🟢 Revealed to crew' : `🔒 Sealed · ${row.hint}`}
                  </p>
                </div>
                <button
                  onClick={() => toggleReveal(row.field)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={row.on
                    ? { background: 'rgba(107,127,94,0.2)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.35)' }
                    : { background: 'var(--gold)', color: 'var(--navy)' }}
                >
                  {row.on ? 'Hide again' : 'Reveal now'}
                </button>
              </div>
            ))}

            {/* End the voyage — unlocks the Captain's Log (after you Approve each guest's missions) */}
            <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>The Captain's Log</p>
                <p className="text-xs" style={{ color: 'rgba(253,246,227,0.3)' }}>
                  {party.status === 'ended' ? '🟢 Open · Approve a guest to unlock theirs' : '🔒 Opens after the voyage ends'}
                </p>
              </div>
              <button
                onClick={toggleEnded}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style={party.status === 'ended'
                  ? { background: 'rgba(107,127,94,0.2)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.35)' }
                  : { background: 'var(--terracotta)', color: 'var(--cream)' }}
              >
                {party.status === 'ended' ? 'Reopen voyage' : 'End the voyage'}
              </button>
            </div>
          </div>
        )}

        {/* Guest list */}
        <div className="flex flex-col gap-3 mb-5">
          {guests.length === 0 && (
            <div className="rounded-2xl px-5 py-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <p className="text-sm" style={{ color: 'rgba(253,246,227,0.3)' }}>No guests yet. Add your first crew member.</p>
            </div>
          )}
          {guests.map(guest => (
            <div key={guest.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start gap-3">
                {guest.photo
                  ? <img src={guest.photo} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: '1px solid rgba(201,168,76,0.3)' }} />
                  : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>{guest.name[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{guest.name}</p>
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgba(253,246,227,0.35)' }}>{RSVP_LABEL[guest.rsvp_status]}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(201,168,76,0.65)' }}>{guest.role_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {guest.mission_accepted && <span className="text-xs" style={{ color: 'rgba(107,190,94,0.7)' }}>✓ Mission accepted</span>}
                    {!guest.mission_accepted && guest.rsvp_status === 'accepted' && <span className="text-xs" style={{ color: 'rgba(253,246,227,0.2)' }}>Missions not accepted yet</span>}
                    {guest.mission_status === 'submitted' && <span className="text-xs" style={{ color: 'rgba(201,168,76,0.6)' }}>· {MISSION_STATUS_LABEL['submitted']}</span>}
                    {guest.mission_status === 'approved' && <span className="text-xs" style={{ color: 'rgba(107,190,94,0.8)' }}>· {MISSION_STATUS_LABEL['approved']}</span>}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {guest.invite_code ? (
                  <button
                    onClick={() => copyLink(guest)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: copiedId === guest.id ? 'rgba(107,127,94,0.3)' : 'rgba(201,168,76,0.15)', color: copiedId === guest.id ? '#a8c99a' : 'var(--gold)', border: '1px solid rgba(201,168,76,0.2)' }}
                  >
                    {copiedId === guest.id ? '✓ Copied' : 'Copy personal link'}
                  </button>
                ) : (
                  <p className="text-xs" style={{ color: 'rgba(253,246,227,0.2)' }}>No link yet</p>
                )}
                {guest.mission_status === 'submitted' && (
                  <button onClick={() => approveGuest(guest.id)} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(107,127,94,0.2)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.3)' }}>
                    Approve
                  </button>
                )}
                <button
                  onClick={() => startEditGuest(guest)}
                  aria-label={`Edit ${guest.name}`}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmRemoveId(guest.id)}
                  aria-label={`Remove ${guest.name}`}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={{ background: 'rgba(196,98,45,0.12)', color: 'rgba(240,160,122,0.9)', border: '1px solid rgba(196,98,45,0.25)' }}
                >
                  Remove
                </button>
              </div>

              {confirmRemoveId === guest.id && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(196,98,45,0.14)', border: '1px solid rgba(196,98,45,0.35)' }}>
                  <span className="text-xs flex-1" style={{ color: '#f0a07a' }}>
                    Remove <span className="font-semibold">{guest.name || 'this guest'}</span>? This can't be undone.
                  </span>
                  <button
                    onClick={() => removeGuest(guest.id)}
                    disabled={removingId === guest.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'var(--terracotta)', color: 'var(--cream)' }}
                  >
                    {removingId === guest.id ? 'Removing…' : 'Yes, remove'}
                  </button>
                  <button
                    onClick={() => setConfirmRemoveId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(253,246,227,0.6)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {guest.submission_url && (
                <img src={guest.submission_url} alt="" className="w-full rounded-xl mt-3 object-cover" style={{ maxHeight: 140 }} />
              )}

              {guest.memory_favorite_moment && (
                <p className="text-xs mt-3 px-3 py-2 rounded-xl leading-relaxed" style={{ background: 'rgba(196,98,45,0.1)', color: 'rgba(253,246,227,0.7)', borderLeft: '2px solid var(--terracotta)' }}>
                  ❝ {guest.memory_favorite_moment} ❞
                </p>
              )}

              {Array.isArray(guest.memory_photos) && guest.memory_photos.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 mt-3">
                  {guest.memory_photos.map((p, i) => (
                    <img key={i} src={p} alt="" className="w-full aspect-square object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add guest button */}
        <button
          onClick={() => { setEditingGuestId(null); setNewGuest({ name: '', role_name: '', role_description: '', mission_easy: '', mission_medium: '', mission_legendary: '' }); setPhotoFile(null); setPhotoPreview(''); setSelectedTemplate(-1); setAddError(''); setShowAddGuest(true) }}
          className="w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase active:scale-95 transition-all mb-6"
          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
        >
          + Add Guest
        </button>

        {/* Newspaper */}
        <button
          onClick={() => router.push(`/newspaper/${partyId}`)}
          className="w-full py-3 rounded-2xl text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(253,246,227,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Generate Birthday Newspaper
        </button>
      </div>

      {/* Add Guest Drawer */}
      <AnimatePresence>
        {showAddGuest && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={closeDrawer}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 py-6 overflow-y-auto"
              style={{ background: '#1a2d4a', maxHeight: '90vh' }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>{editingGuestId ? 'Edit Guest' : 'Add Guest'}</h2>

              {/* Photo */}
              <div className="flex items-center gap-4 mb-5">
                <label className="cursor-pointer">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'rgba(201,168,76,0.1)', border: '2px dashed rgba(201,168,76,0.3)' }}>
                    {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">📷</span>}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
                </label>
                <div className="flex-1">
                  <label style={labelStyle}>Name</label>
                  <input value={newGuest.name} onChange={e => setNewGuest(g => ({ ...g, name: e.target.value }))} placeholder="Guest name" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              {/* Mission templates */}
              <div className="mb-4">
                <label style={labelStyle}>Quick assign a role</label>
                <div className="flex flex-wrap gap-2">
                  {GONDOLIERI_ROLES.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(i)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all"
                      style={{
                        background: selectedTemplate === i ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)',
                        color: selectedTemplate === i ? 'var(--gold)' : 'rgba(253,246,227,0.4)',
                        border: selectedTemplate === i ? '1px solid rgba(201,168,76,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      {m.role_name?.split(' ').slice(0, 3).join(' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Role fields */}
              <div className="flex flex-col gap-3 mb-5">
                <div>
                  <label style={labelStyle}>Role title</label>
                  <input value={newGuest.role_name} onChange={e => setNewGuest(g => ({ ...g, role_name: e.target.value }))} placeholder="Chief Negotiator" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Role description</label>
                  <textarea value={newGuest.role_description} onChange={e => setNewGuest(g => ({ ...g, role_description: e.target.value }))} rows={2} placeholder="Master of persuasion and questionable truths." className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>🟢 Easy mission</label>
                  <textarea value={newGuest.mission_easy} onChange={e => setNewGuest(g => ({ ...g, mission_easy: e.target.value }))} rows={2} placeholder="Call Isaac 'Captain' at least once…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>🟡 Medium mission</label>
                  <textarea value={newGuest.mission_medium} onChange={e => setNewGuest(g => ({ ...g, mission_medium: e.target.value }))} rows={2} placeholder="Get two people to join a toast…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>🔥 Legendary mission</label>
                  <textarea value={newGuest.mission_legendary} onChange={e => setNewGuest(g => ({ ...g, mission_legendary: e.target.value }))} rows={2} placeholder="Help create a group photo that actually looks fun…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
              </div>

              {addError && (
                <p className="text-sm mb-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(196,98,45,0.15)', color: '#f0a07a', border: '1px solid rgba(196,98,45,0.3)' }}>
                  {addError}
                </p>
              )}

              <button
                onClick={handleAddGuest}
                disabled={addingGuest || !newGuest.name.trim()}
                className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all disabled:opacity-40"
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {addingGuest ? (editingGuestId ? 'Saving…' : 'Adding…') : (editingGuestId ? 'Save changes' : 'Add to the Crew')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
