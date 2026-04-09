import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ClipboardCheck, ShoppingCart } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

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

  // Validation state
  const passwordRules = [
    { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
    { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
    { label: 'Al menos un número', test: (p) => /[0-9]/.test(p) },
    { label: 'Un símbolo (#$%&@!)', test: (p) => /[#$%&@!]/.test(p) },
  ]

  const passMatches = formData.password && formData.password === formData.confirmPassword
  const allRulesMet = passwordRules.every(rule => rule.test(formData.password))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allRulesMet) {
      toast.error('La contraseña no cumple con los requisitos de seguridad')
      return
    }
    if (!passMatches) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      const { name, email, password } = formData
      await api.post('/users/', { name, email, password })
      toast.success('¡Registro exitoso! Verifica tu correo para activar tu cuenta.')
      navigate('/login')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al registrarse'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary-600/20 flex items-center justify-center mb-4 text-primary-400">
             <ShoppingCart className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold text-white">Crea tu cuenta</h2>
          <p className="mt-2 text-sm text-dark-400">Organiza tus compras de forma inteligente</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 bg-dark-900 border border-dark-800 p-8 rounded-2xl shadow-2xl">
          <div>
            <label className="label">Nombre completo <span className="text-primary-500">*</span></label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
              <input
                required
                type="text"
                placeholder="Juan Pérez"
                className="input pl-10"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Correo electrónico <span className="text-primary-500">*</span></label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
              <input
                required
                type="email"
                placeholder="nombre@ejemplo.com"
                className="input pl-10"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">Contraseña <span className="text-primary-500">*</span></label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`input pl-10 pr-10 ${formData.password && (allRulesMet ? 'border-emerald-500/50' : 'border-amber-500/50')}`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Rules Indicators */}
            {formData.password && (
              <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-dark-950/50 rounded-xl border border-dark-800">
                {passwordRules.map((rule, idx) => {
                  const met = rule.test(formData.password)
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${met ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-500'}`}>
                        <ClipboardCheck className="w-2.5 h-2.5" />
                      </div>
                      <span className={`text-[10px] font-medium transition-colors ${met ? 'text-primary-300' : 'text-dark-600'}`}>
                        {rule.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="label">Confirmar Contraseña <span className="text-primary-500">*</span></label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 group-focus-within:text-primary-500 transition-colors" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={`input pl-10 ${formData.confirmPassword && (passMatches ? 'border-emerald-500/50' : 'border-red-500/50')}`}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
            
            {/* Match Indicator */}
            {formData.confirmPassword && (
              <p className={`text-[10px] font-bold px-1 transition-all ${passMatches ? 'text-emerald-400' : 'text-red-400'}`}>
                {passMatches ? '✓ Las contraseñas coinciden' : '✕ Las contraseñas no coinciden'}
              </p>
            )}
          </div>

          <button
            disabled={loading || !allRulesMet || !passMatches}
            type="submit"
            className={`btn-primary w-full py-3 mt-4 ${(!allRulesMet || !passMatches) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrarse'}
          </button>

          <p className="text-center text-sm text-dark-400 pt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
