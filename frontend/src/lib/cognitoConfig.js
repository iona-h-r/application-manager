const userPoolId = import.meta.env.VITE_USER_POOL_ID || ''
const clientId = import.meta.env.VITE_USER_POOL_CLIENT_ID || ''

/** amazon-cognito-identity-js 用の設定（Signup / Login で直接使用） */
export const userPoolConfig = {
  UserPoolId: userPoolId,
  ClientId: clientId,
}
