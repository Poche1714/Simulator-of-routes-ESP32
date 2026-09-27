import React from 'react';
import { Usb, Play, Square, Cpu, Sparkles, Wifi, Bluetooth } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { ConnectionMode } from '../../types/scanner';
import { SimulatedModel } from '../../utils/simulatedScanner';

export interface ConnectionBarProps {
  connectionMode: ConnectionMode;
  isConnected: boolean;
  isConnecting: boolean;
  portName?: string;
  baudRate: number;
  simulatedModel: SimulatedModel;
  onModeChange: (mode: ConnectionMode) => void;
  onBaudRateChange: (baud: number) => void;
  onSimulatedModelChange: (model: SimulatedModel) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenFirmware: () => void;
}

export const ConnectionBar: React.FC<ConnectionBarProps> = ({
  connectionMode,
  isConnected,
  isConnecting,
  portName,
  baudRate,
  simulatedModel,
  onModeChange,
  onBaudRateChange,
  onSimulatedModelChange,
  onConnect,
  onDisconnect,
  onOpenFirmware,
}) => {
  const isSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
      {/* Left: Mode Selection */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg bg-neutral-950 p-0.5 border border-neutral-800">
          <button
            type="button"
            onClick={() => onModeChange('serial')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              connectionMode === 'serial'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>ESP32 USB Serial</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('simulator')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              connectionMode === 'simulator'
                ? 'bg-amber-500 text-neutral-950 font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulador 3D</span>
          </button>
        </div>

        {/* Status Badge */}
        <Badge
          status={isConnected ? 'connected' : 'disconnected'}
          label={isConnected ? (connectionMode === 'simulator' ? 'Simulador Activo' : 'ESP32 Conectado') : 'Desconectado'}
          detail={isConnected ? (portName || (connectionMode === 'simulator' ? 'Física Virtual' : 'COM/ttyUSB')) : undefined}
        />
      </div>

      {/* Middle/Right: Controls */}
      <div className="flex items-center gap-3">
        {connectionMode === 'simulator' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Objeto de prueba:</span>
            <select
              value={simulatedModel}
              onChange={(e) => onSimulatedModelChange(e.target.value as SimulatedModel)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80 cursor-pointer"
            >
              <option value="vase">Jarrón Griego / Ánfora</option>
              <option value="bust">Busto / Estatuilla</option>
              <option value="gear">Engranaje Mecánico (12 Dientes)</option>
              <option value="mug">Taza con Asa</option>
              <option value="crystal">Prisma Hexagonal</option>
            </select>
          </div>
        )}

        {connectionMode === 'serial' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Baudios:</span>
            <select
              value={baudRate}
              onChange={(e) => onBaudRateChange(Number(e.target.value))}
              disabled={isConnected}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500/80 disabled:opacity-40"
            >
              <option value={115200}>115200 baud</option>
              <option value={9600}>9600 baud</option>
              <option value={57600}>57600 baud</option>
              <option value={230400}>230400 baud</option>
            </select>
          </div>
        )}

        {/* Connect / Disconnect */}
        {isConnected ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onDisconnect}
            leftIcon={<Square className="w-3.5 h-3.5" />}
          >
            Desconectar
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            isLoading={isConnecting}
            onClick={onConnect}
            leftIcon={connectionMode === 'serial' ? <Usb className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {connectionMode === 'serial' ? 'Conectar ESP32' : 'Iniciar Simulador'}
          </Button>
        )}

        {/* View ESP32 Firmware Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFirmware}
          leftIcon={<Cpu className="w-3.5 h-3.5 text-neutral-400" />}
        >
          Código ESP32 (.ino)
        </Button>
      </div>
    </div>
  );
};
