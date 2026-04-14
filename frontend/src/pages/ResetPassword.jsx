import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { 
  KeyRound, Loader2, CheckCircle2, XCircle, 
  Eye, EyeOff, ShieldCheck, ArrowRight
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const navigate = useNavigate()
  const token = searchParams.get('token')

  // Validaciones de seguridad (Mismas que en Registro/Settings)
  const validations = {
    length: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[#$%&@!]/.test(newPassword)
  }
  const isStrong = Object.values(validations).every(Boolean)
  const matches = newPassword && newPassword === confirmPassword

  const handleReset = async (e) => {
    e.preventDefault()
    if (!isStrong || !matches || !token) return

    setLoading(true)
    try {
      await api.post('/login/reset-password/', { 
        token, 
        new_password: newPassword 
      })
      setSuccess(true)
      toast.success('Contraseña actualizada correctamente')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass rounded-3xl p-8 text-center space-y-4">
          <XCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Enlace inválido</h1>
          <p className="text-dark-400">El token de recuperación no fue encontrado o ha expirado.</p>
          <Link to="/login" className="btn-secondary w-full">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass rounded-3xl p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold text-white">¡Listo!</h1>
          <p className="text-dark-300">Tu contraseña ha sido actualizada. Ya puedes entrar a tu cuenta.</p>
          <Link to="/login" className="btn-primary w-full">
            Iniciar sesión ahora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary-500/10 text-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Nueva contraseña</h1>
          <p className="text-dark-400">Elige una clave segura para proteger tu cuenta.</p>
        </div>

        <form onSubmit={handleReset} className="glass rounded-3xl p-8 space-y-6">
          <div className="space-y-4">
            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-200 ml-1">Contraseña Nueva</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-12 w-full"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-200 ml-1">Confirmar Contraseña</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input w-full ${confirmPassword && !matches ? 'border-red-500/50 bg-red-500/5' : ''}`}
                placeholder="********"
                required
              />
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="bg-dark-900/50 rounded-2xl p-4 space-y-3 border border-dark-800">
            <h3 className="text-xs font-bold text-dark-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Requisitos de Seguridad
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <ValidationItem fulfilled={validations.length} text="Mínimo 8 caracteres" />
              <ValidationItem fulfilled={validations.hasUpper} text="Al menos una mayúscula" />
              <ValidationItem fulfilled={validations.hasNumber} text="Al menos un número" />
              <ValidationItem fulfilled={validations.hasSpecial} text="Símbolo especial (#$%&@!)" />
              <div className="h-px bg-dark-800 my-1" />
              <ValidationItem fulfilled={matches} text="Las contraseñas coinciden" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isStrong || !matches}
            className="btn-primary w-full py-4 text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Actualizando...
              </>
            ) : (
              'Restablecer Contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function ValidationItem({ fulfilled, text }) {
  return (
    <div className={`flex items-center gap-2 text-sm transition-colors ${fulfilled ? 'text-emerald-400' : 'text-dark-500'}`}>
      {fulfilled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4 opacity-30" />}
      {text}
    </div>
  )
}
