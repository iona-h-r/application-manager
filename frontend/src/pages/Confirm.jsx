import { useState, useEffect } from 'react'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Confirm() {
  // URLパラメータからメールアドレスと再送フラグを取得
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email') ?? ''
  const shouldResend = params.get('resend') === 'true'

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })

  // サインアップ離脱ユーザーの再訪問時: マウント時に自動でコードを再送
  useEffect(() => {
    if (!shouldResend) return
    cognitoUser.resendConfirmationCode((err) => {
      if (err) { setError(err.message); return }
      setResent(true)
    })
  }, [])

  // 認証コードを確認
  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    cognitoUser.confirmRegistration(code, true, (err) => {
      setLoading(false)
      if (err) { setError(err.message); return }
      window.location.href = '/login'
    })
  }

  // 認証コードを再送
  const handleResend = () => {
    setError(null)
    setResent(false)

    cognitoUser.resendConfirmationCode((err) => {
      if (err) { setError(err.message); return }
      setResent(true)
    })
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', 'Noto Sans JP', sans-serif" }}>
      <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '32px 28px', width: '100%', maxWidth: 400 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 8, letterSpacing: '-0.02em' }}>メール認証</h2>
        <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 24 }}>
          <span style={{ color: C.textPrimary }}>{email}</span> に送信した認証コードを入力してください。
        </p>

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        {resent && (
          <div style={{ marginBottom: 14, padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.08)', border: `1px solid ${C.accent}`, borderRadius: 6, color: C.accent, fontSize: 13 }}>
            認証コードを再送しました。
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>認証コード</label>
            <input
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.textPrimary,
                fontSize: 24,
                textAlign: 'center',
                letterSpacing: '0.3em',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onFocus={(e) => { e.target.style.borderColor = C.accent }}
              onBlur={(e) => { e.target.style.borderColor = C.border }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            style={{ width: '100%', padding: '10px', backgroundColor: loading || code.length < 6 ? C.border : C.accent, color: loading || code.length < 6 ? C.textSecondary : C.bg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '確認中...' : '認証する'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: C.textSecondary }}>
          コードが届かない場合は{' '}
          <button
            onClick={handleResend}
            style={{ background: 'none', border: 'none', color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            再送する
          </button>
        </p>
      </div>
    </div>
  )
}
