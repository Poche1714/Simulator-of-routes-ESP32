import React from 'react';
import { Radio, Activity, Target } from 'lucide-react';
import { Button } from '../atoms/Button';
import { UltrasonicSensorData, ScannerSettings } from '../../types/scanner';

export interface SensorGaugeProps {
  sensorData: UltrasonicSensorData;
  settings: ScannerSettings;
  onPingSensor: () => void;
  disabled?: boolean;
}

export const SensorGauge: React.FC<SensorGaugeProps> = ({
  sensorData,
  settings,
  onPingSensor,
  disabled = false,
}) => {
  const { distanceCm, valid } = sensorData;
  const { turntableRadius, minDistance, maxDistance } = settings;

  // Object radius = turntableRadius - distance
  const surfaceRadius = Math.max(0, turntableRadius - distanceCm);

  // Percentage along the sensor track (0 = at sensor face, 100% = turntable center)
  const percentFromCenter = Math.min(
    100,
    Math.max(0, (surfaceRadius / turntableRadius) * 100)
  );

  let statusText = 'Objetivo dentro de rango';
  let statusColor = 'text-emerald-400';

  if (!valid || distanceCm <= 0) {
    statusText = 'Sin eco ultrasónico';
    statusColor = 'text-neutral-500';
  } else if (distanceCm < minDistance) {
    statusText = 'Demasiado cerca (< 2 cm)';
    statusColor = 'text-rose-400';
  } else if (distanceCm > maxDistance) {
    statusText = 'Fuera del plato giratorio';
    statusColor = 'text-amber-400';
  }

  return (
    <div className="flex flex-col gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-neutral-200">
            Sensor Ultrasónico (HC-SR04)
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onPingSensor}
          disabled={disabled}
          leftIcon={<Activity className="w-3.5 h-3.5 text-cyan-400" />}
        >
          Disparar Eco
        </Button>
      </div>

      {/* Numerical readouts */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="flex flex-col bg-neutral-950/60 rounded-lg p-2.5 border border-neutral-800/60">
          <span className="text-[11px] text-neutral-500 font-medium">Distancia Eco</span>
          <span className="text-lg font-mono font-bold text-cyan-300 tabular-nums">
            {distanceCm > 0 ? distanceCm.toFixed(2) : '--'}
            <span className="text-xs font-normal text-neutral-400 ml-1">cm</span>
          </span>
        </div>

        <div className="flex flex-col bg-neutral-950/60 rounded-lg p-2.5 border border-neutral-800/60">
          <span className="text-[11px] text-neutral-500 font-medium">Radio Superficie (r)</span>
          <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">
            {valid && distanceCm <= maxDistance ? surfaceRadius.toFixed(2) : '--'}
            <span className="text-xs font-normal text-neutral-400 ml-1">cm</span>
          </span>
        </div>

        <div className="flex flex-col bg-neutral-950/60 rounded-lg p-2.5 border border-neutral-800/60">
          <span className="text-[11px] text-neutral-500 font-medium">Radio Base (R₀)</span>
          <span className="text-lg font-mono font-bold text-neutral-300 tabular-nums">
            {turntableRadius.toFixed(1)}
            <span className="text-xs font-normal text-neutral-400 ml-1">cm</span>
          </span>
        </div>
      </div>

      {/* Visual range track */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex justify-between text-[11px] text-neutral-500">
          <span>Sensor (0 cm)</span>
          <span className={statusColor}>{statusText}</span>
          <span>Centro Plato ({turntableRadius} cm)</span>
        </div>

        <div className="relative w-full h-3 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden">
          {/* Active zone */}
          <div
            className="absolute top-0 bottom-0 bg-neutral-800/50"
            style={{
              left: `${(minDistance / turntableRadius) * 100}%`,
              width: `${((maxDistance - minDistance) / turntableRadius) * 100}%`,
            }}
          />

          {/* Current reading marker */}
          {valid && distanceCm > 0 && (
            <div
              className="absolute top-0 bottom-0 w-2.5 -ml-1 bg-cyan-400 rounded-sm shadow-md shadow-cyan-400/80 transition-all duration-150"
              style={{
                left: `${Math.min(100, Math.max(0, (distanceCm / turntableRadius) * 100))}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
