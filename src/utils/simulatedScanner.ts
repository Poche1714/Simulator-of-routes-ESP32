import { Point3D, ScannerSettings } from '../types/scanner';
import { convertToCartesian } from './serialParser';

export type SimulatedModel = 'vase' | 'bust' | 'gear' | 'mug' | 'crystal';

export interface SimulationResult {
  angle: number;
  distance: number;
  z: number;
  point: Point3D | null;
}

/**
 * Calculates synthetic radial distance of virtual 3D models at given angle and height
 */
export function getSimulatedObjectRadius(
  model: SimulatedModel,
  angleDeg: number,
  zHeightCm: number
): number {
  const rad = (angleDeg * Math.PI) / 180;
  const zNorm = (zHeightCm - 2.5) / 5.0; // normalized height roughly -0.5 to 0.5

  switch (model) {
    case 'vase': {
      // Classic lathe profile: wide base, narrow neck, flaring rim
      const baseRadius = 3.6;
      const neckFactor = 1.0 - 0.45 * Math.sin(Math.PI * (zNorm + 0.5));
      const fluting = 0.15 * Math.cos(8 * rad); // 8 decorative ridges
      return Math.max(1.2, baseRadius * neckFactor + fluting);
    }
    case 'gear': {
      // 12-tooth mechanical cog
      const numTeeth = 12;
      const baseR = 3.8;
      const toothAmp = 0.9;
      const tooth = Math.sin(numTeeth * rad) > 0 ? toothAmp : 0;
      return baseR + tooth;
    }
    case 'bust': {
      // Humanoid bust silhouette with nose/chin features
      const headRadius = 3.2 + 0.4 * Math.sin(zNorm * 3);
      // Nose protrudes around 0 degrees
      const noseAngleDiff = Math.abs((((angleDeg % 360) + 360) % 360));
      const nose = noseAngleDiff < 35 && Math.abs(zNorm) < 0.2
        ? 1.5 * Math.cos((noseAngleDiff / 35) * (Math.PI / 2))
        : 0;
      // Ears around 90 and 270 degrees
      const ear1 = Math.abs(angleDeg - 90) < 25 ? 0.8 * Math.cos(((angleDeg - 90) / 25) * (Math.PI / 2)) : 0;
      const ear2 = Math.abs(angleDeg - 270) < 25 ? 0.8 * Math.cos(((angleDeg - 270) / 25) * (Math.PI / 2)) : 0;
      return headRadius + nose + ear1 + ear2;
    }
    case 'mug': {
      // Cylinder with handle on one side (180 deg)
      const cylRadius = 3.4;
      const handleAngle = Math.abs((((angleDeg - 180) % 360) + 360) % 360);
      const handle = handleAngle < 35 && Math.abs(zNorm) < 0.35
        ? 1.8 * Math.cos((handleAngle / 35) * (Math.PI / 2))
        : 0;
      return cylRadius + handle;
    }
    case 'crystal': {
      // Hexagonal prism with pyramidal apex
      const sides = 6;
      const baseR = 3.5 * (1 - 0.5 * Math.max(0, zNorm));
      const r = baseR / Math.cos(((angleDeg % (360 / sides)) - (180 / sides)) * (Math.PI / 180));
      return Math.min(5.0, Math.max(1.0, r));
    }
  }
}

/**
 * Simulates a single ultrasonic sensor ping for an angle and z-level
 */
export function simulateUltrasonicPing(
  angleDeg: number,
  zHeightCm: number,
  model: SimulatedModel,
  settings: ScannerSettings
): SimulationResult {
  const objectR = getSimulatedObjectRadius(model, angleDeg, zHeightCm);

  // Ultrasonic sensor is at distance turntableRadius from center
  // Distance measured by sensor = turntableRadius - objectR + sensor jitter
  const noise = (Math.random() - 0.5) * 0.12; // +/- 0.06 cm ultrasonic jitter
  const measuredDistance = Math.max(
    settings.minDistance,
    Math.min(settings.maxDistance, settings.turntableRadius - objectR + noise)
  );

  const point = convertToCartesian(angleDeg, measuredDistance, zHeightCm, settings);

  return {
    angle: angleDeg,
    distance: Number(measuredDistance.toFixed(2)),
    z: zHeightCm,
    point,
  };
}
