import { Check, Loader2, X } from 'lucide-react'

/**
 * Barra de acción inferior fija (mobile). Sin estado propio: el padre
 * controla `confirming`/`loading` y qué pasa al confirmar/cancelar.
 */
export default function StickyActionBar({
  visible,
  progressLabel,
  primaryLabel,
  onPrimaryClick,
  confirming,
  loading,
  onConfirm,
  onCancel,
  disabled,
}) {
  if (!visible) return null

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom bg-dark-900/95 backdrop-blur-sm border-t border-dark-800 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {confirming ? (
          <>
            <span className="text-sm text-dark-300 font-medium">¿Finalizar compra?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="tap-target rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                aria-label="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="tap-target rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors disabled:opacity-50 px-4"
                aria-label="Confirmar"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-sm text-dark-400 font-medium">{progressLabel}</span>
            <button
              onClick={onPrimaryClick}
              disabled={disabled}
              className="tap-target rounded-lg bg-teal-600 text-white font-semibold text-sm px-4 hover:bg-teal-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {primaryLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
