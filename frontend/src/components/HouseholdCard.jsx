import { useEffect, useState } from 'react'
import { Home, Loader2, Copy, Check, UserMinus, LogOut, KeyRound, X } from 'lucide-react'
import api from '../api/axios'
import { apiCache } from '../api/cache'
import toast from 'react-hot-toast'

// Agrupado de a cuatro para leerlo y dictarlo; el backend ignora el guion.
const formatCode = (code) => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '')

/**
 * Hogar compartido: otra cuenta se une con un código y desde ahí trabaja sobre
 * el mismo catálogo, tiendas y listas, sin duplicar nada.
 */
export default function HouseholdCard() {
  const [household, setHousehold] = useState(null)
  const [busy, setBusy] = useState(null) // qué acción está en curso
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => {
    api.get('/household/')
      .then(({ data }) => setHousehold(data))
      .catch(() => toast.error('No se pudo cargar el hogar'))
  }, [])

  const run = async (key, request, successMsg, { dataChanged = false } = {}) => {
    setBusy(key)
    try {
      const { data } = await request()
      setHousehold(data)
      if (dataChanged) apiCache.clear()
      if (successMsg) toast.success(successMsg)
      return true
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo completar la acción')
      return false
    } finally {
      setBusy(null)
    }
  }

  const handleCopy = async () => {
    const text = `Únete a mi hogar en la app de compras con este código: ${formatCode(household.invite_code)}`
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(household.invite_code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // El usuario cerró el diálogo de compartir: no es un error.
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    const ok = await run(
      'join',
      () => api.post('/household/join/', { code }),
      'Te uniste al hogar. Ahora ves su catálogo y sus listas.',
      { dataChanged: true },
    )
    if (ok) setCode('')
  }

  if (!household) {
    return (
      <div className="card flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-dark-500" />
      </div>
    )
  }

  const isMember = household.role === 'member'
  const expires = household.invite_expires_at
    ? new Date(household.invite_expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="card space-y-5">
      <h2 className="text-sm font-semibold text-dark-200 flex items-center gap-2 border-b border-dark-800 pb-3">
        <Home className="w-4 h-4 text-primary-600" />
        Hogar compartido
      </h2>

      {isMember ? (
        // ── Miembro de otro hogar ────────────────────────────────────────────
        <div className="space-y-4">
          <p className="text-sm text-dark-300">
            Compartes el hogar de <strong className="text-dark-100">{household.owner.name}</strong>.
            Ves y editas su catálogo, sus tiendas y sus listas.
          </p>
          {confirmLeave ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-dark-800/60 border border-dark-700 rounded-xl p-3">
              <p className="text-xs text-dark-300 flex-1">
                Volverás a tus propios datos. Lo que hiciste en este hogar se queda en él.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmLeave(false)} className="btn-ghost text-xs">Cancelar</button>
                <button
                  onClick={() => run('leave', () => api.post('/household/leave/'), 'Saliste del hogar', { dataChanged: true })
                    .then(() => setConfirmLeave(false))}
                  disabled={busy === 'leave'}
                  className="btn-secondary text-xs text-red-600"
                >
                  {busy === 'leave' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmLeave(true)} className="btn-ghost text-xs text-dark-400 hover:text-red-600 -ml-2">
              <LogOut className="w-3.5 h-3.5" />
              Salir de este hogar
            </button>
          )}
        </div>
      ) : (
        // ── Dueño: invitar y ver quién comparte ──────────────────────────────
        <div className="space-y-5">
          <p className="text-xs text-dark-400">
            Invita a alguien de tu casa: con su propia cuenta verá y editará tu catálogo, tus tiendas y tus
            listas, sin crear productos de nuevo.
          </p>

          {household.members.length > 0 && (
            <ul className="space-y-2">
              {household.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 bg-dark-900/60 border border-dark-800 rounded-xl px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-dark-100 font-medium truncate">{m.name}</p>
                    <p className="text-xs text-dark-500 truncate">{m.email}</p>
                  </div>
                  <button
                    onClick={() => run(`remove-${m.id}`, () => api.delete(`/household/members/${m.id}/`), `${m.name} ya no comparte tu hogar`)}
                    disabled={busy === `remove-${m.id}`}
                    title="Sacar del hogar"
                    className="tap-target rounded text-dark-500 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {busy === `remove-${m.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {household.invite_code ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-center font-mono text-xl tracking-[0.2em] font-bold text-dark-100 bg-dark-900 border border-dark-700 rounded-xl py-2.5 select-all">
                  {formatCode(household.invite_code)}
                </span>
                <button onClick={handleCopy} className="tap-target btn-secondary" title="Compartir código">
                  {copied ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => run('revoke', () => api.delete('/household/invite/'), 'Código anulado')}
                  disabled={busy === 'revoke'}
                  className="tap-target btn-ghost text-dark-500"
                  title="Anular código"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-dark-500">
                Sirve una sola vez y vence el {expires}. La otra persona lo ingresa en Configuración → Hogar compartido.
              </p>
            </div>
          ) : (
            <button
              onClick={() => run('invite', () => api.post('/household/invite/'))}
              disabled={busy === 'invite'}
              className="btn-primary text-sm"
            >
              {busy === 'invite' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Generar código de invitación
            </button>
          )}

          {/* Unirse a otro hogar: solo si nadie comparte el propio */}
          {household.members.length === 0 && (
            <form onSubmit={handleJoin} className="border-t border-dark-800 pt-4 space-y-2">
              <p className="text-xs text-dark-400">¿Te invitaron a otro hogar? Ingresa el código:</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-2345"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="input font-mono tracking-widest uppercase flex-1"
                />
                <button type="submit" disabled={code.trim().length < 4 || busy === 'join'} className="btn-primary text-sm shrink-0">
                  {busy === 'join' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unirme'}
                </button>
              </div>
              <p className="text-[11px] text-dark-500">
                Tus productos y listas actuales se guardan y vuelven si sales del hogar.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
