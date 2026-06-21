import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const authDetails = new AuthenticationDetails({ Username: email, Password: password })
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => {
        setLoading(false)
        navigate('/')
      },
      onFailure: (err) => {
        setLoading(false)
        setError(err.message)
      },
      newPasswordRequired: () => {
        setLoading(false)
        setError('初回ログインです。パスワードの変更が必要です。管理者にお問い合わせください。')
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 w-full max-w-md">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">ログイン</h2>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              メールアドレス
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              パスワード
            </label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
