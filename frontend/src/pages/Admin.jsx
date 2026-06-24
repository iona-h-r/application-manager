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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            管理者ダッシュボード
          </h1>

          <p className="text-slate-500">
            応募情報の検索・閲覧
          </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/jobs')}
              className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold transition"
            >
              発注案件一覧
            </button>

            <button
              onClick={() => navigate('/admin/jobs/new')}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
            >
              案件を作成
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-6">

          <div className="flex gap-3">

            <input
              className="
                flex-1
                px-4
                py-3
                rounded-xl
                border
                border-slate-200
                focus:ring-2
                focus:ring-indigo-500
                outline-none
              "
              placeholder="応募IDを入力（空欄で全件表示）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              onClick={handleSearch}
              disabled={loading}
              className="
                px-6
                py-3
                rounded-xl
                bg-indigo-600
                hover:bg-indigo-700
                disabled:bg-slate-400
                text-white
                font-semibold
                transition
              "
            >
              {loading ? '検索中...' : '検索'}
            </button>

          </div>

        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

          {error && (
            <div className="p-4 bg-red-50 text-red-600 border-b border-red-100">
              {error}
            </div>
          )}

          <table className="w-full">

            <thead className="bg-slate-50 border-b border-slate-200">

              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  応募ID
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  案件名
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  応募者名
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  ステータス
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  提案金額
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  登録日時
                </th>
              </tr>

            </thead>

            <tbody>

              {results.map((item) => (
                <tr
                  key={item.id ?? item.applicationId}
                  onClick={() =>
                    navigate(
                      `/admin/applications/${item.id ?? item.applicationId}`
                    )
                  }
                  className="
                    border-b
                    border-slate-100
                    hover:bg-slate-50
                    cursor-pointer
                    transition
                  "
                >
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">
                    {item.id ?? item.applicationId}
                  </td>

                  <td className="px-6 py-4">
                    {item.jobTitle}
                  </td>

                  <td className="px-6 py-4 font-medium">
                    {item.applicantName}
                  </td>

                  <td className="px-6 py-4">{item.status}</td>

                  <td className="px-6 py-4">
                    ¥{Number(item.proposalAmount).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-500">
                    {item.createdAt}
                  </td>
                </tr>
              ))}

            </tbody>

          </table>

          {!loading && results.length === 0 && !error && (
            <div className="p-16 text-center text-slate-400">
              応募データがありません
            </div>
          )}

          {!query && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handlePrev}
                  disabled={loading || currentPage <= 1}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  前へ
                </button>

                <span className="text-sm text-slate-600 font-semibold">{currentPage}ページ目</span>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="w-20 px-2 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <button
                    onClick={handleGoToPage}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    移動
                  </button>
                </div>

                <button
                  onClick={handleNext}
                  disabled={loading || !nextToken}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </MainLayout>
  )
}
