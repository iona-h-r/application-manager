import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Apply() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const selectedJobId = searchParams.get('jobId') ?? ''
  const selectedJobTitle = searchParams.get('jobTitle') ?? ''

  const [formData, setFormData] = useState({
    jobId: '',
    jobTitle: '',
    applicantUserId: '',
    applicantName: '',
    proposalAmount: '',
    proposalContent: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [authorized, setAuthorized] = useState(null)

  useEffect(() => {
    if (!selectedJobId && !selectedJobTitle) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      jobId: selectedJobId || prev.jobId,
      jobTitle: selectedJobTitle || prev.jobTitle,
    }))
  }, [selectedJobId, selectedJobTitle])

  useEffect(() => {
    const currentUser = userPool.getCurrentUser()

    if (!currentUser) {
      setError('Cognito のログイン情報が取得できませんでした。')
      setAuthorized(false)
      return
    }

    currentUser.getSession((err, session) => {
      if (err || !session?.isValid()) {
        setError('Cognito のセッションが無効です。再ログインしてください。')
        setAuthorized(false)
        return
      }

      const payload = session.getIdToken().decodePayload()
      const groups = payload['cognito:groups'] || []
      const isAdmin = Array.isArray(groups) && groups.includes('Admin')
      if (isAdmin) {
        setAuthorized(false)
        setError('管理者ユーザーは応募フォームを利用できません。')
        return
      }

      const applicantUserId = payload.sub || currentUser.getUsername() || ''
      const applicantName =
        payload.name ||
        [payload.family_name, payload.given_name].filter(Boolean).join(' ') ||
        payload.email ||
        currentUser.getUsername() ||
        ''

      setFormData((prev) => ({
        ...prev,
        applicantUserId,
        applicantName,
      }))
      setAuthorized(true)
    })
  }, [])

  if (authorized === false) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const api = createApiClient()

      await api.post('/applications', {
        jobId: formData.jobId,
        jobTitle: formData.jobTitle,
        applicantUserId: formData.applicantUserId,
        applicantName: formData.applicantName,
        proposalAmount: Number(formData.proposalAmount),
        proposalContent: formData.proposalContent,
      })

      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <MainLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: 8, padding: '40px 32px', textAlign: 'center', maxWidth: 480, width: '100%' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 18 }}>✓</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>
              応募が完了しました
            </h2>
            <p style={{ fontSize: 13, color: '#A1A1AA' }}>
              担当者よりご連絡いたします。
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  const readonlyInput = {
    width: '100%', padding: '9px 14px', backgroundColor: '#111113',
    border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.textSecondary, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const activeInput = {
    width: '100%', padding: '9px 14px', backgroundColor: C.bg,
    border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const handleFocus = (e) => { e.target.style.borderColor = C.accent }
  const handleBlur = (e) => { e.target.style.borderColor = C.border }
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }

  return (
    <MainLayout>
      <style>{`
        @media (max-width: 600px) {
          .apply-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <button
            type="button"
            onClick={handleBack}
            style={{ marginBottom: 12, padding: '6px 10px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 12, cursor: 'pointer' }}
          >
            ← 戻る
          </button>
          <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Apply</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>
            案件応募
          </h1>
          <p style={{ fontSize: 13, color: C.textSecondary }}>応募内容を入力してください</p>
        </div>

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px 24px' }}>

          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="apply-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>案件ID</label>
                <input style={readonlyInput} value={formData.jobId} readOnly required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>案件名</label>
                <input style={readonlyInput} value={formData.jobTitle} readOnly onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} required />
              </div>
            </div>

            <div className="apply-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>応募者ID</label>
                <input style={readonlyInput} value={formData.applicantUserId} readOnly required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>応募者名</label>
                <input style={readonlyInput} value={formData.applicantName} readOnly required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>提案金額</label>
              <input
                type="number"
                min="0"
                style={activeInput}
                placeholder="50000"
                value={formData.proposalAmount}
                onChange={(e) => setFormData({ ...formData, proposalAmount: e.target.value })}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>提案内容</label>
              <textarea
                style={{ ...activeInput, height: 140, resize: 'none', padding: '10px 14px' }}
                placeholder="自己PRや提案内容を入力してください"
                value={formData.proposalContent}
                onChange={(e) => setFormData({ ...formData, proposalContent: e.target.value })}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '10px', backgroundColor: loading ? C.border : C.accent, color: loading ? C.textSecondary : C.bg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '送信中...' : '応募する'}
            </button>

          </form>
        </div>
      </div>
    </MainLayout>
  )
}
