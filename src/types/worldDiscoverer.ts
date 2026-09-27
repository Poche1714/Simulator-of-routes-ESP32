export interface DiscoveredPoint2D {
  id: string;
  worldX: number; // cm in global coordinate system
  worldY: number; // cm in global coordinate system
  robotX: number; // position of robot when detected
  robotY: number;
  robotHeading: number; // heading of robot when detected
  sensorAngle: number; // 0° to 180° relative to robot
  distanceCm: number; // 2cm to 400cm
  timestamp: number;
  sweepCycle: number;
  hits: number;
  type: 'wall' | 'obstacle' | 'anomaly';
  clearConfirmations?: number; // Contador de validaciones consecutivas > 70 cm (requiere 3 para borrar)
}

export interface TrajectoryPoint {
  id: string;
  x: number; // cm in global coordinate system
  y: number; // cm in global coordinate system
  heading: number; // degrees
  timestamp: number;
  distanceFromStartCm: number;
  speed: number; // cm/s
  isWaypoint?: boolean;
  waypointLabel?: string;
}

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  label: string;
  timestamp: number;
  color?: string;
  icon?: string;
}

export interface BotPose {
  x: number; // cm
  y: number; // cm
  heading: number; // 0° to 360° (90° is North / +Y, 0° is East / +X)
  speed: number; // cm/s
  isMoving: boolean;
  driveMode: 'manual' | 'autonomous' | 'paused';
  totalDistanceCm: number;
}

export type SweepDirection = 'forward' | 'backward';

export type ScanMode = 
  | 'normal_sweep'            // Estado normal: de 0 a 30° y de 0 a -30° (60° a 120° servo)
  | 'obstacle_reduced_sweep'  // Obstáculo detectado (≤ 40 cm): rango reducido de 0 a 10° y de 0 a -10° (80° a 100° servo)
  | 'wide_probe_sweep'        // Sonda ampliada (±65°)
  | 'narrow_patrol'           // Compatibilidad de modos previos
  | 'obstacle_focused_survey'
  | 'survey_paused'
  | 'obstacle_panoramic';

export interface RoverSweepState {
  currentAngle: number; // 0 to 180 (90° is center forward / 0° relativo)
  relativeAngle: number; // -90° to +90° (0° is forward)
  targetAngle: number;
  sweepDirection: SweepDirection;
  isScanning: boolean;
  scanMode: ScanMode;
  scanSpanDeg: number; // 30 en normal (±30°), 10 con obstáculo (±10°)
  isObstacleDetected: boolean;
  obstacleDistanceCm: number | null; // Exact cm to detected obstacle
  obstacleDetectedAngle: number | null; // Exact relative angle where obstacle was spotted
  obstacleThresholdCm: number; // 40 cm trigger
  // Focused object survey window (opcional compatibilidad)
  surveyMinAngle: number | null;
  surveyMaxAngle: number | null;
  surveyStepDirection: 1 | -1;
  surveyPassesCount: number;
  sweepPeriodSeconds: number; // seconds for cycle
  elapsedInSweepSeconds: number;
  totalSweepsCompleted: number;
  currentDistanceCm: number;
  maxRangeCm: number; // 100, 200, 300, 400 cm
  motorPwm: number; // PWM value between 175 and 198
}

export type GameVisualTheme = 'tactical_radar' | 'dungeon_pixel' | 'cyber_sonar' | 'blueprint';

export type MapEnvironmentPreset = 'dungeon_chamber' | 'lunar_ruins' | 'room_interior' | 'corridor_maze';

export interface RouteStats {
  totalDistanceMeters: number;
  activeDriveTimeSeconds: number;
  pointsRecordedCount: number;
  waypointsCount: number;
  currentSpeedCmS: number;
  averageSpeedCmS: number;
  obstaclesDetectedCount: number;
  fogClearedPercentage: number;
  currentSectorName: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface ExplorationStats {
  fogClearedPercentage: number;
  totalAreaM2: number;
  obstaclesDetectedCount: number;
  activeScanTimeSeconds: number;
  currentSectorName: string;
  maxRangeReachedCm: number;
  anomaliesFound: number;
  totalDistanceTraveledM: number;
  routePointsCount: number;
}

export interface UltrasonicPacket {
  angle: number;
  distanceCm: number;
  valid: boolean;
  timestamp: number;
}

export interface SerialErrorInfo {
  code: 'LOCKED_OR_IN_USE' | 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'DISCONNECTED' | 'UNKNOWN';
  title: string;
  message: string;
  reasons: string[];
  solutions: string[];
}

export interface DynamicObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  label?: string;
  color?: string;
}

export type NavAlgorithmMode = 'tangent_bug' | 'reactive_sonar' | 'potential_field';

export type NavState =
  | 'IDLE'
  | 'ORIENTING'
  | 'CRUISING'
  | 'PROBING_WIDE'
  | 'AVOIDING_LEFT'
  | 'AVOIDING_RIGHT'
  | 'REVERSING_ESCAPE'
  | 'REJOINING_GOAL'
  | 'GOAL_REACHED'
  | 'BLOCKED';

export interface NavigationRouteStats {
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  distanceToGoalCm: number;
  straightLineDistanceCm: number;
  actualDistanceTraveledCm: number;
  efficiencyPercentage: number;
  obstaclesAvoidedCount: number;
  state: NavState;
  algorithm: NavAlgorithmMode;
  isNavigating: boolean;
  goalReached: boolean;
}

export type MapInteractionMode = 'pan' | 'set_a' | 'set_b' | 'add_obstacle';

