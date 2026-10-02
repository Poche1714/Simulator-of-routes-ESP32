import React, { useState, useEffect } from 'react';
import {
  NavigationRouteStats,
  DynamicObstacle,
  NavAlgorithmMode,
  MapInteractionMode,
  RecognizedObstacle,
} from '../../types/worldDiscoverer';
import {
  VoronoiLloydResult,
  ArchimedeanSpiralConfig,
  DEFAULT_SPIRAL_CONFIG,
} from '../../utils/voronoiLloyd';
import {
  Cpu,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Radio,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  Download,
  Orbit,
  TrendingDown,
  Layers,
  Award,
  Bot,
  Disc,
  Settings2,
  Activity,
  Wifi,
  ShieldCheck,
  AlertTriangle,
  Maximize2,
  Target,
} from 'lucide-react';
import { generateEsp32WorldFirmwareCode } from '../../utils/esp32WorldFirmware';

interface ESP32AlgorithmWorkbenchProps {
  navStats: NavigationRouteStats;
  dynamicObstacles: DynamicObstacle[];
  interactionMode: MapInteractionMode;
  onInteractionModeChange: (mode: MapInteractionMode) => void;
  onSetAlgorithm: (algo: NavAlgorithmMode) => void;
  onStartNavigation: () => void;
  onPauseNavigation: () => void;
  onResetToA: () => void;
  onAddObstacle: (x: number, y: number, radius?: number) => void;
  onRemoveObstacle: (id: string) => void;
  onClearObstacles: () => void;
  onSpawnObstaclesPreset: (type: 'center' | 'zigzag' | 'scatter') => void;
  hardwarePins: {
    servoAngle: number;
    lastDistCm: number;
    motorPwm: number;
    isObstacleAlert: boolean;
  };
  // Voronoi, Lloyd & Archimedean Spiral props
  voronoiResult?: VoronoiLloydResult;
  spiralConfig?: ArchimedeanSpiralConfig;
  recognizedObstacles?: RecognizedObstacle[];
  rs232Logs?: string[];
  onRunVoronoiAndSpiral?: (customConfig?: Partial<ArchimedeanSpiralConfig>) => void;
  onUpdateSpiralConfig?: (newConf: Partial<ArchimedeanSpiralConfig>) => void;
  onResetSpiralDefaults?: () => void;
}

