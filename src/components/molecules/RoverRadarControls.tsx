import React from 'react';
import { RoverSweepState } from '../../types/worldDiscoverer';
import { Play, Pause, RotateCw, RotateCcw, Crosshair, Trash2, Radar } from 'lucide-react';

interface RoverRadarControlsProps {
  roverState: RoverSweepState;
  onToggleScan: () => void;
  onTurnLeft: () => void;
  onTurnRight: () => void;
  onGotoAngle: (angle: number) => void;
  onRangeChange: (rangeCm: number) => void;
  onClearMap: () => void;
  disabled?: boolean;
}

export const RoverRadarControls: React.FC<RoverRadarControlsProps> = ({
  roverState,
  onToggleScan,
  onTurnLeft,
  onTurnRight,
  onGotoAngle,
  onRangeChange,
  onClearMap,
  disabled = false,
}) => {
  const { currentAngle, isScanning, maxRangeCm } = roverState;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-neutral-100">Control del Servomotor & Radar</h3>
        </div>
        <div className="text-xs font-mono text-neutral-400">
          <span>{isScanning ? 'Barrido Activo (20s)' : 'Pausado'}</span>
        </div>
      </div>

      {/* Main Sweep Action Button (20s cycle) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onToggleScan}
          disabled={disabled}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isScanning
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 font-bold shadow-md shadow-emerald-500/20'
          }`}
        >
          {isScanning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pausar Sondeo</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Iniciar Sondeo 180°</span>
            </>
          )}
        </button>

        <button
          onClick={onClearMap}
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-neutral-300 bg-neutral-800/80 border border-neutral-700/60 hover:bg-neutral-750 hover:text-white transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
          <span>Limpiar Mapa 2D</span>
        </button>
      </div>

      {/* Manual Servo Position Slider (0° to 180°) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-400">Orientación Manual (0° - 180°):</span>
          <span className="font-mono text-emerald-400 font-semibold text-sm">
            {Math.round(currentAngle)}°
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={180}
          step={1}
          value={Math.round(currentAngle)}
          onChange={(e) => onGotoAngle(Number(e.target.value))}
          disabled={disabled || isScanning}
          className="w-full accent-emerald-500 h-2 bg-neutral-800 rounded-lg cursor-pointer disabled:opacity-50"
        />

        {/* Quick Angle Preset Buttons */}
        <div className="grid grid-cols-5 gap-1 pt-1">
          {[
            { label: '60° (-30°)', angle: 60 },
            { label: '80° (-10°)', angle: 80 },
            { label: '90° (0°)', angle: 90 },
            { label: '100° (+10°)', angle: 100 },
            { label: '120° (+30°)', angle: 120 },
          ].map((preset) => (
            <button
              key={preset.angle}
              onClick={() => onGotoAngle(preset.angle)}
              disabled={disabled || isScanning}
              className={`py-1 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                Math.round(currentAngle) === preset.angle
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
          Inicio: <strong className="text-neutral-200">90°</strong> (0° relativo). Normal: <strong className="text-emerald-300">0 a 30° y 0 a -30°</strong>. Al detectar obstáculo (&le; 40 cm): disminuye a <strong className="text-amber-300">0 a 10° y 0 a -10°</strong> (sin parar muestreo). Al girar vuelve a <strong className="text-cyan-400">0 a 30° y 0 a -30°</strong>.
        </p>
      </div>

      {/* Manual Nudge Buttons */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
        <button
          onClick={onTurnRight}
          disabled={disabled || isScanning}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium text-neutral-300 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-750 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Girar Derecha (-10°)</span>
        </button>

        <button
          onClick={() => onGotoAngle(90)}
          disabled={disabled || isScanning}
          className="p-2 text-neutral-300 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-750 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
          title="Centrar a 90°"
        >
          <Crosshair className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={onTurnLeft}
          disabled={disabled || isScanning}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium text-neutral-300 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-750 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Girar Izquierda (+10°)</span>
        </button>
      </div>

      {/* Range Scale Selector */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800/80">
        <span className="text-xs text-neutral-400">Rango de Alcance Ultrasónico:</span>
        <div className="grid grid-cols-4 gap-1.5">
          {[100, 200, 300, 400].map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`py-1.5 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                maxRangeCm === r
                  ? 'bg-neutral-800 text-emerald-400 border border-emerald-500/40 font-semibold'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-200'
              }`}
            >
              {r} cm
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
