import React from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://b3jlc30z-4000.euw.devtunnels.ms/'
const TOKEN_KEY = 'lloka:auth_token'

export interface User {
  id: string
  username: string
  avatar?: string | null
  token: string
  email?: string | null
}

interface LoginPayload {
  username: string
  password: string
}

interface RegisterPayload {
  username: string
  password: string
}

interface UpdateProfilePayload {
  username?: string
  email?: string | null
  password?: string
  currentPassword?: string
  avatar?: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  authenticated: boolean
  login: (payload: LoginPayload) => Promise<User>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => Promise<void>
  refreshProfile: () => Promise<User | null>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}
const AuthContext = React.createContext<AuthContextType | null>(null)

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function api<T>(endpoint: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers, credentials: 'include' })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.message || data?.error || `Request failed with status ${response.status}`)
  return data as T
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement | null {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  const token = user?.token || getStoredToken() || null

  const refreshProfile = React.useCallback(async (): Promise<User | null> => {
    const storedToken = getStoredToken()
    if (!storedToken) {
      setUser(null)
      return null
    }
    try {
      const profile = await api<User>('/auth/profile', { method: 'GET', }, storedToken)
      setUser(profile)
      if (profile.token) saveToken(profile.token)
      return profile
    } catch (error) {
      console.error('Failed to refresh profile:', error)
      removeStoredToken()
      setUser(null)
      return null
    }
  }, [])

  const login = React.useCallback(async ({ username, password }: LoginPayload): Promise<User> => {
    const response = await api<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
    saveToken(response.token)
    const profile = await api<User>('/auth/profile', { method: 'GET', }, response.token)
    setUser(profile)
    return profile
  }, [])

  const register = React.useCallback(async ({ username, password }: RegisterPayload): Promise<User> => {
    const response = await api<{ token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) })
    saveToken(response.token)
    const profile = await api<User>('/auth/profile', { method: 'GET' }, response.token)
    setUser(profile)
    return profile
  }, [])

  const logout = React.useCallback(async () => {
    try {
      const storedToken = getStoredToken()
      if (storedToken) await api('/auth/logout', { method: 'PUT' }, storedToken)
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      removeStoredToken()
      setUser(null)
    }
  }, [])

  const updateProfile = React.useCallback(async (payload: UpdateProfilePayload) => {
    const storedToken = getStoredToken()
    if (!storedToken) throw new Error('Not authenticated')
    const response = await api<{ message: string, token?: string }>('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }, storedToken)
    if (response.token) saveToken(response.token)
    await refreshProfile()
  }, [refreshProfile])

  React.useEffect(() => {
    const initialize = async () => { try { await refreshProfile() } finally { setLoading(false) } }
    initialize()
  }, [refreshProfile])

  const value = React.useMemo<AuthContextType>(() => ({ user, token, loading, authenticated: !!user, login, register, logout, refreshProfile, updateProfile, setUser }), [user, token, loading, login, register, logout, refreshProfile, updateProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}