import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'

export default function SessionCheck({
  currentUser,
  requiredRole,
  children,
}) {
  const [authorized, setAuthorized] = useState(null)

  useEffect(() => {
    currentUser.getSession((err, session) => {
      if (err || !session?.isValid()) {
        setAuthorized(false)
        return
      }

      if (requiredRole === 'admin') {
        const payload =
          session.getIdToken().decodePayload()

        const groups =
          payload['cognito:groups'] || []

        setAuthorized(groups.includes('Admin'))
      } else {
        setAuthorized(true)
      }
    })
  }, [])

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        認証確認中...
      </div>
    )
  }

  if (!authorized) {
    return <Navigate to="/" replace />
  }

  return children
}
