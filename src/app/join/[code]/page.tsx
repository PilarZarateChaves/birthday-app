'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'children'>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', photo: '' })
  const [children, setChildren] = useState<{ name: string; age: string }[]>([])
  const [hasChildren, setHasChildren] = useState<boolean | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setStep('children')
  }

  async function handleJoin() {
    setLoading(true)
    setError('')

    try {
      const { data: party } = await supabase
        .from('parties').select('id').eq('invite_code', code).single()
      if (!party) throw new Error('Party not found')

      // Check if guest already joined
      const { data: existing } = await supabase
        .from('guests').select('id').eq('party_id', party.id).eq('email', form.email.toLowerCase().trim()).single()

      let guestId: string

      if (existing) {
        guestId = existing.id
      } else {
        // Upload photo if provided
        let photoUrl = ''
        if (photoFile) {
          const ext = photoFile.name.split('.').pop()
          const path = `guests/${party.id}/${Date.now()}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('party-media').upload(path, photoFile)
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('party-media').getPublicUrl(path)
            photoUrl = urlData.publicUrl
          }
        }

        // Find an unassigned slot (empty name placeholder)
        const { data: slots } = await supabase
          .from('guests')
          .select('*')
          .eq('party_id', party.id)
          .like('email', '%@gondolieri.local')
          .limit(1)

        if (slots && slots.length > 0) {
          const slot = slots[0]
          const { data: updated } = await supabase
            .from('guests')
            .update({ name: form.name.trim(), email: form.email.toLowerCase().trim(), photo: photoUrl || null })
            .eq('id', slot.id)
            .select()
            .single()
          guestId = updated!.id
        } else {
          // Create new guest with no pre-assigned role
          const { data: newGuest } = await supabase
            .from('guests')
            .insert({
              party_id: party.id,
              name: form.name.trim(),
              email: form.email.toLowerCase().trim(),
              photo: photoUrl || null,
              mission_status: 'in_progress',
              proof_required: false,
              is_host: false,
            })
            .select()
            .single()
          guestId = newGuest!.id
        }
      }

      // Save children
      if (hasChildren && children.length > 0) {
        const validChildren = children.filter(c => c.name.trim() && c.age)
        if (validChildren.length > 0) {
          await supabase.from('children').insert(
            validChildren.map(c => ({
              guest_id: guestId,
              party_id: party.id,
              name: c.name.trim(),
              age: Number(c.age),
              role_name: Number(c.age) <= 4
                ? 'Honorary Tiny Ambassador'
                : 'Junior Gondoliero',
              role_description: Number(c.age) <= 4
                ? 'Bringing joy and earning honorary lemons.'
                : 'On a secret junior mission.',
            }))
          )
        }
      }

      localStorage.setItem('guest_id', guestId)
      router.push(`/guest/${guestId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (step === 'info') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--navy)' }}>
        <div className="max-w-sm w-full">
          <p className="text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: 'var(--gold)' }}>Join the Voyage</p>
          <h1 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
            Who are you,<br />sailor?
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-3 mb-2">
              <label className="cursor-pointer">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '2px dashed rgba(201,168,76,0.4)' }}
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl">📸</span>
                  }
                </div>
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
              </label>
              <p className="text-xs" style={{ color: 'var(--cream)', opacity: 0.4 }}>Tap to add your photo</p>
            </div>

            <input
              placeholder="Your name"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
            />

            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide mt-2 active:scale-95 transition-all"
              style={{ background: 'var(--gold)', color: 'var(--navy)' }}
            >
              Continue
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--navy)' }}>
      <div className="max-w-sm w-full">
        <p className="text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: 'var(--gold)' }}>Almost there</p>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          Are you bringing any little crew members?
        </h1>

        <div className="flex flex-col gap-3 mb-6">
          {[{ value: false, label: 'Just me' }, { value: true, label: 'Yes, bringing children' }].map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setHasChildren(opt.value)}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: hasChildren === opt.value ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                color: hasChildren === opt.value ? 'var(--navy)' : 'var(--cream)',
                border: hasChildren === opt.value ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasChildren && (
          <div className="flex flex-col gap-3 mb-4">
            {children.map((child, i) => (
              <div key={i} className="flex gap-2">
                <input
                  placeholder="Name"
                  value={child.name}
                  onChange={e => setChildren(c => c.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
                <input
                  placeholder="Age"
                  type="number"
                  min={0}
                  max={17}
                  value={child.age}
                  onChange={e => setChildren(c => c.map((x, j) => j === i ? { ...x, age: e.target.value } : x))}
                  className="w-16 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
                />
              </div>
            ))}
            <button
              onClick={() => setChildren(c => [...c, { name: '', age: '' }])}
              className="text-xs py-2 rounded-xl"
              style={{ color: 'var(--gold)', background: 'rgba(201,168,76,0.1)' }}
            >
              + Add another child
            </button>
          </div>
        )}

        {error && <p className="text-sm text-center mb-3" style={{ color: 'var(--terracotta)' }}>{error}</p>}

        {hasChildren !== null && (
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            {loading ? 'Boarding the Duffy…' : 'Board the Duffy'}
          </button>
        )}
      </div>
    </main>
  )
}
