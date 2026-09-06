import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import MainLayout from '../layouts/MainLayout'
import { publicApi } from '../lib/api'
import { userPoolConfig } from '../lib/cognitoConfig'
import { resolvePageToken } from '../utils/pagination'

const userPool = new CognitoUserPool(userPoolConfig)
const PAGE_SIZE = 10

const colors = {
  bg: '#09090B',
  surface: '#18181B',
  border: '#27272A',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  accent: '#10B981',
}

function Icon({ children, size = 13, color = colors.textSecondary }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        color,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [nextToken, setNextToken] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [pageStartTokens, setPageStartTokens] = useState({ 1: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredJobId, setHoveredJobId] = useState(null)
  const [submittedQuery, setSubmittedQuery] = useState('')

  useEffect(() => {
    const currentUser = userPool.getCurrentUser()
    if (!currentUser) {
      setIsAdmin(false)
      return
    }

    currentUser.getSession((err, session) => {
      if (err || !session?.isValid()) {
        setIsAdmin(false)
        return
      }
      const payload = session.getIdToken().decodePayload()
      const groups = payload['cognito:groups'] || []
      setIsAdmin(Array.isArray(groups) ? groups.includes('Admin') : false)
    })
  }, [])

const fetchJobs = async (token, q = '') => {
const params = {
  limit: PAGE_SIZE,
  q,
}
    if (token) {
      params.nextToken = token
    }
    const res = await publicApi.get('/jobs', { params })
    return {
      items: Array.isArray(res.data?.items) ? res.data.items : [],
      nextToken: res.data?.nextToken || null,
    }
  }

const loadPage = async (
  targetPage,
  query = submittedQuery,
  initialTokens = pageStartTokens
) => {
  if (targetPage < 1) {
      return
    }

    setLoading(true)
    setError(null)

    try {
const tokens = { ...initialTokens }

const { token: resolvedToken, tokens: resolvedTokens } =
  await resolvePageToken({
    tokens,
    targetPage,
    fetchPage: (token) => fetchJobs(token, query),
  })

const result = await fetchJobs(resolvedToken, query)
      setJobs(result.items)
      setNextToken(result.nextToken)

      if (result.nextToken) {
        resolvedTokens[targetPage + 1] = result.nextToken
      }

      setPageStartTokens(resolvedTokens) 
      setCurrentPage(targetPage)
      setPageInput(String(targetPage))
      sessionStorage.setItem('homeCurrentPage', String(targetPage))
    } catch (err) {
      setJobs([])
      setError(
        err.response?.data?.message ??
        err.response?.data?.error ??
        err.message ??
        '案件一覧の取得に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

useEffect(() => {
  const savedPage = Number(sessionStorage.getItem('homeCurrentPage')) || 1
  loadPage(savedPage)
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

  const handleSearch = () => {
    const query = searchQuery.trim()

    setSubmittedQuery(query)
    setPageStartTokens({ 1: null })
    setCurrentPage(1)
    setPageInput('1')
    loadPage(1, query, { 1: null })
  }

  return (
    <MainLayout>
      {/* Hero */}
      <style>{`
        @media (max-width: 600px) {
          .home-hero { padding: 32px 0 28px !important; }
          .home-hero h1 { font-size: 26px !important; }
          .home-search-row { flex-direction: column !important; max-width: none !important; width: 100% !important; }
          .home-search-row > * { width: 100% !important; }
          .home-job-row { flex-direction: column !important; gap: 10px !important; }
          .home-job-right { flex-direction: row !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; }
          .home-tags { flex-wrap: wrap !important; }
          .home-pagination { flex-wrap: wrap !important; justify-content: center !important; }
        }
      `}</style>

      <section className="home-hero" style={{ borderBottom: `1px solid ${colors.border}`, padding: '48px 0 36px', marginBottom: 28 }}>
        <p style={{ fontSize: 12, color: colors.accent, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
          Job Board
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 8 }}>
          次のキャリアを見つけよう
        </h1>
        <p style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>
          厳選された案件から、あなたに合った仕事を探してください。
        </p>

        <div className="home-search-row" style={{ display: 'flex', gap: 8, maxWidth: 560 }}>
          <input
            type="text"
            placeholder="職種・企業名・キーワードで検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              padding: '9px 14px',
              fontSize: 13,
              color: colors.textPrimary,
              outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = colors.accent }}
            onBlur={(e) => { e.target.style.borderColor = colors.border }}
          />
          <button
            type="button"
            onClick={handleSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 18px',
              backgroundColor: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={12} color={colors.bg}>
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16L21 21" />
            </Icon>
            検索
          </button>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: colors.textSecondary }}>
          {loading ? '読み込み中...' : (
            <>
              <span style={{ color: colors.accent, fontWeight: 600 }}>{jobs.length}</span>
              {' '}件の案件
            </>
          )}
        </p>
        <span style={{ fontSize: 12, color: colors.textSecondary }}>
          {currentPage} ページ目
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#F87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Job list */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            onMouseEnter={() => setHoveredJobId(job.id)}
            onMouseLeave={() => setHoveredJobId(null)}
            style={{
              backgroundColor: hoveredJobId === job.id ? '#1C1C1F' : colors.surface,
              borderBottom: `1px solid ${colors.border}`,
              padding: '16px 18px',
              transition: 'background-color 0.15s',
            }}
          >
            <div className="home-job-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              {/* Left */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="home-tags" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                    <Icon>
                      <path d="M4 20V7a2 2 0 0 1 2-2h7v15" />
                      <path d="M13 20h7V11a2 2 0 0 0-2-2h-5" />
                      <path d="M8 9h1" />
                      <path d="M8 13h1" />
                    </Icon>
                    {job.company}
                  </span>
                  <span style={{ fontSize: 12, color: colors.border }}>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 8px', border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.textSecondary, whiteSpace: 'nowrap' }}>
                    <Icon size={11}>
                      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                      <rect x="4" y="7" width="16" height="11" rx="2" />
                    </Icon>
                    {job.type}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 8px', border: `1px solid ${colors.accent}`, borderRadius: 4, color: colors.accent, backgroundColor: 'rgba(16,185,129,0.08)', whiteSpace: 'nowrap' }}>
                    募集中
                  </span>
                </div>

                <h2 style={{ fontSize: 15, fontWeight: 600, color: colors.textPrimary, marginBottom: 6, lineHeight: 1.4 }}>
                  {job.title}
                </h2>

                <p style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {job.description}
                </p>
              </div>

              {/* Right */}
              <div className="home-job-right" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon size={13} color={colors.textPrimary}>
                      <path d="M7 6h10" />
                      <path d="M7 12h10" />
                      <path d="M9 6v12" />
                    </Icon>
                  ¥{Number(job.budget).toLocaleString()}
                  </span>
                </span>

                {!isAdmin && (
                  <button
                    onClick={() =>
                      navigate(
                        `/apply?jobId=${encodeURIComponent(job.id)}&jobTitle=${encodeURIComponent(job.title ?? '')}`
                      )
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 16px',
                      backgroundColor: colors.accent,
                      color: colors.bg,
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={12} color={colors.bg}>
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </Icon>
                    応募する
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {!loading && jobs.length === 0 && !error && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: colors.textSecondary, fontSize: 13, backgroundColor: colors.surface }}>
            条件に一致する案件はありません
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="home-pagination" style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={handlePrev}
          disabled={loading || currentPage <= 1}
          style={{
            padding: '7px 14px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: loading || currentPage <= 1 ? colors.textSecondary : colors.textPrimary,
            fontSize: 13,
            cursor: loading || currentPage <= 1 ? 'not-allowed' : 'pointer',
            opacity: loading || currentPage <= 1 ? 0.4 : 1,
          }}
        >
          ← 前へ
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            min="1"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            style={{
              width: 56,
              padding: '7px 10px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: colors.textPrimary,
              fontSize: 13,
              textAlign: 'center',
              outline: 'none',
            }}
          />
          <button
            onClick={handleGoToPage}
            disabled={loading}
            style={{
              padding: '7px 12px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              color: colors.textSecondary,
              fontSize: 13,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.4 : 1,
            }}
          >
            移動
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={loading || !nextToken}
          style={{
            padding: '7px 14px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            color: loading || !nextToken ? colors.textSecondary : colors.textPrimary,
            fontSize: 13,
            cursor: loading || !nextToken ? 'not-allowed' : 'pointer',
            opacity: loading || !nextToken ? 0.4 : 1,
          }}
        >
          次へ →
        </button>
      </div>
    </MainLayout>
  )
}
