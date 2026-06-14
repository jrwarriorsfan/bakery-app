import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Hanken Grotesk, sans-serif',
      background: 'radial-gradient(140% 90% at 12% -10%, #FCEFDC 0%, transparent 55%), radial-gradient(120% 80% at 100% 0%, #F7E7E9 0%, transparent 45%), #FBF4E9'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ background: '#FFFDF8', border: '1px solid #E7D9C5', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 380, boxShadow: '0 8px 24px -16px rgba(110,80,50,.16)' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 600, margin: '0 0 4px' }}>
          The <span style={{ fontStyle: 'italic', color: '#C8643C' }}>Bake</span> Book
        </h1>
        <p style={{ color: '#7A6452', fontSize: 14, margin: '0 0 28px' }}>Sign in to manage your orders.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com"
              style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none', color: '#33241A' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7A6452' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && signIn()}
              placeholder="••••••••"
              style={{ fontFamily: 'inherit', fontSize: 15, border: '1px solid #E7D9C5', borderRadius: 11, padding: '10px 12px', outline: 'none', color: '#33241A' }}
            />
          </div>
          {error && <div style={{ fontSize: 13, color: '#B5394F', fontWeight: 600 }}>{error}</div>}
          <button
            onClick={signIn}
            disabled={loading}
            style={{ background: '#C8643C', color: '#fff', border: 'none', borderRadius: 11, padding: '12px', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}