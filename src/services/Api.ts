
export interface ApiResponse<T> {
  status: number
  message: string
  data: T
  timestamp: string
}

const API_BASE_URL = 'http://localhost:8080/api/v1'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(result?.message || `Lỗi HTTP ${response.status}`)
  }

  return result as ApiResponse<T>
}
