'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function MemoryCapsule({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    memory_appreciation: '',
    memory_favorite_moment: '',
    memory_future_prediction: '',
  })

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('guests').update(form).eq('id', guestId)
    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/guest/${guestId}`)
  }

  const questions = [
    { field: 'memory_appreciation', label: 'One thing I appreciate about Isaac', placeholder: 'His laugh, his generosity, his terrible puns…' },
    { field: 'memory_favorite_moment', label: 'My favorite moment today', placeholder: 'When the boat started and everyone…' },
    { field: 'memory_future_prediction', label: "A prediction for Isaac's future", placeholder: 'In five years he will…' },
  ]

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--navy)' }}>
      <div className="max-w-sm w-full">
        <p className="text-xs tracking-[0.3em] uppercase mb-2 text-center" style={{ color: 'var(--gold)' }}>Memory Capsule</p>
        <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          Give Isaac a gift
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--cream)', opacity: 0.5 }}>
          Your answers will appear in his Birthday Newspaper.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {questions.map(q => (
            <div key={q.field}>
              <label className="text-xs tracking-wider uppercase mb-2 block" style={{ color: 'var(--gold)' }}>
                {q.label}
              </label>
              <textarea
                placeholder={q.placeholder}
                value={form[q.field as keyof typeof form]}
                onChange={e => update(q.field, e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
            </div>
          ))}

          {error && <p className="text-sm text-center" style={{ color: 'var(--terracotta)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide active:scale-95 transition-all disabled:opacity-60"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            {loading ? 'Adding…' : 'Add to Isaac\'s Birthday Newspaper'}
          </button>
        </form>
      </div>
    </main>
  )
}
