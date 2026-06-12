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
    setTimeout(() => router.push(`/guest/${guestId}`), 2400)
  }

  if (done) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--plum)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.18) 0%, transparent 55%)',
      }} />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="text-center relative z-10"
      >
        <motion.p
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: 1 }}
          className="text-4xl mb-6"
        >
          🗞️
        </motion.p>
        <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontStyle: 'italic', opacity: 0.9, lineHeight: 1.7 }}>
          Your words have been sealed<br />in the Captain's newspaper.
        </p>
        <p className="text-sm mt-4" style={{ color: 'rgba(253,246,227,0.35)' }}>He'll read them soon.</p>
      </motion.div>
    </main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden" style={{ background: 'var(--plum)' }}>
      {/* Warm glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: [
          'radial-gradient(ellipse at 30% 20%, rgba(201,168,76,0.14) 0%, transparent 50%)',
          'radial-gradient(ellipse at 70% 80%, rgba(107,127,94,0.08) 0%, transparent 50%)',
        ].join(', '),
      }} />

      <div className="max-w-sm w-full relative z-10">
        {/* Intro */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-10">
          <p className="text-xs tracking-[0.4em] uppercase mb-3" style={{ color: 'var(--gold)', opacity: 0.65 }}>
            One final request from The Society
          </p>
          <p style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1rem', lineHeight: 1.9, opacity: 0.75 }}>
            Before we return to shore,<br />leave a note for the Captain.
          </p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 22 : 6,
                height: 6,
                background: i <= step ? 'var(--gold)' : 'rgba(253,246,227,0.15)',
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.38 }}
          >
            {/* Question on a cream "card" */}
            <div className="rounded-3xl overflow-hidden mb-4" style={{
              background: 'var(--card-cream)',
              boxShadow: '0 20px 56px rgba(10,4,16,0.45), 0 4px 12px rgba(201,168,76,0.12)',
            }}>
              <div style={{
                height: 5,
                background: 'linear-gradient(90deg, #c4622d, #c9a84c, #6b7f5e)',
              }} />

              <div className="px-6 pt-6 pb-6">
                <p style={{ color: 'var(--navy)', fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {q.prompt}
                </p>
                <p className="text-xs mb-5" style={{ color: 'rgba(26,39,68,0.4)', fontStyle: 'italic' }}>{q.note}</p>

                <textarea
                  autoFocus
                  placeholder={q.placeholder}
                  value={answers[q.field as keyof typeof answers]}
                  onChange={e => setAnswer(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
                  style={{
                    background: 'rgba(26,39,68,0.04)',
                    color: 'var(--navy)',
                    border: '1.5px solid rgba(201,168,76,0.25)',
                    lineHeight: 1.75,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                />
              </div>

              <div style={{ height: 4, background: 'linear-gradient(90deg, #6b7f5e, #c9a84c, #c4622d)' }} />
            </div>
          </motion.div>
        </AnimatePresence>

        {error && <p className="text-sm text-center mt-3 mb-3" style={{ color: 'var(--terracotta)' }}>{error}</p>}

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleNext}
          disabled={loading || !answers[q.field as keyof typeof answers].trim()}
          className="w-full py-4 rounded-2xl font-semibold text-sm uppercase mt-1 disabled:opacity-30"
          style={{
            background: 'linear-gradient(135deg, #c9a84c, #e8cc6a)',
            color: 'var(--navy)',
            letterSpacing: '0.15em',
            boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'Sealing…' : isLast ? "Add to the Captain's Newspaper" : 'Next'}
        </motion.button>
      </div>
    </main>
  )
}
