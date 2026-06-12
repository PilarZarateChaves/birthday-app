'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Step = 'name' | 'children' | 'photo' | 'creating'

const fade = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [hasChildren, setHasChildren] = useState<boolean | null>(null)
  const [children, setChildren] = useState<{ name: string; age: string }[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [error, setError] = useState('')

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  async function handleCreate() {
    setStep('creating')
    setError('')

    try {
      const { data: party } = await supabase
        .from('parties').select('id').eq('invite_code', code).single()
      if (!party) throw new Error('Invitation not found')

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

      const email = `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@gondolieri.local`

      const { data: slots } = await supabase
        .from('guests')
        .select('*')
        .eq('party_id', party.id)
        .like('email', '%@gondolieri.local')
        .eq('name', '')
        .limit(1)

      let guestId: string

      if (slots && slots.length > 0) {
        const { data: updated } = await supabase
          .from('guests')
          .update({ name: name.trim(), email, photo: photoUrl || null })
          .eq('id', slots[0].id)
          .select()
          .single()
        guestId = updated!.id
      } else {
        const { data: newGuest } = await supabase
          .from('guests')
          .insert({
            party_id: party.id,
            name: name.trim(),
            email,
            photo: photoUrl || null,
            mission_status: 'in_progress',
            proof_required: false,
            is_host: false,
          })
          .select()
          .single()
        guestId = newGuest!.id
      }

      if (hasChildren && children.length > 0) {
        const valid = children.filter(c => c.name.trim() && c.age)
        if (valid.length > 0) {
          await supabase.from('children').insert(
            valid.map(c => ({
              guest_id: guestId,
              party_id: party.id,
              name: c.name.trim(),
              age: Number(c.age),
              role_name: Number(c.age) <= 4 ? 'Tiny Ambassador' : 'Junior Gondoliero',
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
      setStep('photo')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden" style={{ background: 'var(--plum)' }}>
      {/* Warm glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.14) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(196,98,45,0.08) 0%, transparent 50%)',
      }} />

      <div className="max-w-sm w-full relative z-10">
        <AnimatePresence mode="wait">

          {/* Step 1: Name */}
          {step === 'name' && (
            <motion.div key="name" {...fade}>
              <p className="text-xs tracking-[0.4em] uppercase mb-8 text-center" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                The Society asks
              </p>
              <h2 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '2rem', textAlign: 'center' }}>
                Before we can assign your role…<br />
                <span style={{ fontStyle: 'italic', opacity: 0.7 }}>what should we call you?</span>
              </h2>
              <input
                autoFocus
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('children')}
                className="w-full px-5 py-4 rounded-2xl text-base outline-none text-center"
                style={{
                  background: 'rgba(253,246,227,0.06)',
                  color: 'var(--cream)',
                  border: '1.5px solid rgba(201,168,76,0.25)',
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.1rem',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                onClick={() => name.trim() && setStep('children')}
                disabled={!name.trim()}
                className="w-full py-4 rounded-2xl font-semibold text-sm uppercase mt-4 active:scale-95 transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)', color: 'var(--navy)', letterSpacing: '0.15em', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}
              >
                That's me
              </button>
            </motion.div>
          )}

          {/* Step 2: Children */}
          {step === 'children' && (
            <motion.div key="children" {...fade}>
              <p className="text-xs tracking-[0.4em] uppercase mb-8 text-center" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                Welcome, {name}
              </p>
              <h2 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4, marginBottom: '2rem', textAlign: 'center' }}>
                Are any little crew members joining your voyage?
              </h2>

              <div className="flex flex-col gap-3 mb-6">
                {[
                  { value: false, label: 'Just me', sub: 'Solo voyage' },
                  { value: true, label: 'Yes, bringing little ones', sub: 'Babies & children welcome' },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setHasChildren(opt.value)}
                    className="w-full px-5 py-4 rounded-2xl text-left transition-all active:scale-95"
                    style={{
                      background: hasChildren === opt.value ? 'rgba(201,168,76,0.15)' : 'rgba(253,246,227,0.04)',
                      border: hasChildren === opt.value ? '1.5px solid rgba(201,168,76,0.55)' : '1.5px solid rgba(253,246,227,0.08)',
                      boxShadow: hasChildren === opt.value ? '0 4px 16px rgba(201,168,76,0.12)' : 'none',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: 'var(--cream)' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--cream)', opacity: 0.4 }}>{opt.sub}</p>
                  </button>
                ))}
              </div>

              {hasChildren && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                  {children.map((child, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        placeholder="Name"
                        value={child.name}
                        onChange={e => setChildren(c => c.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: 'rgba(253,246,227,0.06)', color: 'var(--cream)', border: '1.5px solid rgba(201,168,76,0.2)' }}
                      />
                      <input
                        placeholder="Age"
                        type="number"
                        min={0} max={17}
                        value={child.age}
                        onChange={e => setChildren(c => c.map((x, j) => j === i ? { ...x, age: e.target.value } : x))}
                        className="w-16 px-3 py-2.5 rounded-xl text-sm outline-none text-center"
                        style={{ background: 'rgba(253,246,227,0.06)', color: 'var(--cream)', border: '1.5px solid rgba(201,168,76,0.2)' }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setChildren(c => [...c, { name: '', age: '' }])}
                    className="text-xs py-2 px-4 rounded-xl w-full mt-1"
                    style={{ color: 'var(--gold)', background: 'rgba(201,168,76,0.07)', border: '1px dashed rgba(201,168,76,0.3)' }}
                  >
                    + Add another crew member
                  </button>
                </motion.div>
              )}

              {hasChildren !== null && (
                <button
                  onClick={() => setStep('photo')}
                  className="w-full py-4 rounded-2xl font-semibold text-sm uppercase active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)', color: 'var(--navy)', letterSpacing: '0.15em', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}
                >
                  Continue
                </button>
              )}
            </motion.div>
          )}

          {/* Step 3: Photo */}
          {step === 'photo' && (
            <motion.div key="photo" {...fade}>
              <p className="text-xs tracking-[0.4em] uppercase mb-8 text-center" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                Almost aboard
              </p>
              <h2 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4, marginBottom: '0.75rem', textAlign: 'center' }}>
                The Society needs a portrait for your membership card.
              </h2>
              <p className="text-sm text-center mb-8" style={{ color: 'rgba(253,246,227,0.4)' }}>
                Every member has one.
              </p>

              <label className="block cursor-pointer mb-6">
                <div
                  className="w-36 h-36 rounded-full mx-auto flex items-center justify-center overflow-hidden transition-all"
                  style={{
                    background: 'rgba(201,168,76,0.07)',
                    border: photoPreview ? '3px solid var(--gold)' : '2px dashed rgba(201,168,76,0.3)',
                    boxShadow: photoPreview ? '0 6px 24px rgba(201,168,76,0.25)' : 'none',
                  }}
                >
                  {photoPreview
                    ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    : <div className="text-center">
                        <p className="text-3xl mb-1">📷</p>
                        <p className="text-xs" style={{ color: 'rgba(253,246,227,0.35)' }}>Tap to add</p>
                      </div>
                  }
                </div>
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoChange} />
              </label>

              {error && <p className="text-sm text-center mb-4" style={{ color: 'var(--terracotta)' }}>{error}</p>}

              <button
                onClick={handleCreate}
                className="w-full py-4 rounded-2xl font-semibold text-sm uppercase active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)', color: 'var(--navy)', letterSpacing: '0.15em', boxShadow: '0 4px 20px rgba(201,168,76,0.3)' }}
              >
                Create My Membership Card
              </button>

              <button
                onClick={handleCreate}
                className="w-full py-3 mt-3 text-xs"
                style={{ color: 'rgba(253,246,227,0.28)' }}
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* Creating state */}
          {step === 'creating' && (
            <motion.div key="creating" {...fade} className="text-center">
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="text-4xl mb-8"
              >
                ⚓
              </motion.div>
              <p className="text-xs tracking-[0.4em] uppercase mb-4" style={{ color: 'var(--gold)', opacity: 0.7 }}>
                The Society is reviewing
              </p>
              <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontStyle: 'italic', opacity: 0.8 }}>
                Preparing your membership card…
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  )
}
