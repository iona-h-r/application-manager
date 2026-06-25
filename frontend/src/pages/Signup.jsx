import { useState } from 'react'
import { CognitoUser, CognitoUserPool, CognitoUserAttribute } from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [givenName, setGivenName] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)

    const attributes = [
      new CognitoUserAttribute({ Name: 'family_name', Value: familyName }),
      new CognitoUserAttribute({ Name: 'given_name', Value: givenName }),
      new CognitoUserAttribute({ Name: 'name', Value: `${familyName} ${givenName}` }),
    ]

    userPool.signUp(email, password, attributes, null, (err) => {
      if (err) {
        if (err.code === 'UsernameExistsException') {
          // 未確認 or 確認済みか区別するため resendConfirmationCode を試みる
          const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
          cognitoUser.resendConfirmationCode((resendErr) => {
            if (resendErr) {
              // 確認済みユーザー → ログインを促す
              if (
                resendErr.code === 'InvalidParameterException' &&
                resendErr.message.includes('already confirmed')
              ) {
                setError('このメールアドレスはすでに登録済みです。ログインしてください。')
                return
              }
              setError(resendErr.message)
              return
            }
            // 再送成功 → 未確認ユーザー → 認証コード画面へ（コードは再送済み）
            window.location.href = `/confirm?email=${encodeURIComponent(email)}&resend=true`
          })
          return
        }
        setError(err.message)
        return
      }
      window.location.href = `/confirm?email=${encodeURIComponent(email)}&resend=false`
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

  const handleFocus = (e) => { e.target.style.borderColor = C.accent }
  const handleBlur = (e) => { e.target.style.borderColor = C.border }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', 'Noto Sans JP', sans-serif" }}>
      <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '32px 28px', width: '100%', maxWidth: 420 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, marginBottom: 24, letterSpacing: '-0.02em' }}>アカウント作成</h2>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>姓</label>
              <input style={inputStyle} placeholder="山田" value={familyName} onChange={(e) => setFamilyName(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>名</label>
              <input style={inputStyle} placeholder="太郎" value={givenName} onChange={(e) => setGivenName(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} required />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>メールアドレス</label>
            <input style={inputStyle} type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>パスワード</label>
            <input style={inputStyle} type="password" placeholder="8文字以上" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} required />
          </div>

          <button
            type="submit"
            style={{ marginTop: 8, width: '100%', padding: '10px', backgroundColor: C.accent, color: C.bg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            登録する
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: C.textSecondary }}>
          登録済みの方は{' '}
          <a href="/login" style={{ color: C.accent, textDecoration: 'none', fontWeight: 600 }}>ログイン</a>
        </p>
      </div>
    </div>
  )
}
