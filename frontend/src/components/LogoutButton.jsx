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
      className="
        px-4
        py-2
        rounded-lg
        border
        border-slate-300
        bg-white
        text-slate-700
        text-sm
        font-medium
        hover:bg-slate-100
        transition
      "
    >
      ログアウト
    </button>
  )
}
