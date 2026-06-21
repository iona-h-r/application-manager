import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { publicApi } from '../lib/api'

export default function Home() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await publicApi.get('/jobs')
        setJobs(Array.isArray(res.data?.items) ? res.data.items : [])
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

    loadJobs()
  }, [])

  console.log(jobs)

  return (
    <MainLayout>
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          募集中の案件
        </h1>

        <p className="text-slate-500">
          現在応募可能な案件一覧です
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-slate-500">読み込み中...</div>
      )}

      <div className="grid gap-6">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="
              bg-white
              rounded-3xl
              border
              border-slate-200
              p-6
              shadow-sm
              hover:shadow-xl
              hover:-translate-y-1
              transition-all
            "
          >
            <div className="flex justify-between items-start">

              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  {job.title}
                </h2>

                <p className="text-slate-600 mb-2">
                  企業名：{job.company}
                </p>

                <p className="text-slate-600">
                  予算：{Number(job.budget).toLocaleString()}円
                </p>
              </div>


              <span className="
                px-3
                py-1
                rounded-full
                bg-indigo-100
                text-indigo-700
                text-sm
                font-medium
              ">
                {job.type}
              </span>

            </div>
            <div>
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="font-semibold text-slate-600 mb-2">業務内容：</p>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
            </div>


            <div className="mt-5 flex justify-end">
              <button
                onClick={() =>
                  navigate(
                    `/apply?jobId=${encodeURIComponent(job.id)}&jobTitle=${encodeURIComponent(job.title ?? '')}`
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
              >
                応募する
              </button>
            </div>
          </div>
        ))}

        {!loading && jobs.length === 0 && !error && (
          <div className="text-slate-400">募集中の案件はありません</div>
        )}
      </div>
    </MainLayout>
  )
}
