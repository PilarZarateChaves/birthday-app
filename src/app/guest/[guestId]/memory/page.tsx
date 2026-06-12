'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

const QUESTIONS = [
  {
    field: 'memory_appreciation',
    prompt: 'What do you appreciate about Isaac?',
    placeholder: 'His laugh, his generosity, his terrible puns…',
    note: 'One thing is enough.',
  },
  {
    field: 'memory_favorite_moment',
    prompt: 'What moment from today will you remember?',
    placeholder: 'When the boat started and everyone…',
    note: 'The smaller the detail, the better.',
  },
  {
    field: 'memory_future_prediction',
    prompt: 'What do you think comes next for him?',
    placeholder: 'In five years he will…',
    note: 'Serious or not, both are welcome.',
  },
]

export default function MemoryCapsule({ params }: { params: Promise<{ guestId: string }> }) {
  const { guestId } = use(params)
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ memory_appreciation: '', memory_favorite_moment: '', memory_future_prediction: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const q = QUESTIONS[step]
  const isLast = step === QUESTIONS.length - 1

  function setAnswer(value: string) {
    setAnswers(a => ({ ...a, [q.field]: value }))
  }

  async function handleNext() {
    if (!answers[q.field as keyof typeof answers].trim()) return

    if (!isLast) {
      setStep(s => s + 1)
      return
    }

    setLoading(true)
    const { error: err } = await supabase.from('guests').update(answers).eq('id', guestId)
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push(`/guest/${guestId}`), 2200)
  }

  if (done) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0f1a30' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <p className="text-3xl mb-4">🗞️</p>
        <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontStyle: 'italic', opacity: 0.9 }}>
          Your words have been sealed<br />in the Captain's newspaper.
        </p>
      </motion.div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: '#0f1a30' }}>
      <div className="max-w-sm w-full">
        {/* Intro */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-10">
          <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--gold)', opacity: 0.7 }}>
            One final request from The Society
          </p>
          <p style={{ color: 'rgba(253,246,227,0.6)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.8 }}>
            Before we return to shore,<br />leave a note for the Captain.
          </p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i <= step ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35 }}
          >
            <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '0.5rem' }}>
              {q.prompt}
            </p>
            <p className="text-xs mb-4" style={{ color: 'rgba(253,246,227,0.35)' }}>{q.note}</p>

            <textarea
              autoFocus
              placeholder={q.placeholder}
              value={answers[q.field as keyof typeof answers]}
              onChange={e => setAnswer(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--cream)',
                border: '1px solid rgba(255,255,255,0.1)',
                lineHeight: 1.7,
              }}
            />
          </motion.div>
        </AnimatePresence>

        {error && <p className="text-sm text-center mt-3" style={{ color: 'var(--terracotta)' }}>{error}</p>}

        <button
          onClick={handleNext}
          disabled={loading || !answers[q.field as keyof typeof answers].trim()}
          className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase mt-5 active:scale-95 transition-all disabled:opacity-30"
          style={{ background: 'var(--gold)', color: 'var(--navy)' }}
        >
          {loading ? 'Sealing…' : isLast ? "Add to the Captain's Newspaper" : 'Next'}
        </button>
      </div>
    </main>
  )
}
