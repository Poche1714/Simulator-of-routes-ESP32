import { BotPose, TrajectoryPoint, Waypoint, RoverSweepState } from '../../types/worldDiscoverer';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Bot,
  MapPin,
  RotateCcw,
  Sparkles,
  Zap,
  Gauge,
  Sliders,
  Play,
  RotateCw,
  AlertOctagon,
} from 'lucide-react';

interface BotNavigationCardProps {
  botPose: BotPose;
  trajectory: TrajectoryPoint[];
  waypoints: Waypoint[];
  roverState?: RoverSweepState;
  isAutonomous: boolean;
  onToggleAutonomous: () => void;
  onDriveForward: (distCm?: number, customPwm?: number) => void;
  onDriveBackward: (distCm?: number, customPwm?: number) => void;
  onTurnLeft: (deg?: number, customPwm?: number) => void;
  onTurnRight: (deg?: number, customPwm?: number) => void;
  onStopBot: () => void;
  onAddWaypoint: () => void;
  onResetRoute: () => void;
  motorPwm?: number;
  onSetMotorPwm?: (pwm: number) => void;
  disabled?: boolean;
}

export const BotNavigationCard: React.FC<BotNavigationCardProps> = ({
  botPose,
  trajectory,
  waypoints,
  roverState,
  isAutonomous,
  onToggleAutonomous,
  onDriveForward,
  onDriveBackward,
  onTurnLeft,
  onTurnRight,
  onStopBot,
  onAddWaypoint,
  onResetRoute,
  motorPwm = 185,
  onSetMotorPwm,
  disabled = false,
}) => {
  // Calibrated PWM preset options between 175 and 198
  const pwmPresets = [
    { label: '175', note: 'Mínimo', pwm: 175 },
    { label: '180', note: 'Suave', pwm: 180 },
    { label: '185', note: 'Equilibrado', pwm: 185 },
    { label: '190', note: 'Crucero', pwm: 190 },
    { label: '195', note: 'Ágil', pwm: 195 },
    { label: '198', note: 'Máx', pwm: 198 },
  ];

  const handlePwmSelect = (value: number) => {
    if (onSetMotorPwm) {
      onSetMotorPwm(value);
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-neutral-100">
            Conducción & Motores PWM (175 - 198)
          </h3>
        </div>
        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
            isAutonomous
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
              : botPose.isMoving
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
          }`}
        >
          {isAutonomous ? 'Navegación Autónoma' : botPose.isMoving ? 'En Movimiento' : 'Listo'}
        </span>
      </div>

      {/* Trajectory Metrics Quick Bar */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 text-center font-mono">
        <div>
          <span className="text-[10px] text-neutral-500 block">DISTANCIA</span>
          <span className="text-emerald-400 font-bold text-sm">
            {(botPose.totalDistanceCm / 100).toFixed(2)} m
          </span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-500 block">RUMBO / POS</span>
          <span className="text-cyan-400 font-bold text-sm">
            {Math.round(botPose.heading)}°
          </span>
        </div>
        <div>
          <span className="text-[10px] text-neutral-500 block">PUNTOS RUTA</span>
          <span className="text-amber-400 font-bold text-sm">
            {trajectory.length}
          </span>
        </div>
      </div>

      {/* Motor PWM Selector (175 - 198) */}
      <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-neutral-200">
              Potencia Motores (PWM 175 a 198)
            </span>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
            PWM: {motorPwm}
          </span>
        </div>

        {/* Preset Buttons for PWM 175 - 198 */}
        <div className="grid grid-cols-6 gap-1">
          {pwmPresets.map((preset) => {
            const isSelected = motorPwm === preset.pwm;
            return (
              <button
                key={preset.pwm}
                type="button"
                onClick={() => handlePwmSelect(preset.pwm)}
                disabled={disabled}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                }`}
                title={`Configurar PWM a ${preset.pwm} (${preset.note})`}
              >
                <span className="text-[11px] font-mono leading-tight">{preset.label}</span>
                <span className="text-[9px] opacity-75 leading-tight">{preset.note}</span>
              </button>
            );
          })}
        </div>

        {/* Slider for Fine-Tuning PWM between 175 and 198 */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] font-mono text-neutral-500">175</span>
          <input
            type="range"
            min="175"
            max="198"
            step="1"
            value={motorPwm}
            onChange={(e) => handlePwmSelect(parseInt(e.target.value, 10))}
            disabled={disabled}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <span className="text-[10px] font-mono text-neutral-500">198</span>
        </div>
      </div>

      {/* Autonomous Navigation Toggle Button */}
      <button
        onClick={onToggleAutonomous}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          isAutonomous
            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
            : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/80'
        }`}
      >
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span>
          {isAutonomous ? 'Detener Exploración Autónoma' : 'Activar Exploración Autónoma (Auto-Mapeo)'}
        </span>
      </button>

      {/* Obstacle Alert & Range Reduction Banner */}
      {roverState && (roverState.isObstacleDetected || roverState.scanMode === 'obstacle_reduced_sweep') && (
        <div className="bg-amber-950/70 border border-amber-500/60 rounded-lg p-2.5 flex items-start gap-2.5 text-amber-200 shadow-md">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-amber-300 text-xs">
              ¡Obstáculo a {roverState.currentDistanceCm.toFixed(1)} cm! Rango reducido a ±10° (0 a 10° y 0 a -10°)
            </span>
            <span className="text-[11px] text-amber-200/90 leading-tight">
              Muestreo continuo activo. Al girar el bot con <strong>IZQ</strong> o <strong>DER</strong> volverá automáticamente al rango normal (0 a 30° y 0 a -30°).
            </span>
          </div>
        </div>
      )}

      {/* D-Pad Virtual Steering Controls with Active PWM */}
      <div className="flex flex-col items-center gap-2 py-1">
        {/* Forward */}
        <button
          onClick={() => onDriveForward(20, motorPwm)}
          disabled={disabled || isAutonomous}
          className="w-16 h-12 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 text-neutral-200 active:text-white rounded-lg flex flex-col items-center justify-center transition-colors border border-neutral-700/80 cursor-pointer disabled:opacity-40"
          title={`Avanzar +20cm con PWM ${motorPwm} (W / Flecha Arriba)`}
        >
          <ArrowUp className="w-5 h-5" />
          <span className="text-[9px] font-mono opacity-80">AVANZAR</span>
        </button>

        {/* Left - Stop - Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTurnLeft(15, motorPwm)}
            disabled={disabled || isAutonomous}
            className="w-16 h-12 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 text-neutral-200 active:text-white rounded-lg flex flex-col items-center justify-center transition-colors border border-neutral-700/80 cursor-pointer disabled:opacity-40"
            title={`Girar Izquierda 15° y reiniciar senso con PWM ${motorPwm} (A / Flecha Izquierda)`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[9px] font-mono opacity-80">GIRAR IZQ</span>
          </button>

          <button
            onClick={onStopBot}
            disabled={disabled}
            className="w-14 h-12 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-600 text-rose-400 active:text-white rounded-lg flex flex-col items-center justify-center transition-colors border border-rose-500/40 cursor-pointer"
            title="Detener Motores (Espacio)"
          >
            <Square className="w-4 h-4 fill-current" />
            <span className="text-[9px] font-mono opacity-80">PARAR</span>
          </button>

          <button
            onClick={() => onTurnRight(15, motorPwm)}
            disabled={disabled || isAutonomous}
            className="w-16 h-12 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 text-neutral-200 active:text-white rounded-lg flex flex-col items-center justify-center transition-colors border border-neutral-700/80 cursor-pointer disabled:opacity-40"
            title={`Girar Derecha 15° y reiniciar senso con PWM ${motorPwm} (D / Flecha Derecha)`}
          >
            <ArrowRight className="w-5 h-5" />
            <span className="text-[9px] font-mono opacity-80">GIRAR DER</span>
          </button>
        </div>

        {/* Backward */}
        <button
          onClick={() => onDriveBackward(20, motorPwm)}
          disabled={disabled || isAutonomous}
          className="w-16 h-12 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-600 text-neutral-200 active:text-white rounded-lg flex flex-col items-center justify-center transition-colors border border-neutral-700/80 cursor-pointer disabled:opacity-40"
          title={`Retroceder -20cm con PWM ${motorPwm} (S / Flecha Abajo)`}
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[9px] font-mono opacity-80">RETROCEDER</span>
        </button>
      </div>

      {/* Quick Impulse Steps Section */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/80">
        <span className="text-[10px] font-mono text-neutral-400 font-semibold px-0.5">
          Pasos de Avance & Giro Calibrados:
        </span>
        <div className="grid grid-cols-4 gap-1 text-center font-mono">
          <button
            onClick={() => onDriveForward(10, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Paso corto +10cm"
          >
            Paso 10cm
          </button>
          <button
            onClick={() => onDriveForward(20, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Paso estándar +20cm"
          >
            Paso 20cm
          </button>
          <button
            onClick={() => onDriveForward(30, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Paso largo +30cm"
          >
            Paso 30cm
          </button>
          <button
            onClick={() => onDriveForward(50, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Paso extra largo +50cm"
          >
            Paso 50cm
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center font-mono">
          <button
            onClick={() => onTurnLeft(30, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Giro izquierda 30° (reinicia senso)"
          >
            Giro 30° Izq
          </button>
          <button
            onClick={() => onDriveBackward(20, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Retroceso calibrado 20cm"
          >
            Rev 20cm
          </button>
          <button
            onClick={() => onTurnRight(30, motorPwm)}
            disabled={disabled || isAutonomous}
            className="bg-neutral-950 hover:bg-neutral-800 text-neutral-300 py-1.5 rounded border border-neutral-800 text-[11px] transition-colors cursor-pointer"
            title="Giro derecha 30° (reinicia senso)"
          >
            Giro 30° Der
          </button>
        </div>
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60 text-center font-mono">
        <span>Teclas: </span>
        <span className="text-neutral-200 font-semibold">W, A, S, D</span>
        <span className="text-neutral-500"> o </span>
        <span className="text-neutral-200 font-semibold">Flechas</span>
        <span className="text-neutral-500"> · </span>
        <span className="text-neutral-200 font-semibold">Espacio</span> (Parar)
      </div>

      {/* Route Actions (Add Waypoint & Reset Route) */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/80">
        <button
          onClick={onAddWaypoint}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/50 transition-colors cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Fijar Hito #{waypoints.length + 1}</span>
        </button>

        <button
          onClick={onResetRoute}
          disabled={disabled}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 bg-neutral-800 hover:text-neutral-100 hover:bg-neutral-750 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar Ruta</span>
        </button>
      </div>
    </div>
  );
};
