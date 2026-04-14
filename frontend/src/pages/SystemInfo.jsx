import { useState, useEffect } from 'react'
import { CalendarDays, CheckCircle2, Server, RefreshCw, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function SystemInfo() {
  const { user, fetchMe } = useAuth()
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [updatingAutoGen, setUpdatingAutoGen] = useState(false)

  const fetchHealth = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/system/health/')
      setHealth(data)
    } catch (err) {
      setHealth({
        status: 'error',
        database: 'disconnected',
        version: 'unknown'
      })
      toast.error('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoGenToggle = async () => {
    const newValue = !health?.user_can_autogen // Nota: Usaremos el estado local o del usuario
    setUpdatingAutoGen(true)
    try {
      await api.patch('/users/me/', { can_autogenerate_lists: !user.can_autogenerate_lists })
      await fetchMe() // Refresca el contexto global
      toast.success(!user.can_autogenerate_lists ? 'Generación automática activada para tu cuenta' : 'Generación automática desactivada para tu cuenta')
    } catch (err) {
      toast.error('Error al actualizar tu preferencia')
    } finally {
      setUpdatingAutoGen(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const handleGenerateLists = async () => {
    setGenerating(true)
    try {
      const { data } = await api.post('/system/generate-lists/')
      toast.success(data.message || 'Proceso de generación completado')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al disparar la generación')
    } finally {
      setGenerating(false)
    }
  }

  const services = [
    { 
      label: 'API Backend', 
      desc: 'Servicio principal de datos', 
      ok: health?.status === 'ok',
      statusText: health?.status === 'ok' ? 'Activo y en línea' : 'Sin respuesta'
    },
    { 
      label: 'Base de Datos', 
      desc: 'Almacenamiento (Supabase)', 
      ok: health?.database === 'connected',
      statusText: health?.database === 'connected' ? 'Conectado (PostgreSQL)' : 'Desconectado'
    },
    { 
      label: 'Auto-generación', 
      desc: 'Motor de listas automáticas', 
      ok: health?.status === 'ok',
      statusText: 'Programado (Diario)' 
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-primary-400" />
            Estado e Información del Sistema
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Monitorea los servicios y tareas programadas de la plataforma.
          </p>
        </div>
        <button 
          onClick={fetchHealth}
          disabled={loading}
          className="btn-ghost p-2 rounded-full hover:bg-dark-800 transition-colors"
          title="Refrescar estado"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Health Status Card */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-primary-400" />
          Estado de los Servicios
        </h2>

        <div className="space-y-4">
          {services.map(({ label, desc, ok, statusText }) => (
            <div key={label} className="flex items-center justify-between pb-4 border-b border-dark-800 last:border-0 last:pb-0">
              <div>
                <span className="text-sm font-medium text-dark-200 block">{label}</span>
                <span className="text-xs text-dark-500">{desc}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={ok ? 'badge-green' : 'badge-yellow'}>
                  {statusText}
                </span>
                {health?.version && label === 'API Backend' && (
                  <span className="text-[10px] text-dark-600 font-mono">v{health.version}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-2">
          <div className="flex items-center gap-2 text-sm text-dark-400 bg-dark-900 rounded-lg p-3 border border-dark-800">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            <span>La próxima auto-generación masiva está programada para la <strong>medianoche</strong>.</span>
          </div>
        </div>
      </div>

      {/* Admin Actions Section */}
      {user?.is_admin && (
        <div className="card border-primary-500/20 bg-primary-500/5 space-y-4">
          <div className="flex items-center gap-2 border-b border-primary-500/10 pb-3">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-semibold text-white">Acciones de Administrador</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-dark-100 font-medium">Mi Preferencia Personal</p>
              <p className="text-xs text-dark-400 mt-1 max-w-md">
                Indica si deseas que el sistema genere listas automáticas para <strong>tu propia cuenta</strong> de administrador.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${user?.can_autogenerate_lists ? 'text-emerald-400' : 'text-dark-500'}`}>
                {user?.can_autogenerate_lists ? 'ACTIVADO' : 'DESACTIVADO'}
              </span>
              <button 
                disabled={updatingAutoGen}
                onClick={handleAutoGenToggle}
                className={`w-10 h-5 rounded-full relative transition-colors ${user?.can_autogenerate_lists ? 'bg-primary-500' : 'bg-dark-700'} ${updatingAutoGen ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all duration-300 ${user?.can_autogenerate_lists ? 'left-[22px]' : 'left-[4px]'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-primary-500/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-dark-100 font-medium">Ejecución Manual (Global)</p>
              <p className="text-xs text-dark-400 mt-1 max-w-md">
                Dispara el motor de recomendaciones inmediatamente para todos los usuarios que tengan la opción activa.
              </p>
            </div>
            <button
              onClick={handleGenerateLists}
              disabled={generating}
              className="btn-primary shrink-0"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Ejecutar Ahora
            </button>
          </div>

          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              <strong>Nota:</strong> Esta acción puede tomar unos segundos dependiendo de la cantidad de usuarios activos. 
              No recargues la página mientras se procesa.
            </p>
          </div>
        </div>
      )}
      
    </div>
  )
}
