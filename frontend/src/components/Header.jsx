import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'
import LogoutButton from './LogoutButton'

const userPool = new CognitoUserPool(userPoolConfig)

const C = {
  bg: '#09090B',
  border: '#27272A',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  accent: '#10B981',
}

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
    <header style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg, position: 'sticky', top: 0, zIndex: 50 }}>
      <style>{`
        @media (max-width: 400px) {
          .header-logo { font-size: 13px !important; }
          .header-nav { gap: 12px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" className="header-logo" style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, textDecoration: 'none', letterSpacing: '-0.02em' }}>
          Application Manager
        </Link>

        <nav className="header-nav" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {!isLoggedIn && (
            <>
              <Link to="/login" style={{ fontSize: 13, color: C.textSecondary, textDecoration: 'none' }}>
                ログイン
              </Link>
              <Link to="/signup" style={{ fontSize: 13, padding: '6px 14px', backgroundColor: C.accent, color: C.bg, borderRadius: 6, textDecoration: 'none', fontWeight: 600 }}>
                新規登録
              </Link>
            </>
          )}

          {isLoggedIn && (
            <>
              {isAdmin && (
                <Link to="/admin" style={{ fontSize: 13, color: C.textSecondary, textDecoration: 'none' }}>
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
