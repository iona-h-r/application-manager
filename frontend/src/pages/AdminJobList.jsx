import { useEffect, useState } from 'react'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      const api = createApiClient()

      // AI実装指示:
      // 1) backend 側で「ログイン管理者本人が発注した案件のみ」を返せるようにする。
      // 2) 必要に応じて status, limit, nextToken などの検索条件をクエリで渡す。
      // 3) ページングを導入する場合は nextToken を state で保持し、追加入力で再取得する。
      const res = await api.get('/admin/jobs')
      setJobs(normalizeJobResults(res.data))
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
    loadJobs()
  }, [])

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
        </div>
      </div>
    </MainLayout>
  )
}
