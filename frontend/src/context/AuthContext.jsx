import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

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

  // Cargar usuario al iniciar
  useEffect(() => {
    // Timeout de seguridad: no dejar al usuario en la pantalla de carga más de 3s
    const timer = setTimeout(() => {
      if (loading) setLoading(false)
    }, 3000)

    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe().finally(() => clearTimeout(timer))
    } else {
      setLoading(false)
      clearTimeout(timer)
    }
    return () => clearTimeout(timer)
  }, [fetchMe])

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
