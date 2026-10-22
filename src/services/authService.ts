
import { apiRequest } from './api'

export interface AuthData {
  accessToken: string
  tokenType: string
  id: number
  username: string
  email: string
  fullName: string
  roles: string[]
}

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<AuthData> {
  const result = await apiRequest<AuthData>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail, password }),
  })

  localStorage.setItem('accessToken', result.data.accessToken)

  return result.data
}

export async function registerUser(user: {
  username: string
  email: string
  password: string
  fullName: string
  role: string
}) {
  const result = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(user),
  })

  return result.data
}

export function logout() {
  localStorage.removeItem('accessToken')
}
