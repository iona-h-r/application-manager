import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import { createApiClient } from '../lib/api'

export default function AdminJobCreate() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    employmentType: '正社員',
    budget: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const api = createApiClient()
      const res = await api.post('/admin/jobs', {
        jobTitle: formData.jobTitle,
        company: formData.company,
        location: formData.location,
        employmentType: formData.employmentType,
        budget: Number(formData.budget),
        description: formData.description,
      })
      setResult(res.data)
      navigate('/admin/jobs')
    } catch (err) {
      setError(
        err.response?.data?.message ??
          err.response?.data?.error ??
          err.message ??
          '案件作成に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">案件作成</h1>
          <p className="text-slate-500">管理者向けの案件登録フォームです</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
              案件を作成しました。ID: {result.jobId ?? result.id ?? '(未返却)'}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">案件名</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="React開発案件"
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">企業名</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="株式会社サンプル"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                required
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">勤務地</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="東京都"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">雇用形態</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  required
                >
                  <option value="正社員">正社員</option>
                  <option value="業務委託">業務委託</option>
                  <option value="契約社員">契約社員</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">予算</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="800000"
                  value={formData.budget}
                  onChange={(e) => handleChange('budget', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">業務内容</label>
              <textarea
                className="w-full h-40 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                placeholder="必要スキル、担当範囲、稼働条件など"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold py-4 rounded-xl transition-all"
            >
              {loading ? '作成中...' : '案件を作成する'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}
