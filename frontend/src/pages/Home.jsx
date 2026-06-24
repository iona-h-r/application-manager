import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import MainLayout from '../layouts/MainLayout'
import { publicApi } from '../lib/api'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)
const PAGE_SIZE = 10

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

  const fetchJobs = async (token = null) => {
    const params = { limit: PAGE_SIZE }
    if (token) {
      params.nextToken = token
    }
    const res = await publicApi.get('/jobs', { params })
    return {
      items: Array.isArray(res.data?.items) ? res.data.items : [],
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
        '案件一覧の取得に失敗しました'
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


            {!isAdmin && (
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
            )}
          </div>
        ))}

        {!loading && jobs.length === 0 && !error && (
          <div className="text-slate-400">募集中の案件はありません</div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
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
    </MainLayout>
  )
}
