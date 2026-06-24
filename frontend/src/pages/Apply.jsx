import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Apply() {
  const [searchParams] = useSearchParams()

  const selectedJobId = searchParams.get('jobId') ?? ''
  const selectedJobTitle = searchParams.get('jobTitle') ?? ''

  const [formData, setFormData] = useState({
    jobId: '',
    jobTitle: '',
    applicantUserId: '',
    applicantName: '',
    proposalAmount: '',
    proposalContent: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [authorized, setAuthorized] = useState(null)

  useEffect(() => {
    if (!selectedJobId && !selectedJobTitle) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      jobId: selectedJobId || prev.jobId,
      jobTitle: selectedJobTitle || prev.jobTitle,
    }))
  }, [selectedJobId, selectedJobTitle])

  useEffect(() => {
    const currentUser = userPool.getCurrentUser()

    if (!currentUser) {
      setError('Cognito のログイン情報が取得できませんでした。')
      setAuthorized(false)
      return
    }

    currentUser.getSession((err, session) => {
      if (err || !session?.isValid()) {
        setError('Cognito のセッションが無効です。再ログインしてください。')
        setAuthorized(false)
        return
      }

      const payload = session.getIdToken().decodePayload()
      const groups = payload['cognito:groups'] || []
      const isAdmin = Array.isArray(groups) && groups.includes('Admin')
      if (isAdmin) {
        setAuthorized(false)
        setError('管理者ユーザーは応募フォームを利用できません。')
        return
      }

      const applicantUserId = payload.sub || currentUser.getUsername() || ''
      const applicantName =
        payload.name ||
        [payload.family_name, payload.given_name].filter(Boolean).join(' ') ||
        payload.email ||
        currentUser.getUsername() ||
        ''

      setFormData((prev) => ({
        ...prev,
        applicantUserId,
        applicantName,
      }))
      setAuthorized(true)
    })
  }, [])

  if (authorized === false) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const api = createApiClient()

      await api.post('/applications', {
        jobId: formData.jobId,
        jobTitle: formData.jobTitle,
        applicantUserId: formData.applicantUserId,
        applicantName: formData.applicantName,
        proposalAmount: Number(formData.proposalAmount),
        proposalContent: formData.proposalContent,
      })

      setDone(true)
    } catch (err) {
      setError(err.response?.data?.message ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 text-center w-full max-w-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              応募が完了しました
            </h2>

            <p className="text-slate-500">
              担当者よりご連絡いたします。
            </p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            案件応募
          </h1>

          <p className="text-slate-500">
            応募内容を入力してください
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                案件ID
              </label>

              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                value={formData.jobId}
                readOnly
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                案件名
              </label>

              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                value={formData.jobTitle}
                readOnly
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    jobTitle: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                応募者ID
              </label>

              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                value={formData.applicantUserId}
                readOnly
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                応募者名
              </label>

              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 outline-none"
                value={formData.applicantName}
                readOnly
                required
              />
            </div>

            <div className="grid md:grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  提案金額
                </label>

                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="50000"
                  value={formData.proposalAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      proposalAmount: e.target.value,
                    })
                  }
                  required
                />
              </div>

            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                提案内容
              </label>

              <textarea
                className="w-full h-40 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="自己PRや提案内容を入力してください"
                value={formData.proposalContent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    proposalContent: e.target.value,
                  })
                }
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-4 rounded-xl transition-all"
            >
              {loading ? '送信中...' : '応募する'}
            </button>

          </form>
        </div>
      </div>
    </MainLayout>
  )
}
