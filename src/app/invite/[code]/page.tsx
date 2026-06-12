'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'

const SPARKLES = [
  { top: 5,  left: 7,  size: 10, delay: 0,   dur: 3.2, char: '✦', c: 0 },
  { top: 12, left: 88, size: 7,  delay: 0.5,  dur: 2.9, char: '✦', c: 1 },
  { top: 28, left: 94, size: 12, delay: 1.1,  dur: 4.1, char: '·', c: 2 },
  { top: 65, left: 3,  size: 9,  delay: 0.7,  dur: 3.5, char: '✦', c: 0 },
  { top: 80, left: 91, size: 11, delay: 1.5,  dur: 3.8, char: '✦', c: 1 },
  { top: 44, left: 96, size: 7,  delay: 0.2,  dur: 2.5, char: '·', c: 0 },
  { top: 88, left: 14, size: 12, delay: 0.9,  dur: 4.3, char: '✦', c: 2 },
  { top: 4,  left: 54, size: 8,  delay: 1.8,  dur: 3.1, char: '·', c: 1 },
  { top: 36, left: 2,  size: 9,  delay: 0.6,  dur: 3.7, char: '✦', c: 0 },
  { top: 58, left: 97, size: 6,  delay: 2.1,  dur: 2.9, char: '·', c: 2 },
  { top: 93, left: 63, size: 8,  delay: 0.3,  dur: 4.0, char: '✦', c: 0 },
  { top: 17, left: 5,  size: 7,  delay: 1.4,  dur: 3.3, char: '·', c: 1 },
  { top: 72, left: 93, size: 10, delay: 2.0,  dur: 3.6, char: '✦', c: 2 },
  { top: 50, left: 98, size: 6,  delay: 0.8,  dur: 2.7, char: '·', c: 0 },
]

const COLORS = ['var(--gold)', 'var(--terracotta)', 'var(--sage)']

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const [party, setParty] = useState<Party | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase.from('parties').select('*').eq('invite_code', code).single()
      .then(({ data }) => {
        if (data) setParty(data)
        else setNotFound(true)
      })
  }, [code])

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--plum)' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.4 }}>This invitation could not be found.</p>
    </main>
  )

  if (!party) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--plum)' }} />
  )

  const partyDate = new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12 relative overflow-hidden"
      style={{ background: 'var(--plum)' }}
    >
      {/* Warm radial glows */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: [
          'radial-gradient(ellipse at 25% 15%, rgba(201,168,76,0.2) 0%, transparent 50%)',
          'radial-gradient(ellipse at 75% 85%, rgba(196,98,45,0.12) 0%, transparent 50%)',
        ].join(', '),
      }} />

      {/* Floating sparkles */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            fontSize: s.size,
            color: COLORS[s.c],
            animation: `twinkle ${s.dur}s ease-in-out infinite ${s.delay}s, floatBob ${s.dur * 1.3}s ease-in-out infinite ${s.delay * 0.6}s`,
          }}
        >
          {s.char}
        </span>
      ))}

      <div className="max-w-sm w-full relative z-10">

        {/* The invitation card — cream on dark, like opening an envelope */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'var(--card-cream)',
            boxShadow: '0 32px 80px rgba(10,4,16,0.6), 0 4px 20px rgba(201,168,76,0.18)',
          }}
        >
          {/* Festive top ribbon */}
          <div style={{
            height: 8,
            background: 'linear-gradient(90deg, #c4622d 0%, #c9a84c 30%, #6b7f5e 60%, #c9a84c 80%, #c4622d 100%)',
          }} />

          <div className="px-7 pt-7 pb-5 text-center">
            {/* Society wordmark */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{ color: 'rgba(201,168,76,0.7)', fontSize: '0.58rem', letterSpacing: '0.38em', textTransform: 'uppercase', marginBottom: 22 }}
            >
              The Royal Gondolieri Society
            </motion.p>

            {/* Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {party.birthday_person_photo ? (
                <div className="w-28 h-28 rounded-full mx-auto mb-6 overflow-hidden" style={{
                  border: '3px solid var(--gold)',
                  boxShadow: '0 6px 24px rgba(201,168,76,0.35)',
                }}>
                  <img src={party.birthday_person_photo} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl" style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '3px solid rgba(201,168,76,0.4)',
                  boxShadow: '0 6px 24px rgba(201,168,76,0.15)',
                }}>
                  ⚓
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <p className="text-sm mb-2" style={{ color: 'rgba(26,39,68,0.5)' }}>
                You have been selected by
              </p>
              <h1 style={{
                color: 'var(--navy)',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.8rem',
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: '1.25rem',
              }}>
                {party.party_title}
              </h1>
            </motion.div>

            {/* Ornamental divider */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.7 }}
              className="flex items-center justify-center gap-3 mb-5"
              style={{ color: 'rgba(201,168,76,0.5)' }}
            >
              <div style={{ height: 1, width: 44, background: 'currentColor' }} />
              <span style={{ fontSize: 9 }}>◆</span>
              <div style={{ height: 1, width: 44, background: 'currentColor' }} />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              <p className="text-sm mb-1" style={{ color: 'rgba(26,39,68,0.55)' }}>On {partyDate},</p>
              <p className="text-sm mb-6" style={{ color: 'rgba(26,39,68,0.55)' }}>
                Captain {party.birthday_person_name} begins his birthday voyage.
              </p>

              <p style={{
                color: 'var(--navy)',
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: '1rem',
                lineHeight: 2.1,
                opacity: 0.78,
              }}>
                The Society needs your help.<br />
                There will be laughter.<br />
                There will be suspicious behavior.<br />
                There may be lemons.
              </p>
            </motion.div>
          </div>

          {party.host_notes && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mx-7 mb-5 px-5 py-4 rounded-2xl"
              style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' }}
            >
              <p style={{ color: 'rgba(201,168,76,0.75)', fontSize: '0.58rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8 }}>
                A note from the host
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(26,39,68,0.65)', fontStyle: 'italic' }}>
                {party.host_notes}
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.7 }}
            className="px-7 pb-7"
          >
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push(`/join/${code}`)}
              className="w-full py-4 rounded-2xl font-semibold text-sm uppercase"
              style={{
                background: 'linear-gradient(135deg, #c9a84c 0%, #e8cc6a 50%, #c9a84c 100%)',
                color: 'var(--navy)',
                boxShadow: '0 6px 24px rgba(201,168,76,0.4)',
                letterSpacing: '0.18em',
              }}
            >
              Accept Invitation
            </motion.button>
          </motion.div>

          {/* Festive bottom ribbon */}
          <div style={{
            height: 5,
            background: 'linear-gradient(90deg, #6b7f5e 0%, #c9a84c 30%, #c4622d 60%, #c9a84c 80%, #6b7f5e 100%)',
          }} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center mt-6 text-xs"
          style={{ color: 'rgba(253,246,227,0.22)', fontStyle: 'italic' }}
        >
          Your membership card awaits.
        </motion.p>
      </div>
    </main>
  )
}
