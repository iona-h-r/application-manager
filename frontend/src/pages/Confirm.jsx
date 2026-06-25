import { useState, useEffect } from 'react'
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Confirm() {
  // URLパラメータからメールアドレスと再送フラグを取得
  const params = new URLSearchParams(window.location.search)
  const email = params.get('email') ?? ''
  const shouldResend = params.get('resend') === 'true'

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })

  // サインアップ離脱ユーザーの再訪問時: マウント時に自動でコードを再送
  useEffect(() => {
    if (!shouldResend) return
    cognitoUser.resendConfirmationCode((err) => {
      if (err) { setError(err.message); return }
      setResent(true)
    })
  }, [])

  // 認証コードを確認
  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    cognitoUser.confirmRegistration(code, true, (err) => {
      setLoading(false)
      if (err) { setError(err.message); return }
      window.location.href = '/login'
    })
  }

  // 認証コードを再送
  const handleResend = () => {
    setError(null)
    setResent(false)

    cognitoUser.resendConfirmationCode((err) => {
      if (err) { setError(err.message); return }
      setResent(true)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">メール認証</h2>
        <p className="text-sm text-gray-500 mb-6">
          <span className="font-medium text-gray-700">{email}</span> に送信した
          認証コードを入力してください。
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {resent && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
            認証コードを再送しました。
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">認証コード</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center text-2xl tracking-widest font-mono"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md"
          >
            {loading ? '確認中...' : '認証する'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          コードが届かない場合は{' '}
          <button
            onClick={handleResend}
            className="text-blue-600 font-semibold hover:underline"
          >
            再送する
          </button>
        </p>
      </div>
    </div>
  )
}
