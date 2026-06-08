'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const HOST_EMAIL = 'hola@vcfamilia.com'
const HOST_PASSWORD = 'gondolieri2026'

export default function HostLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim().toLowerCase() === HOST_EMAIL && password === HOST_PASSWORD) {
      localStorage.setItem('host_auth', '1')
      router.push('/host/create')
    } else {
      setError('Wrong email or password.')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--navy)' }}>
      <div className="w-full max-w-sm">
        <p className="text-xs tracking-[0.3em] uppercase mb-3 text-center" style={{ color: 'var(--gold)' }}>
          Host Access
        </p>
        <h1 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>
          Welcome back,<br />Grand Conspirator
        </h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.15)' }}
          />
          {error && <p className="text-sm text-center" style={{ color: 'var(--terracotta)' }}>{error}</p>}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide mt-2 active:scale-95 transition-all"
            style={{ background: 'var(--gold)', color: 'var(--navy)' }}
          >
            Enter the Society
          </button>
        </form>
      </div>
    </main>
  )
}
