import { CalendarDays, CheckCircle2, Server } from 'lucide-react'

export default function SystemInfo() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-primary-400" />
          Estado e Información del Sistema
        </h1>
        <p className="text-dark-400 text-sm mt-0.5">
          Monitorea los servicios y tareas programadas de la plataforma.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-primary-400" />
          Estado de los Servicios
        </h2>

        <div className="space-y-4">
          {[
            { label: 'API Backend',      desc: 'Servicio principal de datos', ok: true  },
            { label: 'Base de Datos',    desc: 'Almacenamiento persistente',  ok: true  },
            { label: 'Auto-generación',  desc: 'Motor de listas automáticas', ok: true  },
          ].map(({ label, desc, ok }) => (
            <div key={label} className="flex items-center justify-between pb-4 border-b border-dark-800 last:border-0 last:pb-0">
              <div>
                <span className="text-sm font-medium text-dark-200 block">{label}</span>
                <span className="text-xs text-dark-500">{desc}</span>
              </div>
              <span className={ok ? 'badge-green' : 'badge-yellow'}>
                {ok ? 'Activo y en línea' : 'Mantenimiento/Error'}
              </span>
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
      
    </div>
  )
}
