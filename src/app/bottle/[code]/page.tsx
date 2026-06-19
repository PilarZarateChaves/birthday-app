'use client'

import { useEffect, useState, use, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type PartyLite = { id: string; birthday_person_name: string; birthday_person_photo: string | null }

function BottleArt() {
  return (
    <svg width="120" height="160" viewBox="0 0 120 160" fill="none" aria-hidden>
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a9ddcf" />
          <stop offset="1" stopColor="#5fae9e" />
        </linearGradient>
      </defs>
      <rect x="49" y="4" width="22" height="18" rx="4" fill="#c98a4a" />
      <rect x="52" y="20" width="16" height="22" fill="url(#glass)" stroke="#3f8e7e" strokeWidth="1.6" />
      <path d="M38 46c0-4 4-6 10-7h24c6 1 10 3 10 7v90c0 8-6 14-14 14H52c-8 0-14-6-14-14V46Z" fill="url(#glass)" stroke="#3f8e7e" strokeWidth="2.2" />
      <rect x="46" y="56" width="7" height="80" rx="3.5" fill="#ffffff" opacity="0.5" />
      <g transform="rotate(-7 60 104)">
        <rect x="44" y="86" width="44" height="36" rx="4" fill="#fffdf3" stroke="#e7d9b8" strokeWidth="1" />
        <path d="M52 98h28M52 106h22M52 114h25" stroke="#c08a3e" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default function BottlePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [party, setParty] = useState<PartyLite | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [isVid, setIsVid] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('parties').select('id, birthday_person_name, birthday_person_photo').eq('invite_code', code).single()
      .then(({ data }) => {
        if (!data) setNotFound(true)
        else setParty(data as PartyLite)
        setLoading(false)
      })
  }, [code])

  const sparkles = useMemo(() => [
    { t: 4, l: '18%', s: 7, d: '0s' }, { t: 30, l: '80%', s: 6, d: '1.1s' },
    { t: 110, l: '12%', s: 5, d: '0.6s' }, { t: 90, l: '86%', s: 6, d: '1.6s' },
    { t: 150, l: '24%', s: 5, d: '0.9s' },
  ], [])

  function pickFile(f: File) {
    setFile(f)
    setIsVid(f.type.startsWith('video'))
    setPreview(URL.createObjectURL(f))
    setError('')
  }

  async function send() {
    if (!party || sending) return
    if (!name.trim() || (!message.trim() && !file)) {
      setError('Add your name and a little message (or a photo/video).')
      return
    }
    setSending(true); setError('')
    let media_url: string | null = null
    let media_type: 'photo' | 'video' | null = null
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `tributes/${party.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('party-media').upload(path, file, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('party-media').getPublicUrl(path)
        media_url = data.publicUrl
        media_type = isVid ? 'video' : 'photo'
      }
    }
    const { error: insErr } = await supabase.from('tributes').insert({
      party_id: party.id, name: name.trim(), message: message.trim() || null, media_url, media_type,
    })
    if (insErr) {
      setError('Hmm, that didn\'t send. Please try again in a moment.')
      setSending(false)
      return
    }
    setSent(true); setSending(false)
  }

  if (loading) return <main className="min-h-screen" style={{ background: 'var(--riviera-bg)' }} />

  if (notFound || !party) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--riviera-bg)' }}>
      <p style={{ color: 'var(--riviera-ink-soft)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', textAlign: 'center' }}>
        This bottle link wasn't found.<br /><span style={{ fontSize: '0.8rem' }}>Double-check the link.</span>
      </p>
    </main>
  )

  const bday = party.birthday_person_name

  return (
    <main className="min-h-screen relative overflow-hidden px-5 pb-24" style={{ background: 'var(--riviera-bg)' }}>
      {/* gradient blobs */}
      <div className="fixed pointer-events-none" style={{ top: '-12%', left: '-18%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,182,230,0.35) 0%, transparent 70%)', filter: 'blur(22px)' }} />
      <div className="fixed pointer-events-none" style={{ top: '6%', right: '-20%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(95,174,158,0.3) 0%, transparent 70%)', filter: 'blur(24px)' }} />
      <div className="fixed pointer-events-none" style={{ bottom: '-10%', right: '-14%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,210,63,0.28) 0%, transparent 70%)', filter: 'blur(22px)' }} />

      {/* bottom waves */}
      <div className="fixed left-0 right-0 bottom-0 pointer-events-none" style={{ height: 60, overflow: 'hidden' }}>
        <svg viewBox="0 0 120 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '200%', height: 60, animation: 'waveSlide 9s linear infinite', opacity: 0.5 }}>
          <path d="M0 14 Q7.5 7 15 14 T30 14 T45 14 T60 14 T75 14 T90 14 T105 14 T120 14 V30 H0 Z" fill="rgba(95,182,230,0.5)" />
        </svg>
        <svg viewBox="0 0 120 30" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '200%', height: 60, animation: 'waveSlide 6s linear infinite', opacity: 0.6 }}>
          <path d="M0 18 Q7.5 12 15 18 T30 18 T45 18 T60 18 T75 18 T90 18 T105 18 T120 18 V30 H0 Z" fill="rgba(159,202,181,0.6)" />
        </svg>
      </div>

      <div className="max-w-sm mx-auto relative z-10 pt-10">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>

              {/* Hero bottle */}
              <div className="relative mx-auto mb-5" style={{ width: 160, height: 180 }}>
                {sparkles.map((sp, i) => (
                  <span key={i} className="marina-anim" style={{ position: 'absolute', top: sp.t, left: sp.l, width: sp.s, height: sp.s, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(255,210,63,0.7) 55%, transparent 100%)', animation: `twinkle 3.2s ease-in-out ${sp.d} infinite`, zIndex: 3 }} />
                ))}
                <motion.div animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute left-1/2" style={{ transform: 'translateX(-50%)', filter: 'drop-shadow(0 12px 22px rgba(63,142,126,0.3))' }}>
                  <BottleArt />
                </motion.div>
              </div>

              <p className="text-center tracking-[0.28em] uppercase mb-2" style={{ fontSize: '0.62rem', color: 'var(--leaf)' }}>
                A message in a bottle
              </p>
              <h1 className="text-center" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.7rem', fontWeight: 700, color: 'var(--riviera-ink)', lineHeight: 1.2, marginBottom: '0.6rem' }}>
                Send {bday} a little something 🍾
              </h1>
              <p className="text-center text-sm leading-relaxed mb-7" style={{ color: 'var(--riviera-ink-soft)' }}>
                {bday} is setting sail for a birthday boat day. You can't be aboard, but your bottle can. Write a wish, add a photo or a video, and we'll float it into {bday}'s birthday newspaper.
              </p>

              <div className="rounded-3xl px-5 py-5 mb-4" style={{ background: '#fff', boxShadow: '0 8px 26px rgba(45,58,74,0.08)' }}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--riviera-ink-soft)' }}>Who's it from?</label>
                <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="Mom · Abuelo Tito · Sofía from Madrid"
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-4"
                  style={{ background: 'var(--riviera-bg)', color: 'var(--riviera-ink)', border: '1.5px solid rgba(45,58,74,0.12)' }} />

                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--riviera-ink-soft)' }}>Your message</label>
                <textarea value={message} onChange={e => { setMessage(e.target.value); setError('') }} rows={4} placeholder={`Happy birthday, ${bday}…`}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none mb-4"
                  style={{ background: 'var(--riviera-bg)', color: 'var(--riviera-ink)', border: '1.5px solid rgba(45,58,74,0.12)' }} />

                {preview ? (
                  <div className="relative mb-2">
                    {isVid
                      ? <video src={preview} controls className="w-full rounded-2xl" style={{ maxHeight: 240 }} />
                      : <img src={preview} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: 240 }} />}
                    <button onClick={() => { setFile(null); setPreview('') }} className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--coral)', color: '#fff' }}>remove</button>
                  </div>
                ) : (
                  <label className="block">
                    <div className="w-full py-3 rounded-2xl font-bold text-sm text-center cursor-pointer active:scale-95 transition-all"
                      style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>
                      📷 Add a photo or video (optional)
                    </div>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
                  </label>
                )}
              </div>

              {error && <p className="text-sm text-center mb-3" style={{ color: 'var(--coral)' }}>{error}</p>}

              <button onClick={send} disabled={sending}
                className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-60"
                style={{ background: 'var(--leaf)', color: '#fff', boxShadow: '0 8px 24px rgba(95,174,126,0.4)' }}>
                {sending ? 'Sending…' : 'Send it floating 🌊'}
              </button>
            </motion.div>
          ) : (
            <motion.div key="sent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-10">
              <motion.div initial={{ y: 40, opacity: 0, rotate: 0 }} animate={{ y: [-10, -260], x: [0, 90], rotate: [0, 35], opacity: [1, 1, 0] }}
                transition={{ duration: 2.6, ease: 'easeIn', times: [0, 0.6, 1] }}
                className="mx-auto" style={{ width: 120 }}>
                <BottleArt />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                <p style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🌊</p>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: 'var(--riviera-ink)', marginBottom: '0.5rem' }}>
                  Your bottle is on its way!
                </h1>
                <p className="text-sm leading-relaxed mb-7" style={{ color: 'var(--riviera-ink-soft)' }}>
                  It's floating to {bday}'s birthday newspaper. Thank you for being part of the surprise 💛
                </p>
                <button onClick={() => { setSent(false); setName(''); setMessage(''); setFile(null); setPreview('') }}
                  className="text-sm font-semibold underline" style={{ color: 'var(--leaf)' }}>
                  Send another message
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center pt-10" style={{ color: 'var(--riviera-ink-soft)', opacity: 0.4, fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          Made with love by Pili
        </p>
      </div>
    </main>
  )
}
