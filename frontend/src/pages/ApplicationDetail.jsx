import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'

export default function ApplicationDetail() {
  const { applicationId } = useParams()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      const api = createApiClient()

      const res = await api.get(
        `/admin/applications/${applicationId}`
      )

      setApplication(res.data)
    } catch (err) {
      console.error('API取得失敗:', err)
      setApplication(null)
      setError(
        err.response?.data?.message ??
        err.message ??
        '詳細の取得に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          読み込み中...
        </div>
      </MainLayout>
    )
  }

  if (!application) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          {error ?? 'データが見つかりません'}
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            応募詳細
          </h1>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">

          <div className="grid md:grid-cols-2 gap-6">

            <Item
              label="応募ID"
              value={application.id ?? application.applicationId}
            />

            <Item
              label="応募者ID"
              value={application.applicantUserId}
            />

            <Item
              label="案件名"
              value={application.jobTitle}
            />

            <Item
              label="案件ID"
              value={application.jobId}
            />

            <Item
              label="応募者名"
              value={application.applicantName}
            />

            <Item
              label="ステータス"
              value={application.status}
            />

            <Item
              label="提案金額"
              value={`¥${Number(
                application.proposalAmount
              ).toLocaleString()}`}
            />

            <Item
              label="登録日時"
              value={application.createdAt}
            />

          </div>

          <div className="mt-8">

            <div className="text-sm text-slate-500 mb-2">
              提案内容
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 whitespace-pre-wrap">
              {application.proposalContent}
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  )
}

function Item({ label, value }) {
  return (
    <div>
      <div className="text-sm text-slate-500 mb-1">
        {label}
      </div>

      <div className="font-medium text-slate-900">
        {value}
      </div>
    </div>
  )
}
