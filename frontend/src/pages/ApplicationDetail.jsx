import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'

export default function ApplicationDetail() {
  const { applicationId } = useParams()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const api = createApiClient()

      const res = await api.get(
        `/admin/applications/${applicationId}`
      )

      setApplication(res.data)
    } catch (err) {
      console.error('API取得失敗:', err)
      setApplication(null)
      setError(
        err.response?.data?.message ??
        err.message ??
        '詳細の取得に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  if (loading) {
    return (
      <MainLayout>
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.textSecondary, fontSize: 13 }}>読み込み中...</div>
      </MainLayout>
    )
  }

  if (!application) {
    return (
      <MainLayout>
        <div style={{ textAlign: 'center', padding: '60px 0', color: C.textSecondary, fontSize: 13 }}>{error ?? 'データが見つかりません'}</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <style>{`
        @media (max-width: 600px) {
          .detail-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em' }}>応募詳細</h1>
        </div>

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px' }}>

          <div className="detail-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <Item label="応募ID" value={application.id ?? application.applicationId} mono C={C} />
            <Item label="応募者ID" value={application.applicantUserId} mono C={C} />
            <Item label="案件名" value={application.jobTitle} C={C} />
            <Item label="案件ID" value={application.jobId} mono C={C} />
            <Item label="応募者名" value={application.applicantName} C={C} />
            <Item
              label="ステータス"
              C={C}
              value={
                <span style={{ padding: '2px 8px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.textSecondary }}>
                  {application.status}
                </span>
              }
            />
            <Item label="提案金額" value={`¥${Number(application.proposalAmount).toLocaleString()}`} C={C} />
            <Item label="登録日時" value={application.createdAt} C={C} />
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: C.textSecondary, marginBottom: 10 }}>提案内容</p>
            <div style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '14px 16px', whiteSpace: 'pre-wrap', fontSize: 13, color: C.textPrimary, lineHeight: 1.7 }}>
              {application.proposalContent}
            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  )
}

function Item({ label, value, mono, C }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  )
}
