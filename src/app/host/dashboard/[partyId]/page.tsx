'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party, Guest, NoteBlock, Newspaper } from '@/types/database'
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
  const [altsDraft, setAltsDraft] = useState<{ easy: string[]; medium: string[]; legendary: string[] }>({ easy: [], medium: [], legendary: [] })
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
  const [dateDraft, setDateDraft] = useState('')
  const [timeDraft, setTimeDraft] = useState('')
  const [emailDraft, setEmailDraft] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState('')
  const [savingCopy, setSavingCopy] = useState(false)
  const [copySaved, setCopySaved] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([])
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [npDraft, setNpDraft] = useState({ headline: '', subheadline: '', quote: '', quote_author: '', captains_log: '', final_note: '', cover_photo: '' })
  const [npBusy, setNpBusy] = useState(false)
  const [npSaved, setNpSaved] = useState(false)
  const [npLinkCopied, setNpLinkCopied] = useState(false)
  const [bottleCopied, setBottleCopied] = useState(false)

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
      setDateDraft(p.party_date ?? '')
      setTimeDraft(p.event_time ?? '')
      setEmailDraft(p.birthday_person_email ?? '')
      setNoteBlocks(Array.isArray(p.event_notes) ? p.event_notes : [])
      const npx = p.newspaper ?? {}
      setNpDraft({
        headline: npx.headline ?? '', subheadline: npx.subheadline ?? '', quote: npx.quote ?? '',
        quote_author: npx.quote_author ?? '', captains_log: npx.captains_log ?? '', final_note: npx.final_note ?? '',
        cover_photo: npx.cover_photo ?? '',
      })
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
    const pdate = dateDraft || null
    const ptime = timeDraft.trim() || null
    const bemail = emailDraft.trim() || null

    const { error } = await supabase.from('parties').update({ invite_headline: headline, party_story: story, party_date: pdate, event_time: ptime, birthday_person_email: bemail }).eq('id', partyId)
    if (!error) {
      setParty(p => p ? { ...p, invite_headline: headline, party_story: story, party_date: pdate ?? p.party_date, event_time: ptime, birthday_person_email: bemail } : p)
      setCopySaved(true)
      setTimeout(() => setCopySaved(false), 2500)
      setSavingCopy(false)
      return
    }

    // Headline column may not exist yet — still save the rest so editing works today.
    const retry = await supabase.from('parties').update({ party_story: story, party_date: pdate, event_time: ptime }).eq('id', partyId)
    if (!retry.error) {
      setParty(p => p ? { ...p, party_story: story, party_date: pdate ?? p.party_date, event_time: ptime } : p)
      setCopyError('Story saved. To edit the headline too, run the one-line SQL (alter table parties add column invite_headline text) then save again.')
    } else {
      setCopyError(retry.error.message)
    }
    setSavingCopy(false)
  }

  async function sendBirthdayEmail() {
    if (!party || sendingEmail) return
    if (!party.birthday_person_email) { setEmailResult('First add and save the birthday person\'s email above.'); return }
    if (!confirm(`Send the birthday email to ${party.birthday_person_name} (${party.birthday_person_email})? This sends the real email.`)) return
    setSendingEmail(true); setEmailResult('')
    try {
      const res = await fetch('/api/send-birthday', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partyId }) })
      const data = await res.json()
      setEmailResult(data.ok ? `✅ Sent to ${data.to}!` : `⚠️ ${data.error}`)
    } catch {
      setEmailResult('⚠️ Could not send. Check your connection and try again.')
    }
    setSendingEmail(false)
  }

  // ── Captain's Notes (event_notes) ──
  function updateNote(i: number, field: keyof NoteBlock, value: string) {
    setNoteBlocks(n => n.map((x, j) => j === i ? ({ ...x, [field]: value } as NoteBlock) : x)); setNotesSaved(false)
  }
  function updateNoteMarkable(i: number, value: boolean) {
    setNoteBlocks(n => n.map((x, j) => j === i ? { ...x, markable: value } : x)); setNotesSaved(false)
  }
  function addNote() {
    setNoteBlocks(n => [...n, { id: genCode(), icon: '', title: '', text: '', link: '', button_label: '', kind: 'info' }]); setNotesSaved(false)
  }
  function removeNoteBlock(i: number) {
    setNoteBlocks(n => n.filter((_, j) => j !== i)); setNotesSaved(false)
  }
  function moveNote(i: number, dir: number) {
    setNoteBlocks(n => {
      const j = i + dir
      if (j < 0 || j >= n.length) return n
      const copy = [...n];[copy[i], copy[j]] = [copy[j], copy[i]]; return copy
    }); setNotesSaved(false)
  }
  async function saveNotes() {
    if (!party || savingNotes) return
    setSavingNotes(true); setNotesSaved(false)
    const cleaned = noteBlocks
      .filter(n => (n.text ?? '').trim() || (n.title ?? '').trim())
      .map(n => {
        const kind = n.kind || (n.priority === 'required' ? 'required' : (n.link ? 'optional' : 'info'))
        return {
          id: n.id || genCode(),
          icon: (n.icon ?? '').trim() || undefined,
          title: (n.title ?? '').trim() || undefined,
          text: (n.text ?? '').trim(),
          link: (n.link ?? '').trim() || undefined,
          button_label: (n.button_label ?? '').trim() || undefined,
          kind,
          markable: kind === 'optional' ? !!n.markable : undefined,
        }
      })
    const { error } = await supabase.from('parties').update({ event_notes: cleaned }).eq('id', partyId)
    if (!error) {
      setParty(p => p ? { ...p, event_notes: cleaned } : p)
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2500)
    }
    setSavingNotes(false)
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

  const EMPTY_ALTS = { easy: [] as string[], medium: [] as string[], legendary: [] as string[] }
  type AltTier = 'easy' | 'medium' | 'legendary'
  function addAlt(tier: AltTier) { setAltsDraft(a => ({ ...a, [tier]: [...a[tier], ''] })) }
  function updateAlt(tier: AltTier, i: number, v: string) { setAltsDraft(a => ({ ...a, [tier]: a[tier].map((x, j) => j === i ? v : x) })) }
  function removeAlt(tier: AltTier, i: number) { setAltsDraft(a => ({ ...a, [tier]: a[tier].filter((_, j) => j !== i) })) }

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
    const a = guest.mission_alts ?? {}
    setAltsDraft({ easy: a.easy ?? [], medium: a.medium ?? [], legendary: a.legendary ?? [] })
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
    setAltsDraft(EMPTY_ALTS)
    setPhotoFile(null)
    setPhotoPreview('')
    setSelectedTemplate(-1)
    setAddError('')
  }

  async function handleAddGuest() {
    if (!newGuest.name.trim() || addingGuest) return
    setAddingGuest(true)
    setAddError('')

    const cleanedAlts = {
      easy: altsDraft.easy.map(s => s.trim()).filter(Boolean),
      medium: altsDraft.medium.map(s => s.trim()).filter(Boolean),
      legendary: altsDraft.legendary.map(s => s.trim()).filter(Boolean),
    }

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
        // Once a guest accepts, their missions are locked — never overwrite them.
        const target = guests.find(g => g.id === editingGuestId)
        const locked = !!target?.mission_accepted
        const patch: Record<string, unknown> = {
          name: newGuest.name.trim(),
          role_name: newGuest.role_name.trim() || null,
          role_description: newGuest.role_description.trim() || null,
        }
        if (!locked) {
          patch.mission_easy = newGuest.mission_easy.trim() || null
          patch.mission_medium = newGuest.mission_medium.trim() || null
          patch.mission_legendary = newGuest.mission_legendary.trim() || null
        }
        // Keep a stable base (the original of each tier) so the swap loop always
        // includes it. Preserve an existing base; otherwise capture the current.
        const existingBase = target?.mission_base
        patch.mission_base = (existingBase && Object.keys(existingBase).length)
          ? existingBase
          : { easy: newGuest.mission_easy.trim(), medium: newGuest.mission_medium.trim(), legendary: newGuest.mission_legendary.trim() }
        patch.mission_alts = cleanedAlts
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
          mission_alts: cleanedAlts,
          mission_base: { easy: newGuest.mission_easy.trim(), medium: newGuest.mission_medium.trim(), legendary: newGuest.mission_legendary.trim() },
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

  // ── Birthday newspaper ──
  async function saveNewspaper(extra?: Partial<Newspaper>) {
    if (!party || npBusy) return
    setNpBusy(true); setNpSaved(false)
    const np: Newspaper = {
      ...(party.newspaper ?? {}),
      created: true,
      headline: npDraft.headline.trim() || undefined,
      subheadline: npDraft.subheadline.trim() || undefined,
      quote: npDraft.quote.trim() || undefined,
      quote_author: npDraft.quote_author.trim() || undefined,
      captains_log: npDraft.captains_log.trim() || undefined,
      final_note: npDraft.final_note.trim() || undefined,
      cover_photo: npDraft.cover_photo.trim() || undefined,
      ...extra,
    }
    const { error } = await supabase.from('parties').update({ newspaper: np }).eq('id', partyId)
    if (!error) {
      setParty(p => p ? { ...p, newspaper: np } : p)
      setNpSaved(true); setTimeout(() => setNpSaved(false), 2500)
    }
    setNpBusy(false)
  }

  async function togglePublish() {
    if (!party) return
    await saveNewspaper({ published: !party.newspaper?.published })
  }

  function copyGiftLink() {
    navigator.clipboard.writeText(`${window.location.origin}/newspaper/${partyId}`)
    setNpLinkCopied(true)
    setTimeout(() => setNpLinkCopied(false), 2000)
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

  const editingGuest = editingGuestId ? guests.find(g => g.id === editingGuestId) : undefined
  const missionsLocked = !!editingGuest?.mission_accepted
  const isVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
  const TIERS = [
    { key: 'easy' as const, field: 'mission_easy' as const, label: '🟢 Easy' },
    { key: 'medium' as const, field: 'mission_medium' as const, label: '🟡 Medium' },
    { key: 'legendary' as const, field: 'mission_legendary' as const, label: '🔥 Legendary' },
  ]

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
            <span>✏️ Edit invitation</span>
            <span style={{ opacity: 0.5 }}>{showCopyEditor ? '▲' : '▼'}</span>
          </button>

          {showCopyEditor && (
            <div className="rounded-2xl p-4 mt-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs mb-4" style={{ color: 'rgba(253,246,227,0.3)' }}>
                The headline, story, date and time guests see on the invitation. Type <span style={{ color: 'var(--gold)' }}>{'{name}'}</span> anywhere to drop in each guest's first name.
              </p>

              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={dateDraft} onChange={e => { setDateDraft(e.target.value); setCopySaved(false) }} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex-1">
                  <label style={labelStyle}>Time</label>
                  <input value={timeDraft} onChange={e => { setTimeDraft(e.target.value); setCopySaved(false) }} placeholder="3:00 PM" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <label style={labelStyle}>Birthday person's email (to send their surprise)</label>
              <input type="email" value={emailDraft} onChange={e => { setEmailDraft(e.target.value); setCopySaved(false) }} placeholder="isaac@email.com" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-4" style={inputStyle} />

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

        {/* Captain's Notes editor */}
        <div className="mb-4">
          <button
            onClick={() => setShowNotesEditor(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span>⚓ Before We Set Sail ({noteBlocks.length})</span>
            <span style={{ opacity: 0.5 }}>{showNotesEditor ? '▲' : '▼'}</span>
          </button>

          {showNotesEditor && (
            <div className="rounded-2xl p-4 mt-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs mb-4" style={{ color: 'rgba(253,246,227,0.3)' }}>
                Boarding to-dos guests see before their missions — waiver, what to bring, playlist, dress code. A note with a link shows as a button. Mark the truly important ones Required.
              </p>

              <div className="flex flex-col gap-3">
                {noteBlocks.map((n, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold" style={{ color: 'rgba(201,168,76,0.7)' }}>Note {i + 1}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveNote(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg text-xs disabled:opacity-25" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--cream)' }}>↑</button>
                        <button onClick={() => moveNote(i, 1)} disabled={i === noteBlocks.length - 1} className="w-7 h-7 rounded-lg text-xs disabled:opacity-25" style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--cream)' }}>↓</button>
                        <button onClick={() => removeNoteBlock(i)} className="w-7 h-7 rounded-lg text-xs" style={{ background: 'rgba(196,98,45,0.18)', color: '#f0a07a' }}>×</button>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-2">
                      <input value={n.icon ?? ''} onChange={e => updateNote(i, 'icon', e.target.value)} placeholder="🚤" className="w-12 px-2 py-2 rounded-lg text-center text-sm outline-none" style={inputStyle} />
                      <input value={n.title ?? ''} onChange={e => updateNote(i, 'title', e.target.value)} placeholder="Title (e.g. Please sign the waiver)" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                    </div>
                    <textarea value={n.text} onChange={e => updateNote(i, 'text', e.target.value)} rows={2} placeholder="Short description" className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2" style={inputStyle} />
                    <div className="flex gap-2 mb-2">
                      <input value={n.link ?? ''} onChange={e => updateNote(i, 'link', e.target.value)} placeholder="https://link (optional)" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                      <input value={n.button_label ?? ''} onChange={e => updateNote(i, 'button_label', e.target.value)} placeholder="Button text" className="w-28 px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'rgba(253,246,227,0.3)' }}>Type:</span>
                      {([['required', 'Required'], ['optional', 'Optional'], ['info', 'Info']] as const).map(([k, label]) => {
                        const curKind = n.kind || (n.priority === 'required' ? 'required' : (n.link ? 'optional' : 'info'))
                        return (
                          <button key={k} onClick={() => updateNote(i, 'kind', k)}
                            className="text-xs px-2.5 py-1 rounded-full transition-all"
                            style={curKind === k
                              ? { background: k === 'required' ? 'var(--terracotta)' : k === 'optional' ? 'var(--gold)' : 'rgba(255,255,255,0.2)', color: k === 'optional' ? 'var(--navy)' : 'var(--cream)', fontWeight: 700 }
                              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(253,246,227,0.4)' }}>
                            {label}
                          </button>
                        )
                      })}
                      {(n.kind || (n.priority === 'required' ? 'required' : (n.link ? 'optional' : 'info'))) === 'optional' && (
                        <label className="flex items-center gap-1 text-xs ml-1 cursor-pointer" style={{ color: 'rgba(253,246,227,0.5)' }}>
                          <input type="checkbox" checked={!!n.markable} onChange={e => updateNoteMarkable(i, e.target.checked)} />
                          “Mark as Done”
                        </label>
                      )}
                    </div>
                    <p className="text-[0.65rem] mt-1.5" style={{ color: 'rgba(253,246,227,0.25)' }}>
                      Required = must be done to unlock missions · Optional = helpful, never blocks · Info = a note to read
                    </p>
                  </div>
                ))}
              </div>

              <button onClick={addNote} className="w-full py-2.5 mt-3 rounded-xl text-xs font-semibold" style={{ color: 'rgba(201,168,76,0.7)', background: 'rgba(201,168,76,0.06)', border: '1px dashed rgba(201,168,76,0.25)' }}>
                + Add a note
              </button>

              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="w-full py-3 mt-3 rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
                style={notesSaved ? { background: 'rgba(107,127,94,0.25)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.4)' } : { background: 'var(--gold)', color: 'var(--navy)' }}
              >
                {savingNotes ? 'Saving…' : notesSaved ? '✓ Saved — guests see it now' : "Save Captain's Notes"}
              </button>
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

              {/* Mission progress — live updates from the guest */}
              {(() => {
                const mp = (guest.mission_progress && typeof guest.mission_progress === 'object') ? guest.mission_progress : {}
                const rows = TIERS.filter(t => guest[t.field])
                if (rows.length === 0) return null
                const doneCount = rows.filter(t => mp[t.key]?.done).length
                return (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(201,168,76,0.7)' }}>
                      Missions {doneCount}/{rows.length} done
                    </p>
                    <div className="flex flex-col gap-2">
                      {rows.map(t => {
                        const e = mp[t.key] ?? {}
                        return (
                          <div key={t.key}>
                            <div className="flex items-start gap-2">
                              <span className="text-xs flex-shrink-0">{e.done ? '✅' : '🟡'}</span>
                              <p className="text-xs leading-snug" style={{ color: 'rgba(253,246,227,0.6)' }}>
                                <span style={{ color: 'rgba(253,246,227,0.35)' }}>{t.label.split(' ')[1]}:</span> {guest[t.field]}
                                {guest.mission_swapped?.[t.key] && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold" style={{ background: 'rgba(201,168,76,0.18)', color: 'var(--gold)' }}>🎲 Swapped</span>}
                                {guest.mission_locked?.[t.key] && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold" style={{ background: 'rgba(107,190,94,0.18)', color: '#a8c99a' }}>✅ Accepted</span>}
                              </p>
                            </div>
                            {e.note && (
                              <p className="text-xs mt-1 ml-5 px-2.5 py-1.5 rounded-lg leading-relaxed" style={{ background: 'rgba(95,182,230,0.1)', color: 'rgba(253,246,227,0.7)' }}>
                                ❝ {e.note} ❞
                              </p>
                            )}
                            {Array.isArray(e.media) && e.media.length > 0 && (
                              <div className="grid grid-cols-4 gap-1.5 mt-1.5 ml-5">
                                {e.media.map((url, i) => (
                                  isVideo(url)
                                    ? <video key={i} src={url} controls className="w-full aspect-square object-cover rounded-lg" />
                                    : <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

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
          onClick={() => { setEditingGuestId(null); setNewGuest({ name: '', role_name: '', role_description: '', mission_easy: '', mission_medium: '', mission_legendary: '' }); setAltsDraft(EMPTY_ALTS); setPhotoFile(null); setPhotoPreview(''); setSelectedTemplate(-1); setAddError(''); setShowAddGuest(true) }}
          className="w-full py-4 rounded-2xl text-sm font-semibold tracking-widest uppercase active:scale-95 transition-all mb-6"
          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
        >
          + Add Guest
        </button>

        {/* ── Messages in a Bottle (faraway contributors) ── */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(95,174,158,0.1)', border: '1px solid rgba(95,174,158,0.3)' }}>
          <p className="text-xs tracking-[0.18em] uppercase mb-1" style={{ color: '#8fd0c0' }}>🍾 Messages in a Bottle</p>
          <p className="text-xs mb-3" style={{ color: 'rgba(253,246,227,0.4)' }}>
            Share this with {party?.birthday_person_name}'s parents and faraway loved ones. They float a wish, photo, or video into the newspaper — no app, no login.
          </p>
          <button
            onClick={() => {
              if (!party) return
              navigator.clipboard.writeText(`${window.location.origin}/bottle/${party.invite_code}`)
              setBottleCopied(true); setTimeout(() => setBottleCopied(false), 2000)
            }}
            className="w-full py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all"
            style={bottleCopied ? { background: 'rgba(107,127,94,0.25)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.4)' } : { background: '#5fae9e', color: '#fff' }}
          >
            {bottleCopied ? '✓ Link copied' : '🍾 Copy the Messages-in-a-Bottle link'}
          </button>
        </div>

        {/* ── Birthday Newspaper (Isaac's gift) ── */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <p className="text-xs tracking-[0.18em] uppercase mb-1" style={{ color: 'rgba(201,168,76,0.7)' }}>📰 {party?.birthday_person_name}'s Birthday Newspaper</p>

          {!party?.newspaper?.created ? (
            <>
              <p className="text-xs mb-4" style={{ color: 'rgba(253,246,227,0.35)' }}>
                After the party, turn everything — photos, roles, missions, and notes — into one keepsake newspaper for {party?.birthday_person_name}.
              </p>
              <button onClick={() => saveNewspaper({ created: true })} disabled={npBusy}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'var(--gold)', color: 'var(--navy)' }}>
                {npBusy ? 'Creating…' : '✨ Create Newspaper'}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={party.newspaper.published ? { background: 'rgba(107,127,94,0.25)', color: '#a8c99a' } : { background: 'rgba(255,255,255,0.08)', color: 'rgba(253,246,227,0.5)' }}>
                  {party.newspaper.published ? '🟢 Visible to guests' : '🔒 Private (only people with the link)'}
                </span>
              </div>

              {/* fields */}
              <div className="flex flex-col gap-3 mb-4">
                <div>
                  <label style={labelStyle}>Headline</label>
                  <input value={npDraft.headline} onChange={e => { setNpDraft(d => ({ ...d, headline: e.target.value })); setNpSaved(false) }} placeholder={`Captain ${party.birthday_person_name} Takes the Day`} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Subheadline</label>
                  <input value={npDraft.subheadline} onChange={e => { setNpDraft(d => ({ ...d, subheadline: e.target.value })); setNpSaved(false) }} placeholder="Crew confirms: excellent birthday, questionable navigation…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label style={labelStyle}>Quote of the day</label>
                    <input value={npDraft.quote} onChange={e => { setNpDraft(d => ({ ...d, quote: e.target.value })); setNpSaved(false) }} placeholder="“Best Sunday of the year.”" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                  <div className="w-28">
                    <label style={labelStyle}>Said by</label>
                    <input value={npDraft.quote_author} onChange={e => { setNpDraft(d => ({ ...d, quote_author: e.target.value })); setNpSaved(false) }} placeholder="Mao" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Captain's Log (the recap)</label>
                  <textarea value={npDraft.captains_log} onChange={e => { setNpDraft(d => ({ ...d, captains_log: e.target.value })); setNpSaved(false) }} rows={4} placeholder="Leave blank for a fun default…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Final note to {party.birthday_person_name}</label>
                  <textarea value={npDraft.final_note} onChange={e => { setNpDraft(d => ({ ...d, final_note: e.target.value })); setNpSaved(false) }} rows={3} placeholder="Your message for the birthday person…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cover photo</label>
                  <select value={npDraft.cover_photo} onChange={e => { setNpDraft(d => ({ ...d, cover_photo: e.target.value })); setNpSaved(false) }} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">{party.birthday_person_name}'s birthday photo (default)</option>
                    {guests.filter(g => g.photo).map(g => <option key={g.id} value={g.photo!}>{g.name}'s photo</option>)}
                  </select>
                </div>
              </div>

              <button onClick={() => saveNewspaper()} disabled={npBusy}
                className="w-full py-3 rounded-xl font-semibold text-sm active:scale-95 transition-all disabled:opacity-50 mb-2"
                style={npSaved ? { background: 'rgba(107,127,94,0.25)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.4)' } : { background: 'var(--gold)', color: 'var(--navy)' }}>
                {npBusy ? 'Saving…' : npSaved ? '✓ Saved' : 'Save newspaper'}
              </button>

              <div className="flex gap-2 mb-2">
                <button onClick={() => router.push(`/newspaper/${partyId}?host=1`)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  👁 Preview & hide items
                </button>
                <button onClick={copyGiftLink}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
                  {npLinkCopied ? '✓ Copied' : `🎁 Copy ${party.birthday_person_name}'s gift link`}
                </button>
              </div>

              <button onClick={togglePublish} disabled={npBusy}
                className="w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
                style={party.newspaper.published ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(253,246,227,0.6)', border: '1px solid rgba(255,255,255,0.1)' } : { background: 'var(--terracotta)', color: 'var(--cream)' }}>
                {party.newspaper.published ? 'Hide from guests' : '📣 Make visible to guests'}
              </button>

              {/* Send the magical birthday email (optional — needs RESEND_API_KEY) */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px dashed rgba(201,168,76,0.3)' }}>
                <p className="text-xs mb-2" style={{ color: 'rgba(253,246,227,0.4)' }}>
                  {party.birthday_person_email
                    ? <>Optional: send <span style={{ color: 'var(--gold)' }}>{party.birthday_person_email}</span> a themed email with the link to their newspaper.</>
                    : <>Optional: add {party.birthday_person_name}'s email in “✏️ Edit invitation” to email them their surprise (for later).</>}
                </p>
                <button onClick={sendBirthdayEmail} disabled={sendingEmail || !party.birthday_person_email}
                  className="w-full py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, var(--gold), var(--terracotta))', color: 'var(--cream)' }}>
                  {sendingEmail ? 'Sending…' : `🎉 Send birthday email to ${party.birthday_person_name}`}
                </button>
                {emailResult && (
                  <p className="text-xs mt-2 px-3 py-2 rounded-lg leading-relaxed" style={{ background: 'rgba(255,255,255,0.05)', color: emailResult.startsWith('✅') ? '#a8c99a' : '#f0a07a' }}>
                    {emailResult}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
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
              {!missionsLocked && (
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
              )}

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

                {missionsLocked && (
                  <div className="px-3 py-2.5 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(107,127,94,0.15)', color: '#a8c99a', border: '1px solid rgba(107,127,94,0.3)' }}>
                    🔒 {editingGuest?.name?.split(' ')[0] || 'This guest'} already accepted their missions, so they're locked. Name and role can still be edited.
                  </div>
                )}
                <div>
                  <label style={labelStyle}>🟢 Easy mission</label>
                  <textarea value={newGuest.mission_easy} disabled={missionsLocked} onChange={e => setNewGuest(g => ({ ...g, mission_easy: e.target.value }))} rows={2} placeholder="Call Isaac 'Captain' at least once…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-50" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>🟡 Medium mission</label>
                  <textarea value={newGuest.mission_medium} disabled={missionsLocked} onChange={e => setNewGuest(g => ({ ...g, mission_medium: e.target.value }))} rows={2} placeholder="Get two people to join a toast…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-50" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>🔥 Legendary mission</label>
                  <textarea value={newGuest.mission_legendary} disabled={missionsLocked} onChange={e => setNewGuest(g => ({ ...g, mission_legendary: e.target.value }))} rows={2} placeholder="Help create a group photo that actually looks fun…" className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none disabled:opacity-50" style={inputStyle} />
                </div>
              </div>

              {/* Alternate missions (the guest can swap to one of these) */}
              <div className="rounded-xl p-3 mb-5" style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(201,168,76,0.7)' }}>🎲 Alternate missions (so the guest can swap)</p>
                <p className="text-[0.65rem] mb-3" style={{ color: 'rgba(253,246,227,0.3)' }}>
                  Add 3–5 options per level, true to their role. The guest can only swap within the same level.
                </p>
                {([['easy', '🟢 Easy'], ['medium', '🟡 Medium'], ['legendary', '🔥 Legendary']] as const).map(([tier, label]) => (
                  <div key={tier} className="mb-3">
                    <label style={labelStyle}>{label}</label>
                    <div className="flex flex-col gap-1.5">
                      {altsDraft[tier].map((alt, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <textarea value={alt} onChange={e => updateAlt(tier, i, e.target.value)} rows={2} placeholder="Another mission in the same vibe…" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
                          <button type="button" onClick={() => removeAlt(tier, i)} className="w-7 h-7 rounded-lg text-xs flex-shrink-0 mt-0.5" style={{ background: 'rgba(196,98,45,0.18)', color: '#f0a07a' }}>×</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addAlt(tier)} className="text-xs py-1.5 rounded-lg" style={{ color: 'rgba(201,168,76,0.7)', background: 'rgba(201,168,76,0.06)', border: '1px dashed rgba(201,168,76,0.25)' }}>
                        + Add {label} option
                      </button>
                    </div>
                  </div>
                ))}
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
