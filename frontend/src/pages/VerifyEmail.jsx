import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import api from '../api/axios'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  // loading, success, error — sin token no hay nada que verificar, así que el
  // estado inicial ya refleja el error en vez de pasar por 'loading'.
  const [status, setStatus] = useState(() => (token ? 'loading' : 'error'))
  const [message, setMessage] = useState(() => (token ? '' : 'Token de verificación no encontrado.'))
  const { fetchMe } = useAuth()

  useEffect(() => {
    if (!token) return

    const verify = async () => {
      try {
        const { data } = await api.get(`/users/verify/?token=${token}`)
        setStatus('success')
        setMessage(data.message || '¡Cuenta verificada con éxito!')

        // Sincronizar el estado global inmediatamente
        await fetchMe()
      } catch (err) {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'El enlace ha expirado o es inválido.')
      }
    }

    verify()
  }, [token, fetchMe])

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass shadow-2xl rounded-3xl p-8 text-center space-y-6">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
            <h1 className="text-2xl font-bold text-dark-200">Verificando tu cuenta</h1>
            <p className="text-dark-400">Por favor espera un momento...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-teal-500/20 text-teal-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-dark-200">¡Bienvenido!</h1>
            <p className="text-dark-300 leading-relaxed">
              {message}
            </p>
            <Link to="/login" className="btn-primary w-full mt-6">
              Ir al inicio de sesión
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-500/20 text-red-600 rounded-full flex items-center justify-center mb-2">
              <XCircle className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold text-dark-200">Error de verificación</h1>
            <p className="text-red-300 leading-relaxed bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
              {message}
            </p>
            <div className="grid grid-cols-1 w-full gap-3 mt-6">
              <Link to="/register" className="btn-secondary w-full">
                Intentar registro de nuevo
              </Link>
              <Link to="/login" className="btn-ghost w-full">
                Volver al inicio
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
