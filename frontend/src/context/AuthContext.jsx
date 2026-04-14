import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar usuario al iniciar
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/')
      setUser(data)
    } catch {
      localStorage.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/login/', { email, password })

    localStorage.setItem('access_token', data.access_token)
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }
    await fetchMe()
    return data
  }, [fetchMe])

  const logout = useCallback(() => {
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
