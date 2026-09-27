import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles, X, ExternalLink, Terminal, ShieldAlert } from 'lucide-react';
import { Button } from '../atoms/Button';
import { SerialErrorInfo } from '../../types/scanner';

export interface SerialErrorAlertProps {
  error: SerialErrorInfo | null;
  onRetry: () => void;
  onSwitchToSimulator: () => void;
  onDismiss: () => void;
  onOpenFirmware: () => void;
}

export const SerialErrorAlert: React.FC<SerialErrorAlertProps> = ({
  error,
  onRetry,
  onSwitchToSimulator,
  onDismiss,
  onOpenFirmware,
}) => {
  if (!error) return null;

  return (
    <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 text-xs text-neutral-200 relative animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0 mt-0.5 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-2">
            <div>
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                {error.title}
              </h4>
              <p className="text-neutral-300 mt-1 font-mono text-[11px] bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 break-all">
                {error.message}
              </p>
            </div>

            {/* Why this happens */}
            <div className="mt-1">
              <span className="font-semibold text-neutral-200 block mb-1">
                ¿Por qué ocurre este error?
              </span>
              <ul className="list-disc list-inside space-y-1 text-neutral-300 pl-1">
                {error.reasons.map((reason, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* How to solve */}
            <div className="mt-1 bg-neutral-900/90 border border-amber-500/30 rounded-lg p-3">
              <span className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1.5">
                <Terminal className="w-3.5 h-3.5" /> Pasos para solucionarlo de inmediato:
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-neutral-200 pl-1">
                {error.solutions.map((sol, idx) => (
                  <li key={idx} className="leading-relaxed font-medium">
                    {sol}
                  </li>
                ))}
              </ol>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 mt-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reintentar Conexión
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onSwitchToSimulator}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
              >
                Probar en Simulador 3D
              </Button>

              <button
                type="button"
                onClick={onOpenFirmware}
                className="text-neutral-400 hover:text-amber-400 underline underline-offset-4 px-2 py-1 transition-colors cursor-pointer"
              >
                Ver código y pines ESP32
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors shrink-0"
          title="Cerrar advertencia"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
