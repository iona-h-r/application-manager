import { Navigate } from 'react-router-dom'
import {
  CognitoUserPool,
} from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'
import SessionCheck from './SessionCheck'

const userPool = new CognitoUserPool(userPoolConfig)

export default function ProtectedRoute({
  children,
  requiredRole,
}) {
  const currentUser = userPool.getCurrentUser()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return (
    <SessionCheck
      currentUser={currentUser}
      requiredRole={requiredRole}
    >
      {children}
    </SessionCheck>
  )
}
