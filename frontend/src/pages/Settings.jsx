import { useState } from 'react'
import { 
  Settings, User, Lock, Sparkles, 
  Shield, Loader2, Save, Trash2,
  ClipboardCheck, Eye, EyeOff
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, fetchMe, logout } = useAuth()
  
  // Profile State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Password State
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // Validation rules
  const passwordRules = [
    { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
    { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
    { label: 'Al menos un número', test: (p) => /[0-9]/.test(p) },
    { label: 'Un símbolo (#$%&@!)', test: (p) => /[#$%&@!]/.test(p) },
  ]

  const passMatches = passwords.new_password && passwords.new_password === passwords.confirm_password
  const allRulesMet = passwordRules.every(rule => rule.test(passwords.new_password))

  // Auto-generation State
  const [autoGen, setAutoGen] = useState(user?.can_autogenerate_lists ?? true)
  const [updatingAutoGen, setUpdatingAutoGen] = useState(false)

  // Desactivate Account State
  const [showDeletePrompt, setShowDeletePrompt] = useState(false)
  const [deleteWord, setDeleteWord] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  const handleAutoGenToggle = async () => {
    const newValue = !autoGen
    setAutoGen(newValue)
    setUpdatingAutoGen(true)
    try {
      await api.patch('/users/me', { can_autogenerate_lists: newValue })
      await fetchMe()
      toast.success(newValue ? 'Generación automática activada' : 'Generación automática pausada')
    } catch (err) {
      setAutoGen(!newValue) // revert
      toast.error('Error al actualizar preferencia')
    } finally {
      setUpdatingAutoGen(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteWord.toLowerCase() !== 'delete') {
      return toast.error('Escribe la palabra exacta "delete" para continuar.')
    }
    
    setDeletingAccount(true)
    try {
      await api.delete('/users/me')
      toast.success('Cuenta eliminada. Lamentamos verte partir.')
      logout()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar la cuenta.')
      setDeletingAccount(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await api.patch('/users/me', profileData)
      await fetchMe() // Refresca el contexto global
      toast.success('Perfil actualizado correctamente')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar el perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    if (passwords.new_password !== passwords.confirm_password) {
      return toast.error('Las nuevas contraseñas no coinciden')
    }
    if (!allRulesMet) {
      return toast.error('La nueva contraseña no cumple los requisitos de seguridad')
    }

    setSavingPassword(true)
    try {
      await api.patch('/users/me/password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      })
      toast.success('Contraseña actualizada de forma segura')
      setPasswords({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-400" />
          Configuración
        </h1>
        <p className="text-dark-400 text-sm mt-1">Gestiona tu cuenta, seguridad y preferencias visuales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details */}
          <div className="card space-y-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <User className="w-4 h-4 text-emerald-400" />
              Perfil Personal
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-dark-400 font-medium">Nombre completo</label>
                  <input
                    type="text"
                    required
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="input"
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-dark-400 font-medium">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input"
                    placeholder="tucorreo@ejemplo.com"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingProfile} className="btn-primary">
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>

          {/* Security */}
          <div className="card space-y-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Lock className="w-4 h-4 text-primary-400" />
              Seguridad de la Cuenta
            </h2>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-dark-400 font-medium">Contraseña Actual</label>
                <input
                  type="password"
                  required
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs text-dark-400 font-medium">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={passwords.new_password}
                      onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                      className={`input pr-10 ${passwords.new_password && (allRulesMet ? 'border-emerald-500/50' : 'border-amber-500/50')}`}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* Rules Checklist */}
                  {passwords.new_password && (
                    <div className="grid grid-cols-1 gap-1.5 mt-2 p-2.5 bg-dark-950/50 rounded-lg border border-dark-800">
                      {passwordRules.map((rule, idx) => {
                        const met = rule.test(passwords.new_password)
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${met ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-500'}`}>
                              <ClipboardCheck className="w-2 h-2" />
                            </div>
                            <span className={`text-[10px] transition-colors ${met ? 'text-primary-300' : 'text-dark-600'}`}>
                              {rule.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-dark-400 font-medium">Confirmar Nueva</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                    className={`input ${passwords.confirm_password && (passMatches ? 'border-emerald-500/50' : 'border-red-500/50')}`}
                    placeholder="Repita la contraseña"
                  />
                  {passwords.confirm_password && (
                    <p className={`text-[10px] font-bold px-1 transition-all ${passMatches ? 'text-emerald-400' : 'text-red-400'}`}>
                      {passMatches ? '✓ Coinciden' : '✕ No coinciden'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={savingPassword || !allRulesMet || !passMatches} 
                  className={`btn-primary ${(!allRulesMet || !passMatches) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Preferences */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-dark-800 pb-3">
              <Settings className="w-4 h-4 text-amber-400" />
              Preferencias del Sistema
            </h2>
            
            <div className="space-y-4">
              {/* Toggle Auto-generation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${autoGen ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-800 text-dark-400'}`}>
                    {updatingAutoGen ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">Autogenerar Listas</p>
                    <p className="text-xs text-dark-500 max-w-[180px] leading-tight mt-0.5">Permite que el sistema cree sugerencias de listas automáticamente.</p>
                  </div>
                </div>
                <button 
                  disabled={updatingAutoGen}
                  onClick={handleAutoGenToggle}
                  className={`w-10 h-5 rounded-full relative transition-colors ${autoGen ? 'bg-primary-500' : 'bg-dark-700'} ${updatingAutoGen ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-300 ${autoGen ? 'left-[22px]' : 'left-[4px]'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border-red-500/20 space-y-4 bg-red-500/5">
            <h2 className="text-sm font-semibold text-red-500 flex items-center gap-2 border-b border-red-500/10 pb-3">
              Zona de Peligro
            </h2>
            <p className="text-xs text-dark-400">
              Al eliminar tu cuenta perderás permanentemente todo tu historial, configuraciones y listas activas.
            </p>

            {showDeletePrompt ? (
              <div className="mt-4 space-y-3 animate-fade-in text-left">
                <p className="text-xs text-red-400 font-medium">Escribe <strong className="text-red-500 px-1 uppercase">delete</strong> para confirmar:</p>
                <input 
                  type="text" 
                  value={deleteWord}
                  onChange={e => setDeleteWord(e.target.value)}
                  className="input !bg-dark-950 !border-red-500/30 text-red-400 placeholder-red-500/30 focus:!border-red-500 focus:!ring-red-500" 
                  placeholder="delete"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                       setShowDeletePrompt(false)
                       setDeleteWord('')
                    }}
                    disabled={deletingAccount}
                    className="flex-1 px-4 py-2 rounded-lg bg-dark-800 text-dark-300 hover:text-white transition-colors text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                     onClick={handleDeleteAccount}
                     disabled={deletingAccount || deleteWord.toLowerCase() !== 'delete'}
                     className={`flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-lg transition-colors text-xs font-semibold ${
                       deleteWord.toLowerCase() === 'delete' 
                         ? 'bg-red-500 text-white hover:bg-red-600' 
                         : 'bg-red-500/20 text-red-500/50 cursor-not-allowed'
                     }`}
                  >
                    {deletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                 onClick={() => setShowDeletePrompt(true)}
                 className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-sm font-semibold mt-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar Cuenta
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
