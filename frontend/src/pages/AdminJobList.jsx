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

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">発注案件一覧</h1>
          <p className="text-slate-500">自分が発注した案件の一覧を表示します</p>
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
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">案件ID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">案件名</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">企業名</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">勤務地</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">雇用形態</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">予算</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">作成日時</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((item) => (
                <tr
                  key={item.jobId ?? item.id}
                  className="border-b border-slate-100"
                >
                  <td className="px-6 py-4 font-mono text-sm text-slate-500">{item.jobId ?? item.id}</td>
                  <td className="px-6 py-4">{item.jobTitle}</td>
                  <td className="px-6 py-4">{item.company}</td>
                  <td className="px-6 py-4">{item.location}</td>
                  <td className="px-6 py-4">{item.employmentType}</td>
                  <td className="px-6 py-4">¥{Number(item.budget ?? 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && jobs.length === 0 && !error && (
            <div className="p-16 text-center text-slate-400">発注案件データがありません</div>
          )}

          {loading && (
            <div className="p-10 text-center text-slate-500">読み込み中...</div>
          )}

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
        </div>
      </div>
    </MainLayout>
  )
}
