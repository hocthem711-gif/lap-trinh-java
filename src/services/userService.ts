
import { apiRequest } from './api'

export interface User {
  id: number
  username: string
  email: string
  fullName: string
  active: boolean
  roles: string[]
  createdAt: string
}

export async function getUsers(): Promise<User[]> {
  const result = await apiRequest<User[]>('/users')
  return result.data
}

export async function deleteUser(id: number): Promise<void> {
  await apiRequest<string>(`/users/${id}`, {
    method: 'DELETE',
  })
}

export async function updateUser(
  id: number,
  data: {
    fullName?: string
    email?: string
    password?: string
    active?: boolean
  },
): Promise<User> {
  const result = await apiRequest<User>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })

  return result.data
}
