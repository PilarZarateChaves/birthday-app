'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
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
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--navy)' }}>
      <div className="max-w-sm w-full">
        <p className="text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: 'var(--gold)' }}>Mission Proof</p>
        <h1 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          Submit your evidence
        </h1>

        <label className="block cursor-pointer mb-4">
          <div
            className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(201,168,76,0.4)', minHeight: 180 }}
          >
            {preview
              ? file?.type.startsWith('video')
                ? <video src={preview} controls className="w-full rounded-2xl" />
                : <img src={preview} alt="" className="w-full object-cover rounded-2xl" style={{ maxHeight: 300 }} />
              : (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">📎</p>
                  <p className="text-sm" style={{ color: 'var(--cream)', opacity: 0.5 }}>Tap to upload photo or video</p>
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
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-4"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
        />

        {error && <p className="text-sm text-center mb-3" style={{ color: 'var(--terracotta)' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !file}
          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-60"
          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
        >
          {loading ? 'Submitting…' : 'Submit Evidence'}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full py-3 mt-3 text-sm"
          style={{ color: 'var(--cream)', opacity: 0.4 }}
        >
          Cancel
        </button>
      </div>
    </main>
  )
}
