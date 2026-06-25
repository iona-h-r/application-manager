import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createApiClient } from '../lib/api'
import MainLayout from '../layouts/MainLayout'

const PAGE_SIZE = 10

function normalizeAdminResults(data) {
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

export default function Admin() {
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [nextToken, setNextToken] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [pageStartTokens, setPageStartTokens] = useState({ 1: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPage(1)
  }, [])

  const fetchApplications = async (params) => {
    const api = createApiClient()
    const res = await api.get('/admin/applications', { params })
    return {
      items: normalizeAdminResults(res.data),
      nextToken: res.data?.nextToken || null,
    }
  }

  const loadPage = async (targetPage) => {
    if (targetPage < 1 || query) {
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
          const probeRes = await fetchApplications({
            limit: PAGE_SIZE,
            nextToken: startToken || undefined,
          })
          if (!probeRes.nextToken) {
            throw new Error(`指定ページ(${targetPage})は存在しません`)
          }
          tokens[probePage + 1] = probeRes.nextToken
          probePage += 1
        }
        targetToken = tokens[targetPage]
      }

      const result = await fetchApplications({
        limit: PAGE_SIZE,
        nextToken: targetToken || undefined,
      })
      setResults(result.items)
      setNextToken(result.nextToken)
      if (result.nextToken) {
        tokens[targetPage + 1] = result.nextToken
      }
      setPageStartTokens(tokens)
      setCurrentPage(targetPage)
      setPageInput(String(targetPage))
    } catch (err) {
      console.error(err)
      setResults([])
      setError(
        err.response?.data?.message ??
        err.message ??
        '検索に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!query) {
        setPageStartTokens({ 1: null })
        setCurrentPage(1)
        setPageInput('1')
        const result = await fetchApplications({ limit: PAGE_SIZE })
        setResults(result.items)
        setNextToken(result.nextToken)
        if (result.nextToken) {
          setPageStartTokens({ 1: null, 2: result.nextToken })
        }
        return
      }

      const result = await fetchApplications({ id: query })
      setResults(result.items)
      setNextToken(null)
      setCurrentPage(1)
      setPageInput('1')
      setPageStartTokens({ 1: null })
    } catch (err) {
      console.error(err)
      setResults([])
      setError(
        err.response?.data?.message ??
        err.message ??
        '検索に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleNext = () => {
    if (!nextToken || loading || query) {
      return
    }
    loadPage(currentPage + 1)
  }

  const handlePrev = () => {
    if (currentPage <= 1 || loading || query) {
      return
    }
    loadPage(currentPage - 1)
  }

  const handleGoToPage = () => {
    const page = Number(pageInput)
    if (!Number.isInteger(page) || page < 1 || loading || query) {
      return
    }
    loadPage(page)
  }

  const C = { bg: '#09090B', surface: '#18181B', border: '#27272A', textPrimary: '#FAFAFA', textSecondary: '#A1A1AA', accent: '#10B981' }

  return (
    <MainLayout>
      <style>{`
        @media (max-width: 600px) {
          .admin-header-row { flex-direction: column !important; align-items: flex-start !important; }
          .admin-btn-row { width: 100%; }
          .admin-btn-row button { flex: 1; }
          .admin-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .admin-table-wrap table { min-width: 560px; }
        }
      `}</style>
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ marginBottom: 12, padding: '6px 10px', backgroundColor: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSecondary, fontSize: 12, cursor: 'pointer' }}
        >
          ← ホームに戻る
        </button>

        <div className="admin-header-row" style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Admin</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', marginBottom: 4 }}>
              管理者ダッシュボード
            </h1>
            <p style={{ fontSize: 13, color: C.textSecondary }}>応募情報の検索・閲覧</p>
          </div>

          <div className="admin-btn-row" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => navigate('/admin/jobs')}
              style={{ padding: '7px 14px', backgroundColor: C.accent, border: 'none', borderRadius: 6, color: C.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              発注案件一覧
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ flex: 1, padding: '9px 14px', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textPrimary, fontSize: 13, outline: 'none' }}
              placeholder="応募IDを入力（空欄で全件表示）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => { e.target.style.borderColor = C.accent }}
              onBlur={(e) => { e.target.style.borderColor = C.border }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{ padding: '9px 18px', backgroundColor: loading ? C.border : C.accent, color: loading ? C.textSecondary : C.bg, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? '検索中...' : '検索'}
            </button>
          </div>
        </div>

        <div className="admin-table-wrap" style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>

          {error && (
            <div style={{ padding: '10px 16px', backgroundColor: 'rgba(239,68,68,0.08)', borderBottom: `1px solid rgba(239,68,68,0.3)`, color: '#F87171', fontSize: 13 }}>
              {error}
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {['応募ID', '案件名', '応募者名', 'ステータス', '提案金額', '登録日時'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 12, fontWeight: 600, color: C.textSecondary }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((item) => (
                <tr
                  key={item.id ?? item.applicationId}
                  onClick={() => navigate(`/admin/applications/${item.id ?? item.applicationId}`)}
                  style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer', backgroundColor: C.surface, transition: 'background-color 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1C1C1F' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.surface }}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: C.textSecondary }}>{item.id ?? item.applicationId}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary }}>{item.jobTitle}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary, fontWeight: 500 }}>{item.applicantName}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    <span style={{ padding: '2px 8px', border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, color: C.textSecondary }}>{item.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textPrimary }}>¥{Number(item.proposalAmount).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.textSecondary }}>{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && results.length === 0 && !error && (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: C.textSecondary, fontSize: 13, backgroundColor: C.surface }}>
              応募データがありません
            </div>
          )}

          {!query && (
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
          )}

        </div>

      </div>
    </MainLayout>
  )
}
