import { fetchJson, postJson } from '../../shared/api/client.js'

const getCurrentUser = async () => {
  const { user } = await fetchJson('/api/auth/me')
  return user
}

const login = async (credentials) => {
  const { user } = await postJson('/api/auth/login', credentials)
  return user
}

const register = async (details) => {
  const { user } = await postJson('/api/auth/register', details)
  return user
}

const logout = () => fetchJson('/api/auth/logout', { method: 'POST' })

export { getCurrentUser, login, logout, register }
