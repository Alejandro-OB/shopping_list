import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ShoppingCart, Sparkles, Loader2, X, Mail, Send } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Recuperación
  const [showRecover, setShowRecover] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recovering, setRecovering] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Por favor completa todos los campos')
      return
    }
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('¡Bienvenido de vuelta!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Credenciales inválidas'
      if (msg === 'Cuenta no registrada') {
        toast.error('Cuenta no registrada. Regístrate para comenzar.')
        navigate('/register', { state: { email: form.email, password: form.password } })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async (e) => {
    e.preventDefault()
    if (!recoverEmail) return
    setRecovering(true)
    try {
      await api.post('/login/recover-password/', { email: recoverEmail })
      toast.success('Si el correo existe, recibirás un enlace pronto', { duration: 6000 })
      setShowRecover(false)
      setRecoverEmail('')
    } catch (err) {
      toast.error('Error al solicitar recuperación')
    } finally {
      setRecovering(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/50">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">ShopList Pro</h1>
              <p className="text-dark-400 text-sm mt-1">Gestiona tus compras de forma inteligente</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Correo electrónico <span className="text-primary-500">*</span></label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="usuario@ejemplo.com"
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña <span className="text-primary-500">*</span></label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Iniciar sesión
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-dark-400 mt-8">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Regístrate ahora
            </Link>
          </p>

          <p className="text-center text-xs text-dark-500 mt-4">
            ¿Problemas para ingresar?{' '}
            <button 
              onClick={() => setShowRecover(true)}
              className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
            >
              Recuperar contraseña
            </button>
          </p>
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-dark-900 border border-dark-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowRecover(false)}
              className="absolute top-4 right-4 text-dark-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-4 text-center mb-6">
              <div className="w-12 h-12 bg-primary-500/10 text-primary-400 rounded-2xl flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Recuperar cuenta</h2>
                <p className="text-dark-400 text-sm mt-1">Te enviaremos un enlace de seguridad a tu correo.</p>
              </div>
            </div>

            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="label">Tu correo electrónico</label>
                <input
                  type="email"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={recovering || !recoverEmail}
                className="btn-primary w-full"
              >
                {recovering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar enlace
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setShowRecover(false)}
                className="btn-ghost w-full text-xs text-dark-400"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
