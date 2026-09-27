import React from 'react';
import { RotateCcw, RotateCw, Compass, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Slider } from '../atoms/Slider';
import { TurntableState } from '../../types/scanner';

export interface ServoTurntableControlsProps {
  turntable: TurntableState;
  onTurnLeft: (degrees: number) => void;
  onTurnRight: (degrees: number) => void;
  onGotoAngle: (angle: number) => void;
  onHome: () => void;
  onStepChange: (step: number) => void;
  disabled?: boolean;
}

export const ServoTurntableControls: React.FC<ServoTurntableControlsProps> = ({
  turntable,
  onTurnLeft,
  onTurnRight,
  onGotoAngle,
  onHome,
  onStepChange,
  disabled = false,
}) => {
  const steps = [1, 2, 5, 10, 45];

  return (
    <div className="flex flex-col gap-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-neutral-200">
            Control de Servomotor (Plataforma)
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-neutral-500">Ángulo:</span>
          <span className="text-amber-400 font-bold tabular-nums text-sm">
            {turntable.currentAngle.toFixed(1)}°
          </span>
        </div>
      </div>

      {/* Main Left / Right directional turn controls */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          variant="secondary"
          size="md"
          onClick={() => onTurnLeft(turntable.stepSize)}
          disabled={disabled || turntable.isRotating}
          leftIcon={<RotateCcw className="w-4 h-4 text-amber-400" />}
          className="flex-1 py-3 justify-center"
        >
          <span className="font-semibold">Giro Izquierda</span>
          <span className="text-xs text-neutral-400 font-mono ml-1">
            -{turntable.stepSize}°
          </span>
        </Button>

        <Button
          variant="secondary"
          size="md"
          onClick={() => onTurnRight(turntable.stepSize)}
          disabled={disabled || turntable.isRotating}
          rightIcon={<RotateCw className="w-4 h-4 text-amber-400" />}
          className="flex-1 py-3 justify-center"
        >
          <span className="font-semibold">Giro Derecha</span>
          <span className="text-xs text-neutral-400 font-mono ml-1">
            +{turntable.stepSize}°
          </span>
        </Button>
      </div>

      {/* Step size segmented selector */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-neutral-400 font-medium">Paso angular:</span>
        <div className="inline-flex rounded-lg bg-neutral-950 p-0.5 border border-neutral-800">
          {steps.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onStepChange(s)}
              disabled={disabled}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                turntable.stepSize === s
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {s}°
            </button>
          ))}
        </div>
      </div>

      {/* Angle Slider + Home button */}
      <div className="flex flex-col gap-2 pt-1 border-t border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Slider
              label="Posición directa del servo"
              min={0}
              max={360}
              step={1}
              unit="°"
              value={turntable.currentAngle}
              onChange={(val) => onGotoAngle(val)}
              disabled={disabled || turntable.isRotating}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onHome}
            disabled={disabled || turntable.isRotating}
            leftIcon={<CornerDownLeft className="w-3.5 h-3.5 text-neutral-400" />}
            className="mt-4"
          >
            Home 0°
          </Button>
        </div>

        {/* Quick angle targets */}
        <div className="flex items-center justify-between text-xs text-neutral-500 font-mono pt-0.5">
          <span className="text-[11px]">Accesos directos:</span>
          <div className="flex gap-1.5">
            {[0, 45, 90, 180, 270, 360].map((deg) => (
              <button
                key={deg}
                onClick={() => onGotoAngle(deg)}
                disabled={disabled}
                className="hover:text-amber-400 px-1 py-0.5 rounded transition-colors"
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
