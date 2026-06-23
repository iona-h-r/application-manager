import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createApiClient } from '../lib/api'
import MainLayout from '../layouts/MainLayout'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    handleSearch()
  }, [])

  const handleSearch = async () => {
    setLoading(true)
    setError(null)

    try {
      const api = createApiClient()

      const res = await api.get(
        '/admin/applications',
        query
          ? {
              params: {
                id: query,
              },
            }
          : undefined
      )

      setResults(normalizeAdminResults(res.data))
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
                  評価
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">
                  実績件数
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

                  <td className="px-6 py-4">
                    {item.rating}
                  </td>

                  <td className="px-6 py-4">
                    {item.achievementCount}
                  </td>

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

        </div>

      </div>
    </MainLayout>
  )
}