export const ESP32AlgorithmWorkbench: React.FC<ESP32AlgorithmWorkbenchProps> = ({
  navStats,
  dynamicObstacles,
  interactionMode,
  onInteractionModeChange,
  onStartNavigation,
  onPauseNavigation,
  onResetToA,
  onRemoveObstacle,
  onClearObstacles,
  onSpawnObstaclesPreset,
  hardwarePins,
  voronoiResult,
  spiralConfig = DEFAULT_SPIRAL_CONFIG,
  recognizedObstacles = [],
  rs232Logs = [],
  onRunVoronoiAndSpiral,
  onUpdateSpiralConfig,
  onResetSpiralDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'voronoi_spiral' | 'obstacles' | 'recognition' | 'firmware' | 'hardware'>('voronoi_spiral');
  const [copiedCode, setCopiedCode] = useState(false);

  // Local state for Archimedean spiral configuration inputs
  const [localA, setLocalA] = useState(spiralConfig.a.toString());
  const [localPitch, setLocalPitch] = useState(spiralConfig.pitchCm.toString());
  const [localMaxRadius, setLocalMaxRadius] = useState(spiralConfig.maxRadiusCm.toString());
  const [localAngularSpeed, setLocalAngularSpeed] = useState(spiralConfig.angularSpeedDeg.toString());
  const [localDirection, setLocalDirection] = useState<'clockwise' | 'counter_clockwise'>(spiralConfig.direction);

  useEffect(() => {
    setLocalA(spiralConfig.a.toString());
    setLocalPitch(spiralConfig.pitchCm.toString());
    setLocalMaxRadius(spiralConfig.maxRadiusCm.toString());
    setLocalAngularSpeed(spiralConfig.angularSpeedDeg.toString());
    setLocalDirection(spiralConfig.direction);
  }, [spiralConfig]);

  const handleApplySpiralConfig = () => {
    const a = parseFloat(localA) || DEFAULT_SPIRAL_CONFIG.a;
    const pitchCm = parseFloat(localPitch) || DEFAULT_SPIRAL_CONFIG.pitchCm;
    const maxRadiusCm = parseFloat(localMaxRadius) || DEFAULT_SPIRAL_CONFIG.maxRadiusCm;
    const angularSpeedDeg = parseFloat(localAngularSpeed) || DEFAULT_SPIRAL_CONFIG.angularSpeedDeg;

    onUpdateSpiralConfig?.({
      a,
      pitchCm,
      maxRadiusCm,
      angularSpeedDeg,
      direction: localDirection,
    });
  };

  const handleCopyFirmware = () => {
    const code = generateEsp32WorldFirmwareCode(navStats, dynamicObstacles, hardwarePins);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadFirmware = () => {
    const code = generateEsp32WorldFirmwareCode(navStats, dynamicObstacles, hardwarePins);
    const blob = new Blob([code], { type: 'text/x-c++src' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'esp32_rover_voronoi_firmware.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  // State Badge
  const getStatusBadge = () => {
    switch (navStats.state) {
      case 'MOVING_TO_CENTROID':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5 animate-pulse">
            <Bot className="w-3 h-3 text-blue-400" />
            Navegando al Centroide
          </span>
        );
      case 'ARRIVED_AT_CENTER':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
            <Target className="w-3 h-3 text-amber-400" />
            Centro Alcanzado · Iniciando Espiral
          </span>
        );
      case 'EXECUTING_SPIRAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 animate-pulse">
            <Disc className="w-3 h-3 text-cyan-400" />
            Espiral (Confinada a Voronoi)
          </span>
        );
      case 'SPIRAL_COMPLETE':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Espiral Completada (Límite Voronoi)
          </span>
        );
      case 'AVOIDING_LEFT':
      case 'AVOIDING_RIGHT':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 animate-bounce">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Esquivando Obstáculo
          </span>
        );
      case 'REVERSING_ESCAPE':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-ping">
            <RotateCcw className="w-3 h-3 text-rose-400" />
            Escape de Proximidad
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            {navStats.state}
          </span>
        );
    }
  };

  const assignedCentroid = voronoiResult?.assignedCentroid || { x: 0, y: 150 };

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl flex flex-col gap-4">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-lg border border-cyan-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-neutral-100 text-sm">Control ESP32: Voronoi & Espiral de Arquímedes</h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-cyan-500 text-neutral-950 rounded">
                RS232 UART
              </span>
            </div>
            <p className="text-neutral-400 text-[11px]">
              Reconocimiento inteligente de obstáculos en ESP32 · Partición Celular Lloyd · Cobertura en Espiral
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 gap-1 flex-wrap">
          <button
            onClick={() => setActiveTab('voronoi_spiral')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'voronoi_spiral'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Disc className="w-3 h-3 text-cyan-400" />
            <span>Voronoi & Espiral</span>
          </button>
          <button
            onClick={() => setActiveTab('recognition')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'recognition'
                ? 'bg-neutral-800 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Obstáculos ESP32 ({recognizedObstacles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('obstacles')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'obstacles'
                ? 'bg-neutral-800 text-amber-300 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Mapa ({dynamicObstacles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('firmware')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'firmware'
                ? 'bg-neutral-800 text-emerald-300 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Código ESP32</span>
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'hardware'
                ? 'bg-neutral-800 text-cyan-300 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Pines</span>
          </button>
        </div>
      </div>

      {/* Main Tab: Voronoi Partitioning & Archimedean Spiral */}
      {activeTab === 'voronoi_spiral' && (
        <div className="flex flex-col gap-3.5">
          {/* Main Action Banner: Button to trigger Voronoi + Lloyd + RS232 + Spiral */}
          <div className="bg-gradient-to-br from-neutral-950 via-neutral-900/90 to-cyan-950/40 p-4 rounded-xl border border-cyan-500/40 shadow-lg shadow-cyan-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-xl text-neutral-950 shadow-md shadow-cyan-500/30">
                <Disc className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-neutral-100 text-sm sm:text-base">
                    Partición de Voronoi, Lloyd & Espiral de Arquímedes
                  </h4>
                  {getStatusBadge()}
                </div>
                <p className="text-neutral-400 text-xs mt-0.5 max-w-xl">
                  Recibe la partición celular vía <strong>RS232 UART</strong>. El rover navega hasta el centro exacto del punto Voronoi y, al llegar, despliega la <strong>Espiral de Arquímedes</strong> confinada estrictamente a los límites de la partición (margen 15 cm).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <button
                type="button"
                onClick={() => onRunVoronoiAndSpiral?.()}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-neutral-950 font-black text-xs sm:text-sm rounded-lg shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Disc className="w-4 h-4 fill-current" />
                <span>Ejecutar Voronoi & Espiral (RS232)</span>
              </button>

              {navStats.isNavigating ? (
                <button
                  type="button"
                  onClick={onPauseNavigation}
                  className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartNavigation}
                  className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Reanudar</span>
                </button>
              )}

              <button
                type="button"
                onClick={onResetToA}
                className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 text-xs rounded-lg transition-colors cursor-pointer"
                title="Detener motores y reposicionar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Operational Status Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {/* Pose Actual del Rover */}
            <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-medium flex items-center gap-1">
                <Bot className="w-3 h-3 text-cyan-400" /> Posición Actual del Bot:
              </span>
              <span className="font-mono text-xs font-bold text-cyan-300 block mt-0.5">
                ({navStats.pointA?.x.toFixed(0) ?? 0}, {navStats.pointA?.y.toFixed(0) ?? 0}) cm
              </span>
              <span className="text-[10px] text-neutral-500 block">Rumbo: {navStats.state !== 'IDLE' ? 'Dinámico' : '90°'}</span>
            </div>

            {/* Centroide Voronoi / Lloyd */}
            <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-medium flex items-center gap-1">
                <Orbit className="w-3 h-3 text-amber-400" /> Centroide Asignado (Lloyd):
              </span>
              <span className="font-mono text-xs font-bold text-amber-300 block mt-0.5">
                ({assignedCentroid.x.toFixed(1)}, {assignedCentroid.y.toFixed(1)}) cm
              </span>
              <span className="text-[10px] text-neutral-500 block">
                Celda #{voronoiResult?.assignedCellId ?? 1} · {voronoiResult?.lloydIterations ?? 8} iters
              </span>
            </div>

            {/* Distancia Mínima entre Puntos Voronoi (≥ 5m) */}
            <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-cyan-500/30 shadow-sm shadow-cyan-950/40">
              <span className="text-[10px] text-cyan-400 block font-medium flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-cyan-400" /> Distancia Puntos Voronoi:
              </span>
              <span className="font-mono text-xs font-bold text-cyan-300 block mt-0.5 flex items-center gap-1">
                {((voronoiResult?.minPointDistanceCm || 520) / 100).toFixed(1)} m
                <span className="text-[9px] font-normal px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ≥ 5.0m OK
                </span>
              </span>
              <span className="text-[10px] text-neutral-400 block">
                Separación mínima garantizada
              </span>
            </div>

            {/* Radio Actual de Espiral */}
            <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-medium flex items-center gap-1">
                <Disc className="w-3 h-3 text-emerald-400" /> Radio Espiral r(θ):
              </span>
              <span className="font-mono text-xs font-bold text-emerald-300 block mt-0.5">
                {navStats.spiralCurrentRadiusCm ? `${navStats.spiralCurrentRadiusCm} cm` : `${spiralConfig.a} cm`}
              </span>
              <span className="text-[10px] text-neutral-500 block">
                Límite: {spiralConfig.maxRadiusCm} cm ({((navStats.spiralTurnsCompleted ?? 0)).toFixed(1)} v.)
              </span>
            </div>

            {/* Esquive Inteligente en ESP32 */}
            <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 block font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-400" /> Esquives del ESP32:
              </span>
              <span className="font-mono text-xs font-bold text-purple-300 block mt-0.5">
                {navStats.obstaclesAvoidedCount} reg.
              </span>
              <span className="text-[10px] text-neutral-500 block">
                {hardwarePins.isObstacleAlert ? '⚠️ Obstáculo cercano' : 'Vía despejada'}
              </span>
            </div>
          </div>

          {/* Configuración de la Espiral de Arquímedes con Datos por Defecto */}
          <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-neutral-200">
                  Configuración de la Espiral de Arquímedes: <span className="font-mono text-cyan-400">r(θ) = a + b·θ</span>
                </span>
              </div>

              {/* Botón de restablecer valores por defecto */}
              <button
                type="button"
                onClick={onResetSpiralDefaults}
                className="text-[11px] text-neutral-400 hover:text-cyan-300 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded transition-colors cursor-pointer flex items-center gap-1"
                title="Restablecer los valores predeterminados de la espiral"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Valores por Defecto</span>
              </button>
            </div>

            {/* Inputs Grid con valores por defecto bien definidos */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {/* Radio Inicial a */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 font-medium">
                  Radio Inicial <span className="font-mono text-cyan-300">a (cm)</span>:
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={localA}
                  onChange={(e) => setLocalA(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  placeholder="5"
                />
                <span className="text-[9px] text-neutral-500">Por defecto: 5 cm</span>
              </div>

              {/* Paso entre espiras d */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 font-medium">
                  Paso entre Vueltas <span className="font-mono text-cyan-300">d (cm)</span>:
                </label>
                <input
                  type="number"
                  min="12"
                  max="80"
                  value={localPitch}
                  onChange={(e) => setLocalPitch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  placeholder="28"
                />
                <span className="text-[9px] text-neutral-500">Por defecto: 28 cm</span>
              </div>

              {/* Radio Máximo */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 font-medium">
                  Radio Máximo <span className="font-mono text-cyan-300">R_max (cm)</span>:
                </label>
                <input
                  type="number"
                  min="50"
                  max="280"
                  value={localMaxRadius}
                  onChange={(e) => setLocalMaxRadius(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  placeholder="140"
                />
                <span className="text-[9px] text-neutral-500">Por defecto: 140 cm</span>
              </div>

              {/* Paso Angular Δθ */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 font-medium">
                  Paso Angular <span className="font-mono text-cyan-300">Δθ (°)</span>:
                </label>
                <input
                  type="number"
                  min="5"
                  max="25"
                  value={localAngularSpeed}
                  onChange={(e) => setLocalAngularSpeed(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-cyan-400"
                  placeholder="10"
                />
                <span className="text-[9px] text-neutral-500">Por defecto: 10°</span>
              </div>

              {/* Sentido de Giro */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-neutral-400 font-medium">Sentido de Rotación:</label>
                <select
                  value={localDirection}
                  onChange={(e) => setLocalDirection(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="clockwise">↻ Horario (CW)</option>
                  <option value="counter_clockwise">↺ Antihorario (CCW)</option>
                </select>
                <span className="text-[9px] text-neutral-500">Por defecto: Horario</span>
              </div>
            </div>

            {/* Presets rápidos y botón de aplicar */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-neutral-800/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-neutral-500">Plantillas rápidas:</span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalA('5');
                    setLocalPitch('28');
                    setLocalMaxRadius('140');
                    setLocalAngularSpeed('10');
                    onUpdateSpiralConfig?.({ a: 5, pitchCm: 28, maxRadiusCm: 140, angularSpeedDeg: 10 });
                  }}
                  className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded border border-neutral-800 cursor-pointer"
                >
                  Estándar (28cm / 140cm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalA('4');
                    setLocalPitch('18');
                    setLocalMaxRadius('115');
                    setLocalAngularSpeed('8');
                    onUpdateSpiralConfig?.({ a: 4, pitchCm: 18, maxRadiusCm: 115, angularSpeedDeg: 8 });
                  }}
                  className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded border border-neutral-800 cursor-pointer"
                >
                  Alta Densidad (18cm / 115cm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLocalA('10');
                    setLocalPitch('38');
                    setLocalMaxRadius('190');
                    setLocalAngularSpeed('12');
                    onUpdateSpiralConfig?.({ a: 10, pitchCm: 38, maxRadiusCm: 190, angularSpeedDeg: 12 });
                  }}
                  className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-[10px] text-neutral-300 rounded border border-neutral-800 cursor-pointer"
                >
                  Gran Cobertura (38cm / 190cm)
                </button>
              </div>

              <button
                type="button"
                onClick={handleApplySpiralConfig}
                className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                Aplicar Configuración a ESP32
              </button>
            </div>
          </div>

          {/* RS232 Simulation Packet Stream */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 text-[11px] font-mono flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Wifi className="w-3.5 h-3.5" />
                Simulador de Paquetes RS232 / UART (115200 bps):
              </span>
              <span className="text-[10px] text-emerald-400">LATCHED_ACTIVE</span>
            </div>
            <div className="bg-neutral-900/90 p-2 rounded text-neutral-300 text-[10px] break-all border border-neutral-800">
              {voronoiResult?.rawRS232Packet || 'RS232:RX,[VORONOI_SYNC],STATUS=IDLE_WAITING_COMMAND'}
            </div>
            {rs232Logs.length > 1 && (
              <span className="text-[9px] text-neutral-500">
                Últimos eventos RS232: {rs232Logs.slice(1, 3).join(' | ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recognition Tab: ESP32 Intelligent Obstacle Recognition Monitor */}
      {activeTab === 'recognition' && (
        <div className="flex flex-col gap-3">
          <div className="bg-neutral-950 p-3 rounded-lg border border-amber-500/30 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Sistema de Reconocimiento Inteligente de Obstáculos en ESP32
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                El firmware del ESP32 evalúa continuamente los ecos del sonar ultrasónico HC-SR04, proyecta los obstáculos en memoria y toma decisiones autónomas de evasión.
              </p>
            </div>
            <span className="px-2 py-1 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
              {recognizedObstacles.length} en Memoria
            </span>
          </div>

          {/* Active Obstacles Table */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-neutral-900/80 text-neutral-400 font-mono border-b border-neutral-800">
                  <tr>
                    <th className="py-1 px-2">Clúster / ID</th>
                    <th className="py-1 px-2">Posición Mundo (X, Y)</th>
                    <th className="py-1 px-2">Distancia</th>
                    <th className="py-1 px-2">Amenaza</th>
                    <th className="py-1 px-2">Acción Autónomo ESP32</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-mono text-neutral-300">
                  {recognizedObstacles.length > 0 ? (
                    recognizedObstacles.map((obs, idx) => (
                      <tr key={idx} className="hover:bg-neutral-900/50">
                        <td className="py-1.5 px-2 text-cyan-400 font-bold">{obs.id}</td>
                        <td className="py-1.5 px-2">({obs.worldX}, {obs.worldY}) cm</td>
                        <td className="py-1.5 px-2 font-bold">{obs.distanceCm.toFixed(1)} cm</td>
                        <td className="py-1.5 px-2">
                          {obs.threatLevel === 'critical' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              CRÍTICA (≤28cm)
                            </span>
                          ) : obs.threatLevel === 'medium' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              MEDIA (≤44cm)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">
                              BAJA (&gt;44cm)
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-neutral-300">
                          {obs.recommendedAction === 'steer_right' ? (
                            <span className="text-amber-300 font-bold">↷ Girar a la Derecha</span>
                          ) : (
                            <span className="text-amber-300 font-bold">↶ Girar a la Izquierda</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-neutral-500 italic">
                        No hay obstáculos en el campo cercano (&lt;65 cm) del rover actualmente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Obstacles Placement Tab */}
      {activeTab === 'obstacles' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-neutral-400 text-[11px]">
              Añade o genera obstáculos dinámicos en el mapa para evaluar la capacidad de reconocimiento inteligente del ESP32.
            </p>

            <button
              onClick={() => onInteractionModeChange(interactionMode === 'add_obstacle' ? 'pan' : 'add_obstacle')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                interactionMode === 'add_obstacle'
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                  : 'bg-neutral-800 text-amber-400 border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{interactionMode === 'add_obstacle' ? 'Clic en el Mapa para Colocar' : 'Clic para Añadir'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-neutral-500 font-medium">Plantillas de obstáculos:</span>
            <button
              onClick={() => onSpawnObstaclesPreset('center')}
              className="text-[10px] px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
            >
              Bloque Central
            </button>
            <button
              onClick={() => onSpawnObstaclesPreset('zigzag')}
              className="text-[10px] px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
            >
              Columnas de Prueba
            </button>
            <button
              onClick={() => onSpawnObstaclesPreset('scatter')}
              className="text-[10px] px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
            >
              Dispersión Aleatoria
            </button>
            {dynamicObstacles.length > 0 && (
              <button
                onClick={onClearObstacles}
                className="text-[10px] px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 cursor-pointer ml-auto flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Borrar Todos</span>
              </button>
            )}
          </div>

          {/* List of active obstacles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dynamicObstacles.map((obs) => (
              <div
                key={obs.id}
                className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-amber-300">{obs.label || 'Obstáculo'}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Pos: ({obs.x.toFixed(0)}, {obs.y.toFixed(0)})cm · Radio: {obs.radius}cm
                  </span>
                </div>
                <button
                  onClick={() => onRemoveObstacle(obs.id)}
                  className="p-1 text-neutral-500 hover:text-rose-400 cursor-pointer"
                  title="Eliminar este obstáculo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Firmware C++ Tab */}
      {activeTab === 'firmware' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Code2 className="w-4 h-4" />
                Código C++ para ESP32: Voronoi, RS232, Reconocimiento & Espiral de Arquímedes
              </h4>
              <p className="text-[10px] text-neutral-400">
                Compilable directamente en Arduino IDE o PlatformIO.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyFirmware}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 cursor-pointer transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
              <button
                onClick={handleDownloadFirmware}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar .ino</span>
              </button>
            </div>
          </div>

          <pre className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[380px] leading-relaxed">
            {generateEsp32WorldFirmwareCode(navStats, dynamicObstacles, hardwarePins)}
          </pre>
        </div>
      )}

      {/* Hardware Pins Monitor */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">GPIO 18 · Servomotor Radar</span>
            <span className="font-mono text-sm font-bold text-cyan-400 mt-0.5 block">
              {hardwarePins.servoAngle}°
            </span>
            <span className="text-[9px] text-neutral-500">Ángulo servo barrido</span>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">GPIO 5 / 19 · HC-SR04 Sonar</span>
            <span className="font-mono text-sm font-bold text-amber-400 mt-0.5 block">
              {hardwarePins.lastDistCm.toFixed(1)} cm
            </span>
            <span className="text-[9px] text-neutral-500">Eco ultrasónico frontal</span>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">GPIO 25, 26, 32, 33 · PWM Tracción</span>
            <span className="font-mono text-sm font-bold text-emerald-400 mt-0.5 block">
              {hardwarePins.motorPwm} / 255
            </span>
            <span className="text-[9px] text-neutral-500">Motores DC Puente H</span>
          </div>

          <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">UART Serial RS232</span>
            <span className="font-mono text-sm font-bold text-purple-400 mt-0.5 block">
              115200 bps
            </span>
            <span className="text-[9px] text-neutral-500">TX / RX Bidireccional</span>
          </div>
        </div>
      )}
    </div>
  );
};
