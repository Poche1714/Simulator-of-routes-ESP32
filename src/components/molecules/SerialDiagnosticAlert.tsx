import React from 'react';
import { SerialErrorInfo } from '../../types/worldDiscoverer';
import { AlertCircle, RefreshCw, Cpu, BookOpen, X } from 'lucide-react';

interface SerialDiagnosticAlertProps {
  error: SerialErrorInfo;
  onRetry: () => void;
  onSwitchToSimulator: () => void;
  onDismiss: () => void;
  onOpenFirmware: () => void;
}

export const SerialDiagnosticAlert: React.FC<SerialDiagnosticAlertProps> = ({
  error,
  onRetry,
  onSwitchToSimulator,
  onDismiss,
  onOpenFirmware,
}) => {
  return (
    <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 md:p-5 flex flex-col gap-3.5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <h4 className="text-sm font-bold text-amber-200">{error.title}</h4>
        </div>
        <button
          onClick={onDismiss}
          className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-neutral-300 leading-relaxed">{error.message}</p>

      {/* Probable Causes & Solutions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-neutral-950/60 p-3 rounded-xl border border-amber-900/40">
        <div>
          <span className="font-semibold text-amber-300 block mb-1">Causas frecuentes:</span>
          <ul className="list-disc list-inside text-neutral-400 space-y-0.5">
            {error.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <span className="font-semibold text-emerald-400 block mb-1">Solución rápida:</span>
          <ul className="list-disc list-inside text-neutral-300 space-y-0.5">
            {error.solutions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-semibold hover:bg-amber-400 text-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar Conexión</span>
        </button>

        <button
          onClick={onSwitchToSimulator}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 text-emerald-400 border border-emerald-500/40 hover:bg-neutral-750 text-xs transition-colors cursor-pointer"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Usar Modo Simulador 2D</span>
        </button>

        <button
          onClick={onOpenFirmware}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-750 text-xs transition-colors cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Instrucciones de Flasheo</span>
        </button>
      </div>
    </div>
  );
};
