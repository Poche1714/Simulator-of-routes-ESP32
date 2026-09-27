import React, { useState, useEffect } from 'react';
import {
  DynamicObstacle,
  NavAlgorithmMode,
  MapInteractionMode,
  NavigationRouteStats,
} from '../../types/worldDiscoverer';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Cpu,
  Target,
  Flag,
  ShieldAlert,
  Zap,
  Sparkles,
  Compass,
  ArrowRight,
  Sliders,
  Radio,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { generateEsp32WorldFirmwareCode } from '../../utils/esp32WorldFirmware';

interface ESP32AlgorithmWorkbenchProps {
  navStats: NavigationRouteStats;
  dynamicObstacles: DynamicObstacle[];
  interactionMode: MapInteractionMode;
  onInteractionModeChange: (mode: MapInteractionMode) => void;
  onSetPointA: (x: number, y: number) => void;
  onSetPointB: (x: number, y: number) => void;
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
}

export const ESP32AlgorithmWorkbench: React.FC<ESP32AlgorithmWorkbenchProps> = ({
  navStats,
  dynamicObstacles,
  interactionMode,
  onInteractionModeChange,
  onSetPointA,
  onSetPointB,
  onSetAlgorithm,
  onStartNavigation,
  onPauseNavigation,
  onResetToA,
  onRemoveObstacle,
  onClearObstacles,
  onSpawnObstaclesPreset,
  hardwarePins,
}) => {
  const [inputBx, setInputBx] = useState(navStats.pointB.x.toString());
  const [inputBy, setInputBy] = useState(navStats.pointB.y.toString());
  const [activeTab, setActiveTab] = useState<'control' | 'obstacles' | 'firmware' | 'hardware'>('control');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setInputBx(navStats.pointB.x.toString());
    setInputBy(navStats.pointB.y.toString());
  }, [navStats.pointB.x, navStats.pointB.y]);

  const handleApplyPointB = () => {
    const bx = parseFloat(inputBx);
    const by = parseFloat(inputBy);
    if (!isNaN(bx) && !isNaN(by)) onSetPointB(bx, by);
  };

  const getStatusBadge = () => {
    switch (navStats.state) {
      case 'GOAL_REACHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> Meta Alcanzada
          </span>
        );
      case 'PROBING_WIDE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-500/25 text-purple-300 border border-purple-500/50 animate-pulse">
            <Radio className="w-3 h-3 text-purple-400" /> Sonda Ampliada (±65°)
          </span>
        );
      case 'REVERSING_ESCAPE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 animate-bounce">
            <RotateCcw className="w-3 h-3 text-rose-400" /> Encerrado · Marcha Atrás
          </span>
        );
      case 'AVOIDING_RIGHT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> Esquive por Derecha (Preferente)
          </span>
        );
      case 'AVOIDING_LEFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse">
            <ShieldAlert className="w-3 h-3" /> Esquive por Izquierda (Alternativo)
          </span>
        );
      case 'ORIENTING':
      case 'REJOINING_GOAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Compass className="w-3 h-3" /> Realineando Rumbo a B
          </span>
        );
      case 'CRUISING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <ArrowRight className="w-3 h-3" /> En Ruta Directa a B
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            En Espera (Listo)
          </span>
        );
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4 text-xs font-sans shadow-lg">
      {/* Header with Title and Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-neutral-100 text-sm">Simulador de Código ESP32</h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-amber-500 text-neutral-950 rounded">
                v2.0.0
              </span>
            </div>
            <p className="text-neutral-400 text-[11px]">
              Navegación Autónoma A ➔ B · Sonda Ampliada · Prioridad Derecha & Escape
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 gap-1">
          <button
            onClick={() => setActiveTab('control')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'control'
                ? 'bg-neutral-800 text-amber-300 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Algoritmo & Ruta
          </button>
          <button
            onClick={() => setActiveTab('obstacles')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'obstacles'
                ? 'bg-neutral-800 text-amber-300 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Obstáculos ({dynamicObstacles.length})</span>
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

      {/* Main Tab Content */}
      {activeTab === 'control' && (
        <div className="flex flex-col gap-3">
          {/* Coordinates Row: Point A (Bot Position) & Point B (Free Destination) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Point A - Siempre es la posición actual del bot */}
            <div className="flex flex-col gap-2 bg-neutral-950/70 p-3 rounded-lg border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                  <Flag className="w-3.5 h-3.5 text-emerald-400" /> Punto A (Posición del Bot)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tiempo Real (Bot)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-0.5">
                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">X Origen (cm):</span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    {navStats.pointA.x.toFixed(1)}
                  </span>
                </div>
                <div className="bg-neutral-900/90 p-2 rounded border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block">Y Origen (cm):</span>
                  <span className="font-mono text-sm font-bold text-emerald-300">
                    {navStats.pointA.y.toFixed(1)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 italic leading-tight">
                El Punto A se actualiza automáticamente con la ubicación del bot como punto de partida de la ruta.
              </p>
            </div>

            {/* Point B - Definición Libre por el Usuario */}
            <div className="flex flex-col gap-2 bg-neutral-950/70 p-3 rounded-lg border border-amber-500/40 shadow-sm shadow-amber-500/5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
                  <Target className="w-3.5 h-3.5 text-amber-400" /> Punto B (Destino Libre)
                </span>
                <button
                  type="button"
                  onClick={() => onInteractionModeChange(interactionMode === 'set_b' ? 'pan' : 'set_b')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    interactionMode === 'set_b'
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow-md shadow-amber-500/30 animate-pulse'
                      : 'bg-neutral-900 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                  }`}
                  title="Haz clic en cualquier parte del mapa para fijar el Punto B"
                >
                  <Target className="w-3 h-3" />
                  <span>{interactionMode === 'set_b' ? 'Hacer Clic en Mapa...' : 'Clic en Mapa para fijar B'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-0.5">
                <div>
                  <label className="text-[10px] text-neutral-400 block font-medium">X Destino (cm):</label>
                  <input
                    type="number"
                    value={inputBx}
                    onChange={(e) => setInputBx(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1 text-neutral-100 font-mono focus:border-amber-400 outline-none text-xs"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 block font-medium">Y Destino (cm):</label>
                  <input
                    type="number"
                    value={inputBy}
                    onChange={(e) => setInputBy(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded px-2.5 py-1 text-neutral-100 font-mono focus:border-amber-400 outline-none text-xs"
                    placeholder="260"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                <span className="text-[10px] text-neutral-400 font-mono">
                  Distancia al Bot: <strong className="text-amber-300">{(navStats.distanceToGoalCm / 100).toFixed(2)} m</strong>
                </span>
                <button
                  type="button"
                  onClick={handleApplyPointB}
                  className="text-[11px] text-amber-300 hover:text-white px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded transition-colors cursor-pointer font-semibold"
                >
                  Aplicar Destino B
                </button>
              </div>
            </div>
          </div>

          {/* Quick presets for Point B */}
          <div className="flex items-center gap-1.5 flex-wrap px-1">
            <span className="text-[10px] text-neutral-500 font-medium">Destinos rápidos para B:</span>
            <button
              type="button"
              onClick={() => {
                const nx = Number(navStats.pointA.x.toFixed(1));
                const ny = Number((navStats.pointA.y + 200).toFixed(1));
                setInputBx(nx.toString());
                setInputBy(ny.toString());
                onSetPointB(nx, ny);
              }}
              className="text-[10px] px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded transition-colors cursor-pointer"
            >
              +2.0m Frente
            </button>
            <button
              type="button"
              onClick={() => {
                const nx = Number((navStats.pointA.x + 100).toFixed(1));
                const ny = Number((navStats.pointA.y + 220).toFixed(1));
                setInputBx(nx.toString());
                setInputBy(ny.toString());
                onSetPointB(nx, ny);
              }}
              className="text-[10px] px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded transition-colors cursor-pointer"
            >
              Noreste (+1.0m, +2.2m)
            </button>
            <button
              type="button"
              onClick={() => {
                const nx = Number((navStats.pointA.x - 100).toFixed(1));
                const ny = Number((navStats.pointA.y + 220).toFixed(1));
                setInputBx(nx.toString());
                setInputBy(ny.toString());
                onSetPointB(nx, ny);
              }}
              className="text-[10px] px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded transition-colors cursor-pointer"
            >
              Noroeste (-1.0m, +2.2m)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputBx('0');
                setInputBy('340');
                onSetPointB(0, 340);
              }}
              className="text-[10px] px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded transition-colors cursor-pointer"
            >
              Corredor Norte (0, 340)
            </button>
          </div>

          {/* Algorithm Mode Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-neutral-400 font-semibold text-[11px] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Algoritmo de Esquive y Optimización en ESP32:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => onSetAlgorithm('tangent_bug')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  navStats.algorithm === 'tangent_bug'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Tangente Óptima (Bug)</span>
                  {navStats.algorithm === 'tangent_bug' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Evalúa sectores y contornea el obstáculo por el lado que minimiza el desvío a B.
                </p>
              </button>

              <button
                onClick={() => onSetAlgorithm('reactive_sonar')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  navStats.algorithm === 'reactive_sonar'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Sonar Reactivo Adaptativo</span>
                  {navStats.algorithm === 'reactive_sonar' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Reduce rango a ±10° ante obstáculo (≤40cm) y vira hacia el sector con mayor holgura.
                </p>
              </button>

              <button
                onClick={() => onSetAlgorithm('potential_field')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  navStats.algorithm === 'potential_field'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-200 shadow-sm'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Campos de Potencial</span>
                  {navStats.algorithm === 'potential_field' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Fuerza repulsiva del obstáculo combinada con atracción constante hacia la meta B.
                </p>
              </button>
            </div>
          </div>

          {/* Firmware Rules Specification Card */}
          <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800 text-[11px] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Reglas del Firmware ESP32 (Emulación y Código Físico):
              </span>
              <button
                onClick={() => setActiveTab('firmware')}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Code2 className="w-3 h-3" />
                <span>Ver Código C++ Generado</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-neutral-900/80 p-2 rounded border border-purple-500/30">
                <span className="font-bold text-purple-300 block mb-0.5">1. Sonda Ampliada</span>
                <p className="text-neutral-400 text-[10px] leading-tight">
                  Antes de alcanzar el obstáculo (≤46cm), detiene la marcha y amplía el barrido a ±65° (25°-155°) para mapear todas las posibles rutas.
                </p>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded border border-amber-500/30">
                <span className="font-bold text-amber-300 block mb-0.5">2. Prioridad Derecha</span>
                <p className="text-neutral-400 text-[10px] leading-tight">
                  Esquiva siempre por la DERECHA si está despejada (≥42cm). Si la derecha está bloqueada, esquiva por la IZQUIERDA.
                </p>
              </div>
              <div className="bg-neutral-900/80 p-2 rounded border border-rose-500/30">
                <span className="font-bold text-rose-300 block mb-0.5">3. Escape Marcha Atrás</span>
                <p className="text-neutral-400 text-[10px] leading-tight">
                  Si se encuentra encerrado sin salida por ambos lados, da marcha atrás para validar y despejar una nueva ruta hacia B.
                </p>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800">
            <button
              onClick={navStats.isNavigating ? onPauseNavigation : onStartNavigation}
              className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold transition-all cursor-pointer ${
                navStats.isNavigating
                  ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
              }`}
            >
              {navStats.isNavigating ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pausar Navegación ESP32</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Iniciar Exploración Autónoma ESP32</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('firmware')}
              className="flex items-center gap-1.5 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-emerald-300 rounded-lg font-medium border border-neutral-700 transition-colors cursor-pointer"
              title="Ver el código C++ generado para ESP32"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código C++</span>
            </button>

            <button
              onClick={onResetToA}
              className="flex items-center gap-1.5 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium border border-neutral-700 transition-colors cursor-pointer"
              title="Reposicionar el rover en el Punto A"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Reiniciar en A</span>
            </button>
          </div>

          {/* Real-time Navigation Telemetry Card */}
          <div className="bg-neutral-950 border border-neutral-800/90 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Estado ESP32</span>
              <div className="mt-1">{getStatusBadge()}</div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Distancia Restante a B</span>
              <span className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                {navStats.distanceToGoalCm.toFixed(1)} cm
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Recorrido Total (Odometría)</span>
              <span className="text-sm font-bold font-mono text-neutral-200 mt-0.5">
                {navStats.actualDistanceTraveledCm.toFixed(1)} cm
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Eficiencia vs Recta</span>
              <span
                className={`text-sm font-bold font-mono mt-0.5 ${
                  navStats.efficiencyPercentage >= 85
                    ? 'text-emerald-400'
                    : navStats.efficiencyPercentage >= 65
                    ? 'text-amber-400'
                    : 'text-orange-400'
                }`}
              >
                {navStats.efficiencyPercentage > 0 ? `${navStats.efficiencyPercentage.toFixed(0)}%` : '100%'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Obstacles Tab */}
      {activeTab === 'obstacles' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-neutral-400 text-[11px]">
              Añade obstáculos dinámicos en el mapa para probar la capacidad del ESP32 de detectarlos y esquivarlos en tiempo real.
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
              <span>{interactionMode === 'add_obstacle' ? 'Haz Clic en el Mapa para Colocar' : 'Clic para Añadir'}</span>
            </button>
          </div>

          {/* Quick Presets Generator */}
          <div className="flex flex-wrap items-center gap-2 bg-neutral-950 p-2 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 text-[11px] font-medium">Escenarios Rápidos:</span>
            <button
              onClick={() => onSpawnObstaclesPreset('center')}
              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-200 transition-colors cursor-pointer"
            >
              Bloque Central Directo
            </button>
            <button
              onClick={() => onSpawnObstaclesPreset('zigzag')}
              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-200 transition-colors cursor-pointer"
            >
              Laberinto Zigzag
            </button>
            <button
              onClick={() => onSpawnObstaclesPreset('scatter')}
              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-200 transition-colors cursor-pointer"
            >
              Campo Disperso (4 Rocas)
            </button>
            {dynamicObstacles.length > 0 && (
              <button
                onClick={onClearObstacles}
                className="px-2 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 rounded text-red-300 ml-auto transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Borrar Todos</span>
              </button>
            )}
          </div>

          {/* List of active obstacles */}
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
            {dynamicObstacles.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                No hay obstáculos dinámicos en el mapa. El bot tendrá vía libre directa hacia B.
              </div>
            ) : (
              dynamicObstacles.map((obs, idx) => (
                <div
                  key={obs.id}
                  className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-neutral-200">
                      {obs.label || `Obstáculo #${idx + 1}`}
                    </span>
                    <span className="font-mono text-neutral-400">
                      (X: {obs.x.toFixed(0)}, Y: {obs.y.toFixed(0)}) · Radio: {obs.radius}cm
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveObstacle(obs.id)}
                    className="p-1 hover:text-red-400 text-neutral-500 transition-colors cursor-pointer"
                    title="Eliminar este obstáculo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dynamic C++ ESP32 Firmware Tab */}
      {activeTab === 'firmware' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
            <div>
              <span className="font-bold text-neutral-200 text-xs flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                Firmware C++ ESP32 (Arduino / PlatformIO)
              </span>
              <p className="text-[11px] text-neutral-400">
                Código compilable con parámetros automáticos para Punto A ({navStats.pointA.x.toFixed(0)}, {navStats.pointA.y.toFixed(0)}) ➔ Punto B ({navStats.pointB.x.toFixed(0)}, {navStats.pointB.y.toFixed(0)}).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const code = generateEsp32WorldFirmwareCode({
                    pointAx: navStats.pointA.x,
                    pointAy: navStats.pointA.y,
                    pointBx: navStats.pointB.x,
                    pointBy: navStats.pointB.y,
                    motorPwm: hardwarePins.motorPwm || 185,
                  });
                  navigator.clipboard.writeText(code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer text-xs font-medium"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>

              <button
                onClick={() => {
                  const code = generateEsp32WorldFirmwareCode({
                    pointAx: navStats.pointA.x,
                    pointAy: navStats.pointA.y,
                    pointBx: navStats.pointB.x,
                    pointBy: navStats.pointB.y,
                    motorPwm: hardwarePins.motorPwm || 185,
                  });
                  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'ESP32_A_to_B_Autonomous_Navigator.ino';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors cursor-pointer text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar .ino</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-[10px] font-mono text-emerald-300 max-h-64 overflow-y-auto leading-relaxed select-all">
              {generateEsp32WorldFirmwareCode({
                pointAx: navStats.pointA.x,
                pointAy: navStats.pointA.y,
                pointBx: navStats.pointB.x,
                pointBy: navStats.pointB.y,
                motorPwm: hardwarePins.motorPwm || 185,
              })}
            </pre>
          </div>
        </div>
      )}

      {/* Hardware Virtual Pins Tab */}
      {activeTab === 'hardware' && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block">GPIO 18 (SERVO PWM)</span>
              <span className="text-sm font-mono font-bold text-amber-400 mt-1 block">
                {hardwarePins.servoAngle}°
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Periodo 50Hz (500-2400µs)
              </span>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block">GPIO 5 & 19 (TRIG/ECHO)</span>
              <span className="text-sm font-mono font-bold text-cyan-400 mt-1 block">
                {hardwarePins.lastDistCm.toFixed(1)} cm
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                {hardwarePins.lastDistCm <= 40 ? 'OBSTÁCULO DETECTADO' : 'CAMINO DESPEJADO'}
              </span>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block">GPIO 25/26/32/33 (MOTORES)</span>
              <span className="text-sm font-mono font-bold text-emerald-400 mt-1 block">
                PWM {hardwarePins.motorPwm}
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Puente H Calibrado (175-198)
              </span>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-500 block">CPU Virtual ESP32</span>
              <span className="text-sm font-mono font-bold text-neutral-200 mt-1 block">
                240 MHz · 40Hz
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5 block">
                Loop Time: ~2.4ms (Bajo consumo)
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 leading-relaxed">
            <span className="text-amber-400 font-bold block mb-1">
              Emulación en Tiempo Real de Instrucciones Seriales UART:
            </span>
            El emulador interno de ESP32 procesa en bucle cerrado los comandos <code className="text-neutral-300 font-mono">SET_A</code>, <code className="text-neutral-300 font-mono">SET_B</code>, <code className="text-neutral-300 font-mono">NAV_TO_B</code> y emite telemetría exacta <code className="text-neutral-300 font-mono">PING:ángulo,dist</code>, <code className="text-neutral-300 font-mono">ALERT:OBSTACLE_REDUCED_SPAN</code> y <code className="text-neutral-300 font-mono">POS:x,y,rumbo</code> idéntica a la que recibirías por el puerto USB serial físico de tu placa ESP32.
          </div>
        </div>
      )}
    </div>
  );
};
