import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Terminal, Send, Trash2, ChevronDown, ChevronUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface SerialConsoleProps {
  logs: { time: string; text: string; direction: 'in' | 'out' | 'sys' }[];
  onSendCommand: (cmd: string) => void;
  onClearLogs: () => void;
  isConnected: boolean;
}

export const SerialConsoleOrganism: React.FC<SerialConsoleProps> = ({
  logs,
  onSendCommand,
  onClearLogs,
  isConnected,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hideReceived, setHideReceived] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleLogs = useMemo(() => {
    if (!hideReceived) return logs;
    return logs.filter((l) => l.direction !== 'in');
  }, [logs, hideReceived]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLogs, autoScroll]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    onSendCommand(commandInput.trim());
    setCommandInput('');
  };

  return (
    <div className="flex flex-col bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden transition-all">
      {/* Console Bar Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950/80 border-b border-neutral-800">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
        >
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>Monitor y Terminal Serial ESP32</span>
          <span className="font-mono text-[11px] text-neutral-400">({logs.length} líneas)</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />}
        </button>

        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <>
              {/* Toggle para ocultar/mostrar datos recibidos (RX) */}
              <button
                type="button"
                onClick={() => setHideReceived((prev) => !prev)}
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  hideReceived
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 border border-neutral-700/60'
                }`}
                title={hideReceived ? 'Mostrar datos recibidos en serial (RX)' : 'Ocultar datos recibidos en serial (RX)'}
              >
                {hideReceived ? (
                  <>
                    <EyeOff className="w-3 h-3 text-amber-400" />
                    <span>RX Ocultos</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Ocultar RX</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAutoScroll(!autoScroll)}
                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  autoScroll ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title="Desplazamiento automático al final"
              >
                Auto-scroll
              </button>

              <button
                type="button"
                onClick={onClearLogs}
                className="text-neutral-400 hover:text-rose-400 p-1 rounded transition-colors"
                title="Limpiar consola"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable Console Body */}
      {!isCollapsed && (
        <div className="flex flex-col">
          {hideReceived && (
            <div className="bg-amber-950/40 border-b border-amber-500/30 px-3 py-1 font-mono text-[10px] text-amber-300 flex items-center justify-between select-none">
              <span>Telemetría RX (datos recibidos del puerto) oculta — Mostrando comandos y eventos</span>
              <span className="font-bold text-amber-400">{logs.filter((l) => l.direction === 'in').length} ocultos</span>
            </div>
          )}

          <div
            ref={scrollRef}
            className="h-44 bg-neutral-950 p-3 font-mono text-xs overflow-y-auto flex flex-col gap-1 select-text"
          >
            {visibleLogs.length === 0 ? (
              <div className="text-neutral-600 italic py-2">
                {hideReceived
                  ? 'No hay comandos ni eventos de sistema (los datos RX recibidos están ocultos).'
                  : 'Sin datos aún. Conecta el ESP32 o ejecuta comandos para ver la telemetría en tiempo real.'}
              </div>
            ) : (
              visibleLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 leading-tight">
                  <span className="text-neutral-600 text-[10px] shrink-0 select-none">
                    {log.time}
                  </span>
                  <span
                    className={`text-[10px] px-1 rounded shrink-0 font-bold ${
                      log.direction === 'in'
                        ? 'text-cyan-400 bg-cyan-950/40'
                        : log.direction === 'out'
                        ? 'text-amber-400 bg-amber-950/40'
                        : 'text-neutral-400 bg-neutral-800/40'
                    }`}
                  >
                    {log.direction === 'in' ? 'RX' : log.direction === 'out' ? 'TX' : 'SYS'}
                  </span>
                  <span
                    className={`break-all ${
                      log.direction === 'out'
                        ? 'text-amber-200 font-semibold'
                        : log.direction === 'sys'
                        ? 'text-neutral-400'
                        : log.text.includes('STATUS')
                        ? 'text-emerald-300 font-medium'
                        : 'text-neutral-300'
                    }`}
                  >
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick command buttons */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border-t border-neutral-800 text-[11px] overflow-x-auto">
            <span className="text-neutral-500 shrink-0 font-mono">Comandos rápidos:</span>
            {['LEFT:5', 'RIGHT:5', 'GOTO:90', 'HOME', 'PING', 'SCAN:START', 'SCAN:STOP'].map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => onSendCommand(cmd)}
                disabled={!isConnected}
                className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-amber-400 hover:border-amber-500/50 disabled:opacity-40 transition-colors shrink-0 font-mono"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Direct Input Line */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 p-2 bg-neutral-950/90 border-t border-neutral-800"
          >
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={
                isConnected
                  ? 'Escribe comando serie (ej: GOTO:45, LEFT:10, PING, SCAN:START)...'
                  : 'Conecta el ESP32 para enviar comandos serie'
              }
              disabled={!isConnected}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 font-mono placeholder-neutral-600 focus:outline-none focus:border-amber-500/80"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isConnected || !commandInput.trim()}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Enviar
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};
