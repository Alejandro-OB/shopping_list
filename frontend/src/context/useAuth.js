import { createContext, useContext } from 'react'

// Contexto compartido — definido en archivo .js (no .jsx) para que
// Vite Fast Refresh NO recree el contexto al editar el provider.
export const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
