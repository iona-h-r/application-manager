import { useNavigate } from 'react-router-dom'
import {
  CognitoUserPool,
} from 'amazon-cognito-identity-js'
import { userPoolConfig } from '../lib/cognitoConfig'

const userPool = new CognitoUserPool(userPoolConfig)

export default function LogoutButton() {
  const navigate = useNavigate()

  const handleLogout = () => {
    const currentUser = userPool.getCurrentUser()

    currentUser?.signOut()

    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '6px 14px',
        backgroundColor: 'transparent',
        border: '1px solid #3F3F46',
        borderRadius: 6,
        color: '#FAFAFA',
        fontSize: 13,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#71717A'; e.currentTarget.style.color = '#FAFAFA' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3F3F46'; e.currentTarget.style.color = '#FAFAFA' }}
    >
      ログアウト
    </button>
  )
}
