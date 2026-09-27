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
    name: 'Cámara y Pasadizos Subterráneos',
    description: 'Templo antiguo con pilares circulares, cámara central y corredor de exploración.',
    recommendedStart: { x: 0, y: 30, heading: 90 },
    bounds: { minX: -260, maxX: 260, minY: -40, maxY: 420 },
    walls: [
      // Outer Room Boundaries
      { x1: -220, y1: 0, x2: 220, y2: 0, type: 'wall' }, // South Wall
      { x1: -220, y1: 0, x2: -220, y2: 260, type: 'wall' }, // West Wall Room 1
      { x1: 220, y1: 0, x2: 220, y2: 260, type: 'wall' }, // East Wall Room 1
      // North Wall with central doorway to Hallway
      { x1: -220, y1: 260, x2: -50, y2: 260, type: 'wall' },
      { x1: 50, y1: 260, x2: 220, y2: 260, type: 'wall' },
      // Hallway Walls extending North
      { x1: -50, y1: 260, x2: -50, y2: 400, type: 'wall' },
      { x1: 50, y1: 260, x2: 50, y2: 400, type: 'wall' },
      { x1: -50, y1: 400, x2: 50, y2: 400, type: 'wall' }, // Corridor end
      // Internal Ruins & Columns
      { x1: -140, y1: 100, x2: -90, y2: 150, type: 'obstacle' },
      { x1: 90, y1: 120, x2: 150, y2: 120, type: 'obstacle' },
    ],
    circles: [
      // Main pillars
      { cx: -80, cy: 90, radius: 14, type: 'obstacle' },
      { cx: 80, cy: 90, radius: 14, type: 'obstacle' },
      { cx: -80, cy: 190, radius: 14, type: 'obstacle' },
      { cx: 80, cy: 190, radius: 14, type: 'obstacle' },
      // Center ancient altar / relic
      { cx: 0, cy: 170, radius: 20, type: 'anomaly' },
      // Corridor checkpoint
      { cx: 0, cy: 340, radius: 12, type: 'anomaly' },
    ],
  },

  lunar_ruins: {
    name: 'Sector de Exploración Lunar',
    description: 'Cráter abierto con montículos rocosos, crestas y monolitos.',
    recommendedStart: { x: -80, y: 50, heading: 60 },
    bounds: { minX: -280, maxX: 280, minY: -50, maxY: 380 },
    walls: [
      // Crater Rim polygon segments
      { x1: -220, y1: 60, x2: -160, y2: 240, type: 'wall' },
      { x1: -160, y1: 240, x2: -20, y2: 320, type: 'wall' },
      { x1: -20, y1: 320, x2: 170, y2: 290, type: 'wall' },
      { x1: 170, y1: 290, x2: 240, y2: 130, type: 'wall' },
      { x1: 240, y1: 130, x2: 140, y2: 0, type: 'wall' },
      { x1: 140, y1: 0, x2: -120, y2: -10, type: 'wall' },
      { x1: -120, y1: -10, x2: -220, y2: 60, type: 'wall' },
      // Rock Ridge Barrier
      { x1: -50, y1: 100, x2: 30, y2: 80, type: 'obstacle' },
    ],
    circles: [
      // Alien Monolith
      { cx: 20, cy: 200, radius: 18, type: 'anomaly' },
      // Crater Boulders
      { cx: -110, cy: 150, radius: 24, type: 'obstacle' },
      { cx: 90, cy: 140, radius: 22, type: 'obstacle' },
      { cx: -50, cy: 240, radius: 16, type: 'obstacle' },
      { cx: 120, cy: 230, radius: 18, type: 'obstacle' },
    ],
  },

  room_interior: {
    name: 'Entorno Interior / Laboratorio Robótico',
    description: 'Habitación cerrada con mesas, sillas, obstáculos y estanterías.',
    recommendedStart: { x: 0, y: 40, heading: 90 },
    bounds: { minX: -200, maxX: 200, minY: -20, maxY: 340 },
    walls: [
      // Room perimeter
      { x1: -180, y1: 0, x2: 180, y2: 0, type: 'wall' },
      { x1: -180, y1: 0, x2: -180, y2: 300, type: 'wall' },
      { x1: 180, y1: 0, x2: 180, y2: 300, type: 'wall' },
      { x1: -180, y1: 300, x2: 180, y2: 300, type: 'wall' },
      // Office desk / Workstation
      { x1: -140, y1: 150, x2: -60, y2: 150, type: 'obstacle' },
      { x1: -60, y1: 150, x2: -60, y2: 90, type: 'obstacle' },
      // Bookcase / Divider
      { x1: 70, y1: 180, x2: 150, y2: 180, type: 'obstacle' },
    ],
    circles: [
      // Swivel chairs
      { cx: -100, cy: 110, radius: 15, type: 'obstacle' },
      { cx: 30, cy: 120, radius: 14, type: 'obstacle' },
      // Waste bin / box
      { cx: 130, cy: 50, radius: 12, type: 'obstacle' },
      // Charging station / target beacon
      { cx: 0, cy: 260, radius: 14, type: 'anomaly' },
    ],
  },

  corridor_maze: {
    name: 'Laberinto de Navegación SLAM',
    description: 'Circuito continuo con giros de 90° ideal para registrar rutas largas del bot.',
    recommendedStart: { x: -160, y: 40, heading: 90 },
    bounds: { minX: -240, maxX: 240, minY: -20, maxY: 380 },
    walls: [
      // Outer boundaries
      { x1: -220, y1: 0, x2: 220, y2: 0, type: 'wall' },
      { x1: -220, y1: 0, x2: -220, y2: 360, type: 'wall' },
      { x1: 220, y1: 0, x2: 220, y2: 360, type: 'wall' },
      { x1: -220, y1: 360, x2: 220, y2: 360, type: 'wall' },
      // Maze corridors
      { x1: -110, y1: 0, x2: -110, y2: 260, type: 'wall' },
      { x1: 0, y1: 100, x2: 0, y2: 360, type: 'wall' },
      { x1: 110, y1: 0, x2: 110, y2: 260, type: 'wall' },
    ],
    circles: [
      { cx: -160, cy: 300, radius: 15, type: 'anomaly' },
      { cx: -50, cy: 60, radius: 14, type: 'obstacle' },
      { cx: 50, cy: 300, radius: 14, type: 'obstacle' },
      { cx: 160, cy: 60, radius: 16, type: 'anomaly' },
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
  let hitType: 'wall' | 'obstacle' | 'anomaly' = 'wall';

  // Check walls
  for (const wall of layout.walls) {
    const dist = rayLineIntersect(botPose.x, botPose.y, dx, dy, wall.x1, wall.y1, wall.x2, wall.y2);
    if (dist !== null && dist < closestDist && dist >= 2) {
      closestDist = dist;
      hitType = wall.type || 'wall';
    }
  }

  // Check preset circles
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
