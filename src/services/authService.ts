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

const OFFLINE_DEMO_ACCOUNTS: Record<string, { password: string; data: AuthData }> = {
  admin: {
    password: 'admin',
    data: {
      accessToken: 'offline-demo-jwt-token-admin',
      tokenType: 'Bearer',
      id: 1,
      username: 'admin',
      email: 'admin@smartfarm.vn',
      fullName: 'Administrator',
      roles: ['ROLE_ADMIN'],
    },
  },
  farmer: {
    password: 'farmer',
    data: {
      accessToken: 'offline-demo-jwt-token-farmer',
      tokenType: 'Bearer',
      id: 2,
      username: 'farmer',
      email: 'farmer@smartfarm.vn',
      fullName: 'Nguyễn Trường An',
      roles: ['ROLE_FARMER'],
    },
  },
}

export async function login(
  usernameOrEmail: string,
  password: string,
): Promise<AuthData> {
  try {
    const result = await apiRequest<AuthData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    })

    localStorage.setItem('accessToken', result.data.accessToken)
    localStorage.setItem('savedUsername', result.data.fullName || result.data.username)

    return result.data
  } catch (err) {
    // Nếu lỗi kết nối mạng (Backend chưa bật), cho phép fallback đăng nhập chế độ Demo Offline
    if (err instanceof TypeError) {
      const key = usernameOrEmail.trim().toLowerCase()
      const demo = OFFLINE_DEMO_ACCOUNTS[key]?.data ?? {
        accessToken: `offline-demo-jwt-${Date.now()}`,
        tokenType: 'Bearer',
        id: 99,
        username: usernameOrEmail.trim(),
        email: `${key}@smartfarm.vn`,
        fullName: usernameOrEmail.trim(),
        roles: ['ROLE_ADMIN'],
      }
      localStorage.setItem('accessToken', demo.accessToken)
      localStorage.setItem('savedUsername', demo.fullName || demo.username)
      return demo
    }
    throw err
  }
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
  localStorage.removeItem('savedUsername')
}
