import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'

export default function AdminJobCreate() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    employmentType: '正社員',
    budget: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const api = createApiClient()
      const res = await api.post('/admin/jobs', {
        jobTitle: formData.jobTitle,
        company: formData.company,
        location: formData.location,
        employmentType: formData.employmentType,
        budget: Number(formData.budget),
        description: formData.description,
      })
      setResult(res.data)
      navigate('/admin/jobs')
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          '案件作成に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  const inputStyle = {
    width: '100%', padding: '9px 14px', backgroundColor: C.bg,
    border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.textPrimary, fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const handleFocus = (e) => { e.target.style.borderColor = C.accent }
  const handleBlur = (e) => { e.target.style.borderColor = C.border }

  return (
    <MainLayout>
      <style>{`
        @media (max-width: 600px) {
          .create-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>案件作成</h1>
          <p style={{ fontSize: 13, color: C.textSecondary }}>管理者向けの案件登録フォームです</p>
        </div>

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px' }}>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.08)', border: `1px solid ${C.accent}`, borderRadius: 6, color: C.accent, fontSize: 13 }}>
              案件を作成しました。ID: {result.jobId ?? result.id ?? '(未返却)'}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>案件名</label>
              <input
                style={inputStyle}
                placeholder="React開発案件"
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>企業名</label>
              <input
                style={inputStyle}
                placeholder="株式会社サンプル"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                required
              />
            </div>

            <div className="create-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>勤務地</label>
                <input
                  style={inputStyle}
                  placeholder="東京都"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>雇用形態</label>
                <select
                  style={{ ...inputStyle, backgroundColor: C.bg }}
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                >
                  <option value="正社員">正社員</option>
                  <option value="業務委託">業務委託</option>
                  <option value="契約社員">契約社員</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>予算</label>
                <input
                  type="number"
                  min="0"
                  style={inputStyle}
                  placeholder="800000"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>業務内容</label>
              <textarea
                style={{ ...inputStyle, height: 140, resize: 'none', padding: '10px 14px' }}
                placeholder="必要スキル、担当範囲、稼働条件など"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
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
              {loading ? '作成中...' : '案件を作成する'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}
