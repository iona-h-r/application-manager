import axios from 'axios'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { userPoolConfig } from './cognitoConfig'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
const userPool = new CognitoUserPool(userPoolConfig)

/**
 * 認証トークン付きの axios インスタンスを返す
 * @param {string} idToken - Cognito の ID トークン
 */
export function createApiClient(idToken) {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
  })

  if (!idToken) {
    client.interceptors.request.use(async (config) => {
      const currentUser = userPool.getCurrentUser()

      if (!currentUser) {
        return config
      }

      const token = await new Promise((resolve) => {
        currentUser.getSession((err, session) => {
          if (err || !session?.isValid()) {
            resolve(null)
            return
          }

          resolve(session.getIdToken().getJwtToken())
        })
      })

      if (!token) {
        return config
      }

      return {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
      }
    })
  }

  return client
}

/** 認証なし（サインアップ確認など公開エンドポイント用） */
export const publicApi = axios.create({ baseURL })
