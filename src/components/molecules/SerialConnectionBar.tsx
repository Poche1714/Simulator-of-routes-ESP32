import React from 'react';
import { MapEnvironmentPreset } from '../../types/worldDiscoverer';
import { Usb, Cpu, RefreshCw, Power, FileCode, CheckCircle2 } from 'lucide-react';

interface SerialConnectionBarProps {
  connectionMode: 'simulator' | 'serial';
  isConnected: boolean;
  isConnecting: boolean;
  portName: string;
  baudRate: number;
  preset: MapEnvironmentPreset;
  onModeChange: (mode: 'simulator' | 'serial') => void;
  onBaudRateChange: (baud: number) => void;
  onPresetChange: (preset: MapEnvironmentPreset) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenFirmware: () => void;
}

export const SerialConnectionBar: React.FC<SerialConnectionBarProps> = ({
  connectionMode,
  isConnected,
  isConnecting,
  portName,
  baudRate,
  preset,
  onModeChange,
  onBaudRateChange,
  onPresetChange,
  onConnect,
  onDisconnect,
  onOpenFirmware,
}) => {
  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 md:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left Zone: Mode Switcher (Simulator vs ESP32) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => onModeChange('simulator')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              connectionMode === 'simulator'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulador 2D</span>
          </button>

          <button
            onClick={() => onModeChange('serial')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              connectionMode === 'serial'
                ? 'bg-neutral-800 text-cyan-400 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>ESP32 Hardware (COM)</span>
          </button>
        </div>

        {/* Preset Selector when in Simulator */}
        {connectionMode === 'simulator' ? (
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 hidden sm:inline">Mundo:</span>
            <select
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as MapEnvironmentPreset)}
              className="bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-xs font-medium cursor-pointer"
            >
              <option value="dungeon_chamber">Cámara de Mazmorra (Templo)</option>
              <option value="lunar_ruins">Cráter Lunar & Monolito</option>
              <option value="room_interior">Habitación / Puerta & Mesa</option>
              <option value="procedural_cave">Caverna con Estalagmitas</option>
            </select>
          </div>
        ) : (
          /* Serial Config */
          <div className="flex items-center gap-2">
            <select
              value={baudRate}
              onChange={(e) => onBaudRateChange(Number(e.target.value))}
              disabled={isConnected}
              className="bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 text-xs font-mono disabled:opacity-50"
            >
              <option value={115200}>115200 baud (ESP32)</option>
              <option value={9600}>9600 baud</option>
              <option value={57600}>57600 baud</option>
            </select>
          </div>
        )}
      </div>

      {/* Right Zone: Actions & Connection State */}
      <div className="flex items-center gap-2.5">
        {connectionMode === 'serial' ? (
          isConnected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>{portName || 'ESP32 Conectado'}</span>
              </span>
              <button
                onClick={onDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/60 hover:bg-rose-900 transition-colors cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-500 shadow-sm shadow-cyan-600/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isConnecting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Usb className="w-3.5 h-3.5" />
              )}
              <span>{isConnecting ? 'Abriendo Puerto...' : 'Conectar ESP32'}</span>
            </button>
          )
        ) : (
          <span className="text-neutral-400 text-xs font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Simulador de Barrido 180° / 20s Activo</span>
          </span>
        )}

        {/* ESP32 Firmware Button */}
        <button
          onClick={onOpenFirmware}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700 hover:text-white hover:bg-neutral-750 transition-colors cursor-pointer"
        >
          <FileCode className="w-3.5 h-3.5 text-amber-400" />
          <span>Código ESP32</span>
        </button>
      </div>
    </div>
  );
};
