'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Party } from '@/types/database'

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
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0f1a30' }}>
      <p style={{ color: 'var(--cream)', opacity: 0.4 }}>This invitation could not be found.</p>
    </main>
  )

  if (!party) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0f1a30' }} />
  )

  const partyDate = new Date(party.party_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden" style={{ background: '#0f1a30' }}>
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.08) 0%, transparent 70%)',
      }} />

      <div className="max-w-sm w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          {/* Society seal */}
          <p className="text-xs tracking-[0.4em] uppercase mb-8" style={{ color: 'var(--gold)', opacity: 0.8 }}>
            The Royal Gondolieri Society
          </p>

          {/* Photo */}
          {party.birthday_person_photo ? (
            <div className="w-24 h-24 rounded-full mx-auto mb-6 overflow-hidden" style={{ border: '2px solid rgba(201,168,76,0.5)' }}>
              <img src={party.birthday_person_photo} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl" style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.4)' }}>
              ⚓
            </div>
          )}
        </motion.div>

        {/* The invitation letter */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
          className="text-center"
        >
          <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(253,246,227,0.55)' }}>
            You have been selected by
          </p>
          <h1 style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '1.25rem' }}>
            {party.party_title}
          </h1>

          <div className="flex items-center justify-center gap-3 mb-6" style={{ color: 'rgba(201,168,76,0.5)' }}>
            <div style={{ height: 1, width: 32, background: 'currentColor' }} />
            <span style={{ fontSize: 10 }}>◆</span>
            <div style={{ height: 1, width: 32, background: 'currentColor' }} />
          </div>

          <p className="text-sm leading-relaxed mb-1" style={{ color: 'rgba(253,246,227,0.6)' }}>
            On {partyDate},
          </p>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(253,246,227,0.6)' }}>
            Captain {party.birthday_person_name} begins his birthday voyage.
          </p>

          <p className="text-sm leading-loose" style={{ color: 'rgba(253,246,227,0.75)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: '1rem', lineHeight: 2 }}>
            The Society needs your help.<br />
            There will be laughter.<br />
            There will be suspicious behavior.<br />
            There may be lemons.
          </p>
        </motion.div>

        {/* Host notes */}
        {party.host_notes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="rounded-2xl px-5 py-4 mt-8 mb-2"
            style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)' }}
          >
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--gold)', opacity: 0.7 }}>A note from the host</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(253,246,227,0.65)', fontStyle: 'italic' }}>
              {party.host_notes}
            </p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-8"
        >
          <button
            onClick={() => router.push(`/join/${code}`)}
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-widest uppercase active:scale-95 transition-all"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            Accept Invitation
          </button>
        </motion.div>
      </div>
    </main>
  )
}
