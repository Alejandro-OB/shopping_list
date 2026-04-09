import { useState, useEffect } from 'react'
import { Mail, Loader2, ArrowRight, LogOut, Send } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function PendingVerification() {
  const { user, logout, fetchMe, loading } = useAuth()
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Polling para detectar cuando se verifique el email automáticamente (cada 5s)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      fetchMe()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchMe, user])

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const handleLogoutAndRedirect = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setSending(true)
    try {
      await api.post('/users/resend-verification')
      toast.success('¡Enlace enviado! Revisa tu bandeja de entrada')
      
      // Iniciar cooldown de 60 segundos
      setCooldown(60)
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al enviar el correo')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

      <div className="max-w-md w-full glass shadow-2xl rounded-3xl p-8 text-center space-y-6 relative z-10 border border-white/5">
        <div className="w-20 h-20 bg-primary-600/20 text-primary-400 rounded-3xl flex items-center justify-center mx-auto rotate-3 hover:rotate-0 transition-transform duration-300">
          <Mail className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Verifica tu cuenta</h1>
          <p className="text-dark-300 leading-relaxed">
            Hola <span className="text-primary-400 font-semibold">{user?.name}</span>, hemos enviado un enlace de activación a:
          </p>
          <div className="bg-dark-900/50 py-2 px-4 rounded-xl border border-dark-800 text-primary-300 font-medium inline-block">
            {user?.email}
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-sm text-dark-400">
            ¿No recibiste el correo? Revisa tu carpeta de <strong className="text-primary-400">Spam</strong> o solicita uno nuevo.
          </p>
          
          <button
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            className={`btn-primary w-full py-4 group ${cooldown > 0 ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : cooldown > 0 ? (
              <span className="flex items-center gap-2">
                Reenviar en {cooldown}s
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Reenviar enlace de activación
              </span>
            )}
          </button>

          <button
            onClick={handleLogoutAndRedirect}
            className="flex items-center justify-center gap-2 text-dark-500 hover:text-white transition-colors w-full text-sm font-medium pt-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión e intentar con otra cuenta
          </button>
        </div>
      </div>

      <div className="mt-8 text-dark-600 text-xs flex items-center gap-4">
        <span>© 2026 ShopList Pro</span>
        <span className="w-1 h-1 bg-dark-800 rounded-full" />
        <a href="#" className="hover:text-dark-400 transition-colors">Soporte</a>
      </div>
    </div>
  )
}
