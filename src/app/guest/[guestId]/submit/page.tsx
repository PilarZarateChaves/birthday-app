'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

export default function SubmitProof({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = use(params)
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit() {
    if (!file) { setError('Please select a photo or video.'); return }
    setLoading(true)
    setError('')

    try {
      const { data: guest } = await supabase.from('guests').select('party_id').eq('id', guestId).single()
      if (!guest) throw new Error('Guest not found')

      const ext = file.name.split('.').pop()
      const path = `submissions/${guest.party_id}/${guestId}-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('party-media').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('party-media').getPublicUrl(path)

      await supabase.from('guests').update({
        submission_url: urlData.publicUrl,
        submission_note: note,
        mission_status: 'submitted',
      }).eq('id', guestId)

      router.push(`/guest/${guestId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden" style={{ background: 'var(--plum)' }}>
      {/* Warm glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 40% 20%, rgba(201,168,76,0.14) 0%, transparent 55%)',
      }} />

      <div className="max-w-sm w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl overflow-hidden mb-5"
          style={{
            background: 'var(--card-cream)',
            boxShadow: '0 24px 64px rgba(10,4,16,0.5), 0 4px 16px rgba(201,168,76,0.15)',
          }}
        >
          <div style={{ height: 6, background: 'linear-gradient(90deg, #c4622d, #c9a84c, #6b7f5e)' }} />

          <div className="px-7 pt-7 pb-7">
            <p style={{ color: 'rgba(201,168,76,0.7)', fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', marginBottom: 12 }}>
              Mission Proof
            </p>
            <h1 className="text-2xl mb-6" style={{ color: 'var(--navy)', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
              Submit your evidence
            </h1>

            <label className="block cursor-pointer mb-4">
              <div
                className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  background: 'rgba(26,39,68,0.04)',
                  border: '2px dashed rgba(201,168,76,0.35)',
                  minHeight: 180,
                  transition: 'border-color 0.2s',
                }}
              >
                {preview
                  ? file?.type.startsWith('video')
                    ? <video src={preview} controls className="w-full rounded-2xl" />
                    : <img src={preview} alt="" className="w-full object-cover rounded-2xl" style={{ maxHeight: 300 }} />
                  : (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">📎</p>
                      <p className="text-sm" style={{ color: 'rgba(26,39,68,0.4)' }}>Tap to upload photo or video</p>
                    </div>
                  )
                }
              </div>
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
            </label>

            <textarea
              placeholder="Add a note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{
                background: 'rgba(26,39,68,0.04)',
                color: 'var(--navy)',
                border: '1.5px solid rgba(201,168,76,0.2)',
                lineHeight: 1.6,
              }}
            />

            {error && <p className="text-sm text-center mt-3 mb-1" style={{ color: 'var(--terracotta)' }}>{error}</p>}
          </div>

          <div style={{ height: 4, background: 'linear-gradient(90deg, #6b7f5e, #c9a84c, #c4622d)' }} />
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSubmit}
          disabled={loading || !file}
          className="w-full py-4 rounded-2xl font-semibold text-sm uppercase disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)',
            color: 'var(--navy)',
            letterSpacing: '0.15em',
            boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Submitting…' : 'Submit Evidence'}
        </motion.button>

        <button
          onClick={() => router.back()}
          className="w-full py-3 mt-3 text-xs"
          style={{ color: 'rgba(253,246,227,0.25)' }}
        >
          Cancel
        </button>
      </div>
    </main>
  )
}
