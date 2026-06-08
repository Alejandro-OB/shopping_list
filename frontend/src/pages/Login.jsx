import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, ShoppingCart, Loader2, X, Mail, Send } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showRecover, setShowRecover] = useState(false)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recovering, setRecovering] = useState(false)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) { toast.error('Por favor completa todos los campos'); return }
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success('¡Bienvenido de vuelta!')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Credenciales inválidas'
      if (msg === 'Cuenta no registrada') {
        toast.error('Cuenta no registrada. Regístrate para comenzar.')
        navigate('/register', { state: { email: form.email, password: form.password } })
      } else { toast.error(msg) }
    } finally { setLoading(false) }
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
    } catch { toast.error('Error al solicitar recuperación') }
    finally { setRecovering(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #f0f4ff 100%)' }}>

      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, #ddd6fe 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, #e0e7ff 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: 24, padding: '40px 36px', boxShadow: '0 8px 40px rgba(109,40,217,0.08), 0 1px 3px rgba(0,0,0,0.04)' }}>

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(109,40,217,0.3)' }}>
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e1033', letterSpacing: '-0.02em', fontFamily: "'Syne', sans-serif" }}>CompraYa</h1>
              <p style={{ fontSize: 13.5, color: '#7c6fa0', marginTop: 3 }}>Gestiona tus compras de forma inteligente</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico <span className="text-primary-500">*</span></label>
              <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} placeholder="usuario@ejemplo.com" className="input" required />
            </div>

            <div>
              <label className="label">Contraseña <span className="text-primary-500">*</span></label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={handleChange} placeholder="••••••••" className="input pr-11" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors" aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando sesión...</> : <><ShoppingCart className="w-4 h-4" /> Iniciar sesión</>}
            </button>
          </form>

          <p className="text-center text-sm text-dark-400 mt-7">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">Regístrate ahora</Link>
          </p>

          <p className="text-center text-xs text-dark-500 mt-3">
            ¿Problemas para ingresar?{' '}
            <button onClick={() => setShowRecover(true)} className="text-primary-500 hover:text-primary-400 transition-colors font-medium">Recuperar contraseña</button>
          </p>
        </div>
      </div>

      {/* Modal recuperación */}
      {showRecover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,16,51,0.45)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: 'white', borderRadius: 22, padding: '36px 32px', maxWidth: 360, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.15)', position: 'relative' }}>
            <button onClick={() => setShowRecover(false)} className="absolute top-4 right-4 text-dark-400 hover:text-dark-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center gap-4 text-center mb-6">
              <div style={{ width: 50, height: 50, background: '#f3e8ff', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail className="w-6 h-6" style={{ color: '#7c3aed' }} />
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e1033', fontFamily: "'Syne', sans-serif" }}>Recuperar cuenta</h2>
                <p className="text-dark-400 text-sm mt-1">Te enviaremos un enlace de seguridad a tu correo.</p>
              </div>
            </div>
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <label className="label">Tu correo electrónico</label>
                <input type="email" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} placeholder="ejemplo@correo.com" className="input" required autoFocus />
              </div>
              <button type="submit" disabled={recovering || !recoverEmail} className="btn-primary w-full">
                {recovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Enviar enlace</>}
              </button>
              <button type="button" onClick={() => setShowRecover(false)} className="btn-ghost w-full text-xs">Cancelar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
