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
  const [lang, setLang] = useState<'es' | 'en'>('es')

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
      setError(lang === 'es' ? 'Escribe tu nombre y un mensajito (o una foto/video).' : 'Add your name and a little message (or a photo/video).')
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
      setError(lang === 'es' ? 'Uy, no se envió. Intenta de nuevo en un momento.' : 'Hmm, that didn\'t send. Please try again in a moment.')
      setSending(false)
      return
    }
    setSent(true); setSending(false)
  }

  if (loading) return <main className="min-h-screen" style={{ background: 'var(--riviera-bg)' }} />

  if (notFound || !party) return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--riviera-bg)' }}>
      <p style={{ color: 'var(--riviera-ink-soft)', fontFamily: "'Playfair Display', serif", fontStyle: 'italic', textAlign: 'center' }}>
        No encontramos este enlace.<br /><span style={{ fontSize: '0.8rem' }}>This bottle link wasn't found.</span>
      </p>
    </main>
  )

  const bday = party.birthday_person_name
  const t = lang === 'es' ? {
    eyebrow: 'Un mensaje en una botella',
    title: `Envíale algo a ${bday} 🍾`,
    intro: `${bday} se va de paseo en barco por su cumpleaños. No puedes estar a bordo, pero tu botella sí. Escríbele un deseo, agrega una foto o un video, y lo haremos flotar hasta su periódico de cumpleaños.`,
    fromLabel: '¿De parte de quién?',
    fromPh: 'Mamá · Abuelo Tito · Sofía desde Madrid',
    msgLabel: 'Tu mensaje',
    msgPh: `Feliz cumpleaños, ${bday}…`,
    addMedia: '📷 Agregar foto o video (opcional)',
    remove: 'quitar',
    send: 'Enviarla flotando 🌊',
    sending: 'Enviando…',
    sentTitle: '¡Tu botella va en camino!',
    sentBody: `Está flotando hasta el periódico de cumpleaños de ${bday}. Gracias por ser parte de la sorpresa 💛`,
    another: 'Enviar otro mensaje',
  } : {
    eyebrow: 'A message in a bottle',
    title: `Send ${bday} a little something 🍾`,
    intro: `${bday} is setting sail for a birthday boat day. You can't be aboard, but your bottle can. Write a wish, add a photo or a video, and we'll float it into ${bday}'s birthday newspaper.`,
    fromLabel: "Who's it from?",
    fromPh: 'Mom · Abuelo Tito · Sofía from Madrid',
    msgLabel: 'Your message',
    msgPh: `Happy birthday, ${bday}…`,
    addMedia: '📷 Add a photo or video (optional)',
    remove: 'remove',
    send: 'Send it floating 🌊',
    sending: 'Sending…',
    sentTitle: 'Your bottle is on its way!',
    sentBody: `It's floating to ${bday}'s birthday newspaper. Thank you for being part of the surprise 💛`,
    another: 'Send another message',
  }

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

      <div className="max-w-sm mx-auto relative z-10 pt-5">
        {/* language toggle */}
        <div className="flex justify-end mb-3">
          <div className="inline-flex rounded-full p-0.5" style={{ background: 'rgba(255,255,255,0.6)', boxShadow: '0 2px 8px rgba(45,58,74,0.08)' }}>
            {(['es', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} className="px-3 py-1 rounded-full text-xs font-bold uppercase transition-all"
                style={lang === l ? { background: 'var(--leaf)', color: '#fff' } : { background: 'transparent', color: 'var(--riviera-ink-soft)' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>

              {/* Hero: birthday photo with the bottle bobbing at its base */}
              <div className="relative mx-auto mb-9" style={{ width: 230 }}>
                {sparkles.map((sp, i) => (
                  <span key={i} className="marina-anim" style={{ position: 'absolute', top: sp.t, left: sp.l, width: sp.s, height: sp.s, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(255,210,63,0.7) 55%, transparent 100%)', animation: `twinkle 3.2s ease-in-out ${sp.d} infinite`, zIndex: 6 }} />
                ))}

                <div className="rounded-[2rem] overflow-hidden relative mx-auto" style={{ width: '100%', border: '6px solid #fff', boxShadow: '0 16px 42px rgba(45,58,74,0.22)', ...(party.birthday_person_photo ? {} : { aspectRatio: '9 / 10' }) }}>
                  {party.birthday_person_photo
                    ? <img src={party.birthday_person_photo} alt={bday} className="w-full" decoding="async" draggable={false} style={{ display: 'block', height: 'auto' }} />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--sky), var(--leaf))', color: '#fff', fontSize: '4rem', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>{bday[0]}</div>}
                  {/* waves lapping the base of the photo */}
                  <div className="absolute left-0 right-0 bottom-0" style={{ height: 26, overflow: 'hidden' }}>
                    <svg className="marina-anim" viewBox="0 0 120 28" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '200%', height: 26, animation: 'waveSlide 8s linear infinite', opacity: 0.55 }}>
                      <path d="M0 16 Q7.5 9 15 16 T30 16 T45 16 T60 16 T75 16 T90 16 T105 16 T120 16 V28 H0 Z" fill="rgba(159,202,181,0.9)" />
                    </svg>
                    <svg className="marina-anim" viewBox="0 0 120 28" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, width: '200%', height: 26, animation: 'waveSlide 5.5s linear infinite', opacity: 0.8 }}>
                      <path d="M0 19 Q7.5 13 15 19 T30 19 T45 19 T60 19 T75 19 T90 19 T105 19 T120 19 V28 H0 Z" fill="rgba(199,232,247,0.95)" />
                    </svg>
                  </div>
                </div>

                {/* bottle bobbing on the waves at the bottom of the photo */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: -34, display: 'flex', justifyContent: 'center', zIndex: 7 }}>
                  <motion.div animate={{ y: [0, -7, 0], rotate: [-7, 7, -7] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ filter: 'drop-shadow(0 8px 14px rgba(63,142,126,0.35))' }}>
                    <div style={{ transform: 'scale(0.62)', transformOrigin: 'bottom center' }}><BottleArt /></div>
                  </motion.div>
                </div>
              </div>

              <p className="text-center tracking-[0.28em] uppercase mb-2" style={{ fontSize: '0.62rem', color: 'var(--leaf)' }}>
                {t.eyebrow}
              </p>
              <h1 className="text-center" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.7rem', fontWeight: 700, color: 'var(--riviera-ink)', lineHeight: 1.2, marginBottom: '0.6rem' }}>
                {t.title}
              </h1>
              <p className="text-center text-sm leading-relaxed mb-7" style={{ color: 'var(--riviera-ink-soft)' }}>
                {t.intro}
              </p>

              <div className="rounded-3xl px-5 py-5 mb-4" style={{ background: '#fff', boxShadow: '0 8px 26px rgba(45,58,74,0.08)' }}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--riviera-ink-soft)' }}>{t.fromLabel}</label>
                <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder={t.fromPh}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-4"
                  style={{ background: 'var(--riviera-bg)', color: 'var(--riviera-ink)', border: '1.5px solid rgba(45,58,74,0.12)' }} />

                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--riviera-ink-soft)' }}>{t.msgLabel}</label>
                <textarea value={message} onChange={e => { setMessage(e.target.value); setError('') }} rows={4} placeholder={t.msgPh}
                  className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none mb-4"
                  style={{ background: 'var(--riviera-bg)', color: 'var(--riviera-ink)', border: '1.5px solid rgba(45,58,74,0.12)' }} />

                {preview ? (
                  <div className="relative mb-2">
                    {isVid
                      ? <video src={preview} controls className="w-full rounded-2xl" style={{ maxHeight: 240 }} />
                      : <img src={preview} alt="" className="w-full rounded-2xl object-cover" style={{ maxHeight: 240 }} />}
                    <button onClick={() => { setFile(null); setPreview('') }} className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--coral)', color: '#fff' }}>{t.remove}</button>
                  </div>
                ) : (
                  <label className="block">
                    <div className="w-full py-3 rounded-2xl font-bold text-sm text-center cursor-pointer active:scale-95 transition-all"
                      style={{ background: 'var(--sky-soft)', color: 'var(--sky)' }}>
                      {t.addMedia}
                    </div>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
                  </label>
                )}
              </div>

              {error && <p className="text-sm text-center mb-3" style={{ color: 'var(--coral)' }}>{error}</p>}

              <button onClick={send} disabled={sending}
                className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all disabled:opacity-60"
                style={{ background: 'var(--leaf)', color: '#fff', boxShadow: '0 8px 24px rgba(95,174,126,0.4)' }}>
                {sending ? t.sending : t.send}
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
                  {t.sentTitle}
                </h1>
                <p className="text-sm leading-relaxed mb-7" style={{ color: 'var(--riviera-ink-soft)' }}>
                  {t.sentBody}
                </p>
                <button onClick={() => { setSent(false); setName(''); setMessage(''); setFile(null); setPreview('') }}
                  className="text-sm font-semibold underline" style={{ color: 'var(--leaf)' }}>
                  {t.another}
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
