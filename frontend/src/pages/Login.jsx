import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const authDetails = new AuthenticationDetails({ Username: email, Password: password })
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => {
        setLoading(false)
        navigate('/')
      },
      onFailure: (err) => {
        setLoading(false)
        setError(err.message)
      },
      newPasswordRequired: () => {
        setLoading(false)
        setError('初回ログインです。パスワードの変更が必要です。管理者にお問い合わせください。')
      },
    })
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  const inputStyle = {
    width: '100%',
    padding: '9px 14px',
    backgroundColor: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.textPrimary,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', 'Noto Sans JP', sans-serif" }}>
      <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '32px 28px', width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 24, letterSpacing: '-0.02em' }}>ログイン</h2>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>メールアドレス</label>
            <input
              style={inputStyle}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = C.accent }}
              onBlur={(e) => { e.target.style.borderColor = C.border }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>パスワード</label>
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={(e) => { e.target.style.borderColor = C.accent }}
              onBlur={(e) => { e.target.style.borderColor = C.border }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 8, width: '100%', padding: '10px', backgroundColor: loading ? C.border : C.accent, color: loading ? C.textSecondary : C.bg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: C.textSecondary }}>
          アカウントをお持ちでない方は{' '}
          <a href="/signup" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>新規登録</a>
        </p>
      </div>
    </div>
  )
}
