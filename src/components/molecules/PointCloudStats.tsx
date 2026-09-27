import React from 'react';
import { MetricItem } from '../atoms/MetricItem';
import { Point3D, ScanStatus } from '../../types/scanner';

export interface PointCloudStatsProps {
  points: Point3D[];
  scanStatus: ScanStatus;
  currentAngle: number;
  sweepAngle: number;
  currentDistance: number;
}

export const PointCloudStats: React.FC<PointCloudStatsProps> = ({
  points,
  scanStatus,
  currentAngle,
  sweepAngle,
  currentDistance,
}) => {
  // Calculate bounding box and stats
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  points.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  });

  const width = points.length > 2 ? Math.abs(maxX - minX) : 0;
  const height = points.length > 2 ? Math.abs(maxY - minY) : 0;
  const depth = points.length > 2 ? Math.abs(maxZ - minZ) : 0;
  const approxDiameter = Math.max(width, depth);

  const scanProgress = sweepAngle > 0 ? Math.min(100, Math.round((currentAngle / sweepAngle) * 100)) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-neutral-900/60 border border-neutral-800/80 rounded-xl">
      <div className="flex flex-wrap items-center gap-6">
        <MetricItem
          label="Puntos 3D"
          value={points.length.toLocaleString()}
          unit="pts"
        />

        <MetricItem
          label="Ángulo Servo"
          value={currentAngle.toFixed(1)}
          unit="°"
        />

        <MetricItem
          label="Distancia Sensor"
          value={currentDistance > 0 ? currentDistance.toFixed(2) : '--'}
          unit="cm"
        />

        <MetricItem
          label="Diámetro Estimado"
          value={approxDiameter > 0 ? approxDiameter.toFixed(1) : '--'}
          unit="cm"
        />

        <MetricItem
          label="Altura (Z)"
          value={height > 0 ? (height + 0.5).toFixed(1) : '--'}
          unit="cm"
        />
      </div>

      {scanStatus === 'scanning' && (
        <div className="flex items-center gap-3 min-w-[160px]">
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-amber-400 font-medium">Progreso Escaneo</span>
              <span className="text-neutral-300 tabular-nums">{scanProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-amber-400 transition-all duration-150"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
