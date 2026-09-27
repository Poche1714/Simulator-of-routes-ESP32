import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Terminal, Send, Trash2, Radio, Activity, Eye, EyeOff } from 'lucide-react';

interface ScoutConsoleOrganismProps {
  logs: { time: string; text: string; dir: 'in' | 'out' | 'sys' }[];
  currentDistanceCm: number;
  currentAngle: number;
  isConnected: boolean;
  onSendCommand: (cmd: string) => void;
  onClearLogs: () => void;
}

export const ScoutConsoleOrganism: React.FC<ScoutConsoleOrganismProps> = ({
  logs,
  currentDistanceCm,
  currentAngle,
  isConnected,
  onSendCommand,
  onClearLogs,
}) => {
  const [inputCmd, setInputCmd] = useState('');
  const [hideReceived, setHideReceived] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  const visibleLogs = useMemo(() => {
    if (!hideReceived) return logs;
    return logs.filter((log) => log.dir !== 'in');
  }, [logs, hideReceived]);

  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    onSendCommand(inputCmd.trim());
    setInputCmd('');
  };

  // Raw echo time in microseconds calculation
  const echoMicros = Math.round((currentDistanceCm * 2) / 0.0343);

  return (
    <div id="consola" className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Sensor Gauge & Hardware Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-neutral-400">Sensor HC-SR04:</span>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-400">
            {currentDistanceCm.toFixed(1)} cm
          </span>
        </div>

        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-neutral-400">Tiempo de Eco:</span>
          </div>
          <span className="font-mono text-xs font-semibold text-neutral-200">
            {echoMicros} µs
          </span>
        </div>

        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-neutral-400">Orientación Sensor:</span>
          </div>
          <span className="font-mono text-xs font-semibold text-neutral-200">
            {Math.round(currentAngle)}° ({currentAngle < 60 ? 'Derecha' : currentAngle > 120 ? 'Izquierda' : 'Frente'})
          </span>
        </div>
      </div>

      {/* Terminal Title & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-neutral-400" />
          <h4 className="text-xs font-semibold text-neutral-200">Monitor Serie & Comandos ESP32</h4>
          <span className="text-[11px] font-mono text-neutral-500">
            {isConnected ? '115200 bps' : 'Simulador Activo'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botón para ocultar/mostrar datos recibidos (RX) */}
          <button
            type="button"
            onClick={() => setHideReceived((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors font-medium cursor-pointer ${
              hideReceived
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-800'
            }`}
            title={hideReceived ? 'Mostrar datos recibidos en el puerto serial (RX)' : 'Ocultar datos recibidos en el puerto serial (RX)'}
          >
            {hideReceived ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Datos RX Ocultos</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Ocultar RX</span>
              </>
            )}
          </button>

          <button
            onClick={onClearLogs}
            className="text-neutral-500 hover:text-neutral-300 p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Limpiar Consola"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Output Screen */}
      <div
        ref={logsContainerRef}
        className="h-36 bg-neutral-950 rounded-lg p-2.5 font-mono text-[11px] overflow-y-auto border border-neutral-800 flex flex-col gap-1 select-text"
      >
        {hideReceived && (
          <div className="bg-amber-950/40 border border-amber-500/30 rounded px-2 py-1 text-[10px] text-amber-300/90 flex items-center justify-between select-none">
            <span>Telemetría RX (PING/DIST) oculta — Mostrando comandos enviados y sistema</span>
            <span className="text-amber-400/80 font-bold">{logs.filter((l) => l.dir === 'in').length} ocultos</span>
          </div>
        )}

        {visibleLogs.length === 0 ? (
          <span className="text-neutral-600 italic">
            {hideReceived
              ? 'No hay comandos ni eventos de sistema (los datos RX recibidos están ocultos).'
              : 'Esperando telemetría de sondeo...'}
          </span>
        ) : (
          visibleLogs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 leading-relaxed">
              <span className="text-neutral-600 select-none text-[10px]">{log.time}</span>
              <span
                className={
                  log.dir === 'in'
                    ? 'text-emerald-400'
                    : log.dir === 'out'
                    ? 'text-cyan-400 font-semibold'
                    : 'text-amber-400/80 italic'
                }
              >
                {log.dir === 'in' ? '▲ ' : log.dir === 'out' ? '▼ ' : '■ '}
                {log.text}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Command Sender Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          placeholder="Enviar comando (ej: START, STOP, PING, GOTO:90, STEP_L)..."
          className="flex-1 bg-neutral-950 text-neutral-100 text-xs px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-cyan-500 font-mono"
        />
        <button
          type="submit"
          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          <span>Enviar</span>
        </button>
      </form>
    </div>
  );
};
