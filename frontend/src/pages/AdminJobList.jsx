import { useEffect, useState } from 'react'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'

const PAGE_SIZE = 10

function normalizeJobResults(data) {
  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.items)) {
    return data.items
  }

  if (data?.item && typeof data.item === 'object') {
    return [data.item]
  }

  return []
}

export default function AdminJobList() {
  const [jobs, setJobs] = useState([])
  const [nextToken, setNextToken] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [pageStartTokens, setPageStartTokens] = useState({ 1: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchJobs = async (token = null) => {
    const api = createApiClient()
    const params = { limit: PAGE_SIZE }
    if (token) {
      params.nextToken = token
    }
    const res = await api.get('/admin/jobs', { params })
    return {
      items: normalizeJobResults(res.data),
      nextToken: res.data?.nextToken || null,
    }
  }

  const loadPage = async (targetPage) => {
    if (targetPage < 1) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const tokens = { ...pageStartTokens }
      let targetToken = tokens[targetPage]

      if (targetToken === undefined) {
        let probePage = Math.max(...Object.keys(tokens).map((p) => Number(p)))
        while (probePage < targetPage) {
          const startToken = tokens[probePage]
          const probeRes = await fetchJobs(startToken)
          if (!probeRes.nextToken) {
            throw new Error(`指定ページ(${targetPage})は存在しません`)
          }
          tokens[probePage + 1] = probeRes.nextToken
          probePage += 1
        }
        targetToken = tokens[targetPage]
      }

      const result = await fetchJobs(targetToken)
      setJobs(result.items)
      setNextToken(result.nextToken)
      if (result.nextToken) {
        tokens[targetPage + 1] = result.nextToken
      }
      setPageStartTokens(tokens)
      setCurrentPage(targetPage)
      setPageInput(String(targetPage))
    } catch (err) {
      setJobs([])
      setError(
        err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          '発注案件一覧の取得に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage(1)
  }, [])

  const handleNext = () => {
    if (!nextToken || loading) {
      return
    }
    loadPage(currentPage + 1)
  }

  const handlePrev = () => {
    if (currentPage <= 1 || loading) {
      return
    }
    loadPage(currentPage - 1)
  }

  const handleGoToPage = () => {
    const page = Number(pageInput)
    if (!Number.isInteger(page) || page < 1 || loading) {
      return
    }
    loadPage(page)
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  return (
    <MainLayout>
      <style>{`
        @media (max-width: 600px) {
          .joblist-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .joblist-table-wrap table { min-width: 560px; }
        }
      `}</style>
      <div>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>発注案件一覧</h1>
          <p style={{ fontSize: 13, color: C.textSecondary }}>自分が発注した案件の一覧を表示します</p>
        </div>

        <div className="joblist-table-wrap" style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {error && (
            <div style={{ padding: '10px 16px', backgroundColor: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.3)', color: '#F87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {['案件ID', '案件名', '企業名', '勤務地', '雇用形態', '予算', '作成日時'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((item) => (
                <tr
                  key={item.jobId ?? item.id}
                  style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1C1C1F' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.surface }}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: C.textSecondary }}>{item.jobId ?? item.id}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary }}>{item.jobTitle}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary }}>{item.company}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSecondary }}>{item.location}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{ padding: '2px 8px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.textSecondary }}>{item.employmentType}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>¥{Number(item.budget ?? 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSecondary }}>{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && jobs.length === 0 && !error && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: C.textSecondary, fontSize: 13, backgroundColor: C.surface }}>
              発注案件データがありません
            </div>
          )}

          {loading && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textSecondary, fontSize: 13, backgroundColor: C.surface }}>
              読み込み中...
            </div>
          )}

          <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}`, backgroundColor: C.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <button
                onClick={handlePrev}
                disabled={loading || currentPage <= 1}
                style={{ padding: '7px 14px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 13, cursor: loading || currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: loading || currentPage <= 1 ? 0.4 : 1 }}
              >
                ← 前へ
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="1"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  style={{ width: 56, padding: '7px 10px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 13, textAlign: 'center', outline: 'none' }}
                />
                <button
                  onClick={handleGoToPage}
                  disabled={loading}
                  style={{ padding: '7px 12px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.4 : 1 }}
                >
                  移動
                </button>
              </div>
              <button
                onClick={handleNext}
                disabled={loading || !nextToken}
                style={{ padding: '7px 14px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 13, cursor: loading || !nextToken ? 'not-allowed' : 'pointer', opacity: loading || !nextToken ? 0.4 : 1 }}
              >
                次へ →
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
