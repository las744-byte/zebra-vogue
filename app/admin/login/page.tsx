'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Невірний пароль')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 40, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: 3, marginBottom: 20 }}>ZEBRA ADMIN</h1>
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        style={{ width: '100%', padding: 14, border: '2px solid #000', fontSize: 16, textAlign: 'center', marginBottom: 12, boxSizing: 'border-box' }}
      />
      <button
        onClick={handleLogin}
        style={{ width: '100%', padding: 14, background: '#000', color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
      >
        УВІЙТИ
      </button>
      {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
    </div>
  )
}