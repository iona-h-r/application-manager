import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'
import LogoutButton from './LogoutButton'

const userPool = new CognitoUserPool(userPoolConfig)

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const currentUser = userPool.getCurrentUser()

    if (!currentUser) {
      return
    }

    currentUser.getSession((err, session) => {
      if (err || !session?.isValid()) {
        return
      }

      setIsLoggedIn(true)

      const payload = session.getIdToken().decodePayload()
      const groups = payload['cognito:groups'] || []

      setIsAdmin(groups.includes('Admin'))
    })
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">

        <Link
          to="/"
          className="text-xl font-bold text-slate-900"
        >
          Application Manager
        </Link>

        <nav className="flex items-center gap-6">

          {!isLoggedIn && (
            <>
              <Link
                to="/login"
                className="text-slate-600 hover:text-slate-900"
              >
                ログイン
              </Link>

              <Link
                to="/signup"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                新規登録
              </Link>
            </>
          )}

          {isLoggedIn && (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-slate-600 hover:text-slate-900"
                >
                  管理者画面
                </Link>
              )}

              <LogoutButton />
            </>
          )}

        </nav>
      </div>
    </header>
  )
}
