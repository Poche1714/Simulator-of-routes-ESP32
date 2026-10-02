// 2D World Simulator & Raycaster for Mobile Bot with 180° Sweeping Ultrasonic Sensor

import { MapEnvironmentPreset } from '../types/worldDiscoverer';

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: 'wall' | 'obstacle' | 'anomaly';
}

export interface CircularObstacle {
  cx: number;
  cy: number;
  radius: number;
  type?: 'wall' | 'obstacle' | 'anomaly';
}

export interface WorldMapLayout {
  name: string;
  description: string;
  recommendedStart: { x: number; y: number; heading: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  walls: WallSegment[];
  circles: CircularObstacle[];
}

export const WORLD_PRESETS: Record<MapEnvironmentPreset, WorldMapLayout> = {
  dungeon_chamber: {
    name: 'Entorno de Obstáculos: Sala Principal',
    description: 'Espacio abierto con columnas y obstáculos cilíndricos para prueba de sensores y navegación.',
    recommendedStart: { x: 0, y: 30, heading: 90 },
    bounds: { minX: -260, maxX: 260, minY: -40, maxY: 420 },
    walls: [],
    circles: [
      { cx: -80, cy: 90, radius: 16, type: 'obstacle' },
      { cx: 80, cy: 90, radius: 16, type: 'obstacle' },
      { cx: -80, cy: 190, radius: 16, type: 'obstacle' },
      { cx: 80, cy: 190, radius: 16, type: 'obstacle' },
      { cx: 0, cy: 170, radius: 20, type: 'obstacle' },
      { cx: 0, cy: 340, radius: 14, type: 'obstacle' },
    ],
  },

  lunar_ruins: {
    name: 'Sector de Exploración: Pilares y Rocas',
    description: 'Área abierta con montículos y pilares de prueba para detección ultrasónica.',
    recommendedStart: { x: -80, y: 50, heading: 60 },
    bounds: { minX: -280, maxX: 280, minY: -50, maxY: 380 },
    walls: [],
    circles: [
      { cx: 20, cy: 200, radius: 18, type: 'obstacle' },
      { cx: -110, cy: 150, radius: 24, type: 'obstacle' },
      { cx: 90, cy: 140, radius: 22, type: 'obstacle' },
      { cx: -50, cy: 240, radius: 16, type: 'obstacle' },
      { cx: 120, cy: 230, radius: 18, type: 'obstacle' },
    ],
  },

  room_interior: {
    name: 'Entorno Interior: Obstáculos Discretos',
    description: 'Entorno de trabajo con módulos cilíndricos y elementos para evasión autónoma.',
    recommendedStart: { x: 0, y: 40, heading: 90 },
    bounds: { minX: -200, maxX: 200, minY: -20, maxY: 340 },
    walls: [],
    circles: [
      { cx: -100, cy: 110, radius: 15, type: 'obstacle' },
      { cx: 30, cy: 120, radius: 14, type: 'obstacle' },
      { cx: 130, cy: 50, radius: 12, type: 'obstacle' },
      { cx: 0, cy: 260, radius: 16, type: 'obstacle' },
      { cx: -70, cy: 190, radius: 18, type: 'obstacle' },
    ],
  },

  corridor_maze: {
    name: 'Circuito de Columnas de Maniobra',
    description: 'Conjunto de columnas de referencia para validación de trayectorias y espiral.',
    recommendedStart: { x: -160, y: 40, heading: 90 },
    bounds: { minX: -240, maxX: 240, minY: -20, maxY: 380 },
    walls: [],
    circles: [
      { cx: -110, cy: 120, radius: 16, type: 'obstacle' },
      { cx: 0, cy: 200, radius: 18, type: 'obstacle' },
      { cx: 110, cy: 120, radius: 16, type: 'obstacle' },
      { cx: -50, cy: 270, radius: 15, type: 'obstacle' },
      { cx: 50, cy: 270, radius: 15, type: 'obstacle' },
    ],
  },
};

// Ray-line intersection helper
function rayLineIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number | null {
  const v1x = ox - x1;
  const v1y = oy - y1;
  const v2x = x2 - x1;
  const v2y = y2 - y1;
  const v3x = -dy;
  const v3y = dx;

  const dot = v2x * v3x + v2y * v3y;
  if (Math.abs(dot) < 0.000001) return null;

  const t1 = (v2x * v1y - v2y * v1x) / dot;
  const t2 = (v1x * v3x + v1y * v3y) / dot;

  if (t1 > 0.01 && t2 >= 0 && t2 <= 1) {
    return t1;
  }
  return null;
}

// Ray-circle intersection helper
function rayCircleIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  radius: number
): number | null {
  const fx = ox - cx;
  const fy = oy - cy;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  if (t1 > 0.01) return t1;
  if (t2 > 0.01) return t2;
  return null;
}

/**
 * Simulates a sonar pulse from the moving bot's position and orientation.
 * @param botPose Current position (x, y) and heading in degrees (90° is forward/North).
 * @param sensorAngleDeg Servo sweep angle (0° to 180°, where 90° is straight ahead).
 * @param preset Environment preset
 * @param maxRangeCm Max detection distance (e.g. 250-400cm)
 */
export function simulateSonarPing(
  botPose: { x: number; y: number; heading: number },
  sensorAngleDeg: number,
  preset: MapEnvironmentPreset = 'dungeon_chamber',
  maxRangeCm: number = 300,
  dynamicObstacles?: { cx: number; cy: number; radius: number; type?: 'obstacle' | 'anomaly' }[]
): { distanceCm: number; type: 'wall' | 'obstacle' | 'anomaly'; worldX: number; worldY: number } {
  const layout = WORLD_PRESETS[preset] || WORLD_PRESETS.dungeon_chamber;

  // Beam direction relative to bot:
  const offsetFromForward = sensorAngleDeg - 90;
  const beamAngleDeg = botPose.heading + offsetFromForward;
  const beamRad = (beamAngleDeg * Math.PI) / 180;

  const dx = Math.cos(beamRad);
  const dy = Math.sin(beamRad);

  let closestDist = maxRangeCm;
  let hitType: 'wall' | 'obstacle' | 'anomaly' = 'obstacle';

  // Check preset circular obstacles
  for (const circ of layout.circles) {
    const dist = rayCircleIntersect(botPose.x, botPose.y, dx, dy, circ.cx, circ.cy, circ.radius);
    if (dist !== null && dist < closestDist && dist >= 2) {
      closestDist = dist;
      hitType = circ.type || 'obstacle';
    }
  }

  // Check dynamic obstacles placed in world
  if (dynamicObstacles && dynamicObstacles.length > 0) {
    for (const obs of dynamicObstacles) {
      const dist = rayCircleIntersect(botPose.x, botPose.y, dx, dy, obs.cx, obs.cy, obs.radius);
      if (dist !== null && dist < closestDist && dist >= 2) {
        closestDist = dist;
        hitType = obs.type || 'obstacle';
      }
    }
  }

  // Add realistic ultrasonic sensor jitter (+/- 0.6cm)
  const jitter = (Math.random() - 0.5) * 1.2;
  const finalDist = Math.max(2, Math.min(maxRangeCm, Number((closestDist + jitter).toFixed(1))));

  // Project point in world coordinates
  const worldX = Number((botPose.x + finalDist * Math.cos(beamRad)).toFixed(1));
  const worldY = Number((botPose.y + finalDist * Math.sin(beamRad)).toFixed(1));

  return {
    distanceCm: finalDist,
    type: hitType,
    worldX,
    worldY,
  };
}
