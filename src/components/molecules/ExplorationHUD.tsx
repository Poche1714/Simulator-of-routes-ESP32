import React from 'react';
import { ExplorationStats, GameVisualTheme, ScanMode } from '../../types/worldDiscoverer';
import { Volume2, VolumeX, Footprints, ShieldAlert, Radio, AlertOctagon } from 'lucide-react';

interface ExplorationHUDProps {
  stats: ExplorationStats;
  currentDistanceCm: number;
  isObstacleDetected: boolean;
  obstacleThresholdCm?: number;
  scanMode?: ScanMode;
  theme: GameVisualTheme;
  onThemeChange: (theme: GameVisualTheme) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ExplorationHUD: React.FC<ExplorationHUDProps> = ({
  stats,
  currentDistanceCm,
  isObstacleDetected,
  obstacleThresholdCm = 40,
  scanMode = 'narrow_patrol',
  theme,
  onThemeChange,
  isMuted,
  onToggleMute,
}) => {
  const isClose = currentDistanceCm <= obstacleThresholdCm;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Bot Trajectory & Traveled Distance */}
      <div className="bg-neutral-900/90 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <Footprints className="w-3.5 h-3.5" />
            <span>Trayecto del Bot</span>
          </span>
          <span className="text-[11px] text-emerald-400 font-mono">Ruta</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {stats.totalDistanceTraveledM.toFixed(2)}
          </span>
          <span className="text-xs text-neutral-500">metros</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 font-mono">
          <span>{stats.routePointsCount} hitos/puntos</span>
          <span className="text-emerald-400">Activo</span>
        </div>
      </div>

      {/* 2. Obstacles Detected & Mapped */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Obstáculos Mapeados</span>
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
            {stats.obstaclesDetectedCount}
          </span>
          <span className="text-xs text-neutral-500">puntos 2D</span>
        </div>
        <span className="text-[11px] text-neutral-500 mt-2">Muros y límites registrados</span>
      </div>

      {/* 4. Live Ultrasonic Distance in CM (Direct response to "Devuelve los cm al que esta el objeto") */}
      <div
        className={`rounded-xl p-3 flex flex-col justify-between transition-colors border shadow-sm ${
          isClose
            ? 'bg-rose-950/40 border-rose-500/50 shadow-rose-950/30'
            : 'bg-neutral-900/90 border-neutral-800'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span
            className={`flex items-center gap-1.5 font-medium ${
              isClose ? 'text-rose-400 font-semibold' : 'text-cyan-400'
            }`}
          >
            {isClose ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            ) : (
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Distancia al Objeto</span>
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
              isClose
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            {isClose ? '≤ 40 cm' : '> 40 cm'}
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-bold font-mono tabular-nums ${
              isClose
                ? 'text-rose-400 animate-pulse'
                : currentDistanceCm < 100
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {currentDistanceCm.toFixed(1)}
          </span>
          <span className="text-xs text-neutral-400 font-semibold">cm</span>
        </div>

        <div className="flex items-center justify-between text-[11px] mt-2 font-mono">
          <span className={isClose || scanMode === 'obstacle_reduced_sweep' ? 'text-amber-300 font-semibold' : 'text-neutral-500'}>
            {isClose || scanMode === 'obstacle_reduced_sweep' ? 'Sondeo Reducido ±10° (Obstáculo)' : 'Sondeo Normal ±30° (0 a ±30°)'}
          </span>
          <span className="text-neutral-500 text-[10px]">Corte: {obstacleThresholdCm}cm</span>
        </div>
      </div>

      {/* 4. Sector & Theme Controls */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium truncate" title={stats.currentSectorName}>
            {stats.currentSectorName}
          </span>
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer shrink-0 ${
              isMuted
                ? 'bg-neutral-800 text-neutral-500'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
            title={isMuted ? 'Activar Sonar Sonoro' : 'Silenciar Sonar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as GameVisualTheme)}
          className="w-full bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg text-xs py-1.5 px-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="tactical_radar">Radar Táctico (Verde)</option>
          <option value="dungeon_pixel">Mazmorra RPG (Ámbar)</option>
          <option value="cyber_sonar">Ciber Sonar (Violeta)</option>
          <option value="blueprint">Plano Técnico (Azul)</option>
        </select>
      </div>
    </div>
  );
};
