import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ClipboardCheck, ShoppingCart } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const passwordRules = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Una letra mayúscula',  test: (p) => /[A-Z]/.test(p) },
  { label: 'Al menos un número',  test: (p) => /[0-9]/.test(p) },
  { label: 'Un símbolo (#$%&@!)', test: (p) => /[#$%&@!]/.test(p) },
]

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: location.state?.email || '',
    password: location.state?.password || '',
    confirmPassword: '',
  })

  const passMatches = formData.password && formData.password === formData.confirmPassword
  const allRulesMet = passwordRules.every((r) => r.test(formData.password))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allRulesMet) { toast.error('La contraseña no cumple con los requisitos de seguridad'); return }
    if (!passMatches) { toast.error('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const { name, email, password } = formData
      await api.post('/users/', { name, email, password })
      toast.success('¡Registro exitoso! Verifica tu correo para activar tu cuenta.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrarse')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #f0f4ff 100%)' }}>

      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-60" style={{ background: 'radial-gradient(circle, #ddd6fe 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, #e0e7ff 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Card — todo dentro como en Login */}
        <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.9)', borderRadius: 24, padding: '36px 36px', boxShadow: '0 8px 40px rgba(109,40,217,0.08), 0 1px 3px rgba(0,0,0,0.04)' }}>

          {/* Logo + título */}
          <div className="flex flex-col items-center gap-3 mb-7">
            <div style={{ width: 52, height: 52, borderRadius: 15, background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(109,40,217,0.28)' }}>
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="text-center">
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e1033', letterSpacing: '-0.02em', fontFamily: "'Syne', sans-serif" }}>Crea tu cuenta</h1>
              <p style={{ fontSize: 13, color: '#7c6fa0', marginTop: 3 }}>Organiza tus compras de forma inteligente</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="label">Nombre completo <span className="text-primary-500">*</span></label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                <input required type="text" placeholder="Tu nombre" className="input pl-10" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Correo electrónico <span className="text-primary-500">*</span></label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                <input required type="email" placeholder="nombre@ejemplo.com" className="input pl-10" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="label">Contraseña <span className="text-primary-500">*</span></label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                <input
                  required type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  className={`input pl-10 pr-10 ${formData.password && (allRulesMet ? 'border-emerald-500/50' : 'border-amber-500/50')}`}
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {formData.password && (
                <div className="grid grid-cols-2 gap-1.5 p-3 rounded-xl" style={{ background: '#faf9ff', border: '1px solid #ede9fe' }}>
                  {passwordRules.map((rule, idx) => {
                    const met = rule.test(formData.password)
                    return (
                      <div key={idx} className="flex items-center gap-1.5">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${met ? 'bg-primary-500' : 'bg-dark-800'}`}>
                          <ClipboardCheck className="w-2 h-2 text-white" />
                        </div>
                        <span className={`text-[10px] font-medium leading-tight transition-colors ${met ? 'text-primary-600' : 'text-dark-500'}`}>{rule.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="label">Confirmar contraseña <span className="text-primary-500">*</span></label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
                <input
                  required type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  className={`input pl-10 ${formData.confirmPassword && (passMatches ? 'border-emerald-500/50' : 'border-red-400/50')}`}
                  value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
              {formData.confirmPassword && (
                <p className={`text-[10px] font-semibold px-1 ${passMatches ? 'text-emerald-600' : 'text-red-500'}`}>
                  {passMatches ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden'}
                </p>
              )}
            </div>

            <button
              disabled={loading || !allRulesMet || !passMatches} type="submit"
              className={`btn-primary w-full mt-2 ${(!allRulesMet || !passMatches) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear cuenta'}
            </button>

            <p className="text-center text-sm text-dark-400 pt-1">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">Inicia sesión</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
