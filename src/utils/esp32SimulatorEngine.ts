// Virtual ESP32 Microcontroller Emulator & Algorithm Testing Engine (v2.0.0)
// Emulates the exact ESP32 C++ runtime: GPIOs, PWM channels, HC-SR04 ultrasonic raycaster,
// servo motor mechanics, UART serial communication, and autonomous Point A to Point B navigation algorithms.

import {
  MapEnvironmentPreset,
  NavAlgorithmMode,
  NavState,
  RecognizedObstacle,
} from '../types/worldDiscoverer';
import { WORLD_PRESETS } from './worldSimulator';
import {
  ArchimedeanSpiralConfig,
  DEFAULT_SPIRAL_CONFIG,
  Point2D,
  isPointInsidePolygon,
  computeCellMaxInradius,
  distToPolygonBoundary,
} from './voronoiLloyd';

export interface DynamicObstacle {
  id: string;
  x: number; // cm
  y: number; // cm
  radius: number; // cm
  label?: string;
  color?: string;
}

export interface ESP32HardwareState {
  // Emulated CPU
  isRunning: boolean;
  loopFrequencyHz: number;
  cpuLoadPercent: number;
  millis: number;

  // GPIO Virtual Pins
  gpioPins: {
    pin18_servoPwm: number; // 0-180 deg
    pin5_trig: boolean;
    pin19_echoDurationUs: number;
    pin25_motorL1: number; // PWM 0-255
    pin26_motorL2: number;
    pin32_motorR1: number;
    pin33_motorR2: number;
  };

  // Internal Firmware Variables
  servoAngle: number; // 0-180, 90 is forward
  sweepDirection: 1 | -1;
  scanMode: 'NORMAL_SWEEP' | 'OBSTACLE_REDUCED_SWEEP' | 'WIDE_PROBE_SWEEP';
  scanSpanDeg: number; // 30 normal, 10 obstacle, 65 wide probe
  motorPwm: number; // calibrated 175-198
  lastDistanceCm: number;

  // Bot Odometry inside ESP32
  odometry: {
    x: number;
    y: number;
    heading: number; // 0-360, 90 is North (+Y)
  };

  // Autonomous Navigation & Voronoi-Lloyd-Spiral state inside ESP32
  navigation: {
    pointA: { x: number; y: number };
    pointB: { x: number; y: number };
    targetCentroid: { x: number; y: number };
    isActive: boolean;
    state: NavState;
    algorithm: NavAlgorithmMode;
    distanceToGoalCm: number;
    initialDistanceCm: number;
    detourDistanceCm: number;
    obstaclesAvoidedCount: number;
    currentSpeedCmS: number;
    goalReached: boolean;
    spiralCurrentRadiusCm?: number;
    spiralTurnsCompleted?: number;
  };
}

export class ESP32SimulatorEngine {
  private state: ESP32HardwareState;
  private dynamicObstacles: DynamicObstacle[] = [];
  private preset: MapEnvironmentPreset = 'dungeon_chamber';
  private serialTxListeners: ((line: string) => void)[] = [];
  private tickInterval: any = null;
  private lastTickTimestamp: number = 0;
  private lastScanStepTime: number = 0;
  private avoidanceTicksRemaining: number = 0;
  private avoidanceDirection: 'left' | 'right' = 'left';
  private prevPoseForDetour: { x: number; y: number } | null = null;
  private probeStep: number = 0;
  private reverseTicksRemaining: number = 0;
  private escapePivotDeg: number = 0;
  private aiWaypoints: { x: number; y: number }[] = [];
  private currentWaypointIndex: number = 0;

  // Intelligent Obstacle Recognition System
  private recognizedObstacles: Map<string, RecognizedObstacle> = new Map();

  // Voronoi Partition & Archimedean Spiral Engine
  private spiralConfig: ArchimedeanSpiralConfig = DEFAULT_SPIRAL_CONFIG;
  private spiralThetaRad: number = 0;
  private spiralCurrentRadiusCm: number = 5;
  private spiralTurnsCompleted: number = 0;
  private targetCentroid: { x: number; y: number } = { x: 0, y: 150 };
  private boundaryPolygon: Point2D[] = [];
  private rs232LastPacket: string = '';
  private centerArrivalTicks: number = 0;

  constructor() {
    const defaultStart = { x: -120, y: 50, heading: 90 };
    const defaultGoal = { x: 0, y: 150 };

    this.state = {
      isRunning: true,
      loopFrequencyHz: 40,
      cpuLoadPercent: 12,
      millis: 0,
      gpioPins: {
        pin18_servoPwm: 90,
        pin5_trig: false,
        pin19_echoDurationUs: 0,
        pin25_motorL1: 0,
        pin26_motorL2: 0,
        pin32_motorR1: 0,
        pin33_motorR2: 0,
      },
      servoAngle: 90,
      sweepDirection: 1,
      scanMode: 'NORMAL_SWEEP',
      scanSpanDeg: 30,
      motorPwm: 185,
      lastDistanceCm: 150,
      odometry: {
        x: defaultStart.x,
        y: defaultStart.y,
        heading: defaultStart.heading,
      },
      navigation: {
        pointA: { x: defaultStart.x, y: defaultStart.y },
        pointB: { x: defaultGoal.x, y: defaultGoal.y },
        targetCentroid: { x: defaultGoal.x, y: defaultGoal.y },
        isActive: false,
        state: 'IDLE',
        algorithm: 'voronoi_lloyd_spiral',
        distanceToGoalCm: Math.hypot(defaultGoal.x - defaultStart.x, defaultGoal.y - defaultStart.y),
        initialDistanceCm: Math.hypot(defaultGoal.x - defaultStart.x, defaultGoal.y - defaultStart.y),
        detourDistanceCm: 0,
        obstaclesAvoidedCount: 0,
        currentSpeedCmS: 0,
        goalReached: false,
        spiralCurrentRadiusCm: 5,
        spiralTurnsCompleted: 0,
      },
    };

    // Add default initial obstacles in the field between A and B
    this.dynamicObstacles = [
      { id: 'obs-center', x: 0, y: 160, radius: 24, label: 'Obstáculo Central' },
      { id: 'obs-left', x: -60, y: 220, radius: 18, label: 'Columna Oeste' },
      { id: 'obs-right', x: 70, y: 130, radius: 20, label: 'Bloque Este' },
    ];
  }

  // --- Serial Bus Interface ---
  public subscribeSerialTx(listener: (line: string) => void): () => void {
    this.serialTxListeners.push(listener);
    return () => {
      this.serialTxListeners = this.serialTxListeners.filter((l) => l !== listener);
    };
  }

  private emitSerial(line: string) {
    for (const listener of this.serialTxListeners) {
      listener(line);
    }
  }

  // Execute Serial Command received on RX (Web App -> ESP32)
  public receiveSerialRx(rawCommand: string) {
    const cmd = rawCommand.trim();
    if (!cmd) return;

    const upper = cmd.toUpperCase();

    if (upper === 'START') {
      this.state.isRunning = true;
      this.emitSerial('SYS:SCAN_RESUMED');
    } else if (upper === 'STOP' || upper === 'PAUSE') {
      this.state.isRunning = false;
      this.stopMotors();
      this.emitSerial('SYS:STOPPED');
    } else if (upper === 'RESET_SCAN') {
      this.state.scanMode = 'NORMAL_SWEEP';
      this.state.scanSpanDeg = 30;
      this.emitSerial('SYS:SCAN_NORMAL_RESET_30');
    } else if (upper.startsWith('PWM:')) {
      const p = parseInt(cmd.substring(4), 10);
      if (!isNaN(p)) {
        this.state.motorPwm = Math.max(175, Math.min(198, p));
        this.emitSerial(`PWM:${this.state.motorPwm}`);
      }
    } else if (upper.startsWith('GOTO:')) {
      const target = parseInt(cmd.substring(5), 10);
      if (!isNaN(target)) {
        this.state.servoAngle = Math.max(0, Math.min(180, target));
        this.state.gpioPins.pin18_servoPwm = this.state.servoAngle;
        const dist = this.sampleRaycastDistance(this.state.servoAngle);
        this.state.lastDistanceCm = dist;
        this.emitSerial(`PING:${this.state.servoAngle},${dist.toFixed(1)}`);
        this.emitSerial(`DIST:${dist.toFixed(1)}`);
      }
    } else if (upper === 'PING') {
      const dist = this.sampleRaycastDistance(this.state.servoAngle);
      this.state.lastDistanceCm = dist;
      this.emitSerial(`PING:${this.state.servoAngle},${dist.toFixed(1)}`);
      this.emitSerial(`DIST:${dist.toFixed(1)}`);
    } else if (upper.startsWith('MOVE:F')) {
      this.handleMoveForward(cmd);
    } else if (upper.startsWith('MOVE:B')) {
      this.handleMoveBackward(cmd);
    } else if (upper.startsWith('TURN:L')) {
      this.handleTurnLeft(cmd);
    } else if (upper.startsWith('TURN:R')) {
      this.handleTurnRight(cmd);
    } else if (upper.startsWith('SET_A:')) {
      // SET_A:x,y
      const parts = cmd.substring(6).split(',');
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          this.setPointA(x, y);
        }
      }
    } else if (upper.startsWith('SET_B:')) {
      // SET_B:x,y
      const parts = cmd.substring(6).split(',');
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          this.setPointB(x, y);
        }
      }
    } else if (upper === 'NAV_TO_B' || upper === 'NAV:START' || upper === 'AUTO:START') {
      this.startAutonomousNavigation();
    } else if (upper.startsWith('VORONOI:START') || upper.startsWith('RS232:RX,[VORONOI')) {
      // Execute Voronoi & Archimedean spiral
      const cx = this.targetCentroid?.x ?? 0;
      const cy = this.targetCentroid?.y ?? 150;
      this.startVoronoiAndSpiral({ x: cx, y: cy });
    } else if (upper === 'NAV:STOP' || upper === 'NAV:PAUSE' || upper === 'AUTO:STOP') {
      this.pauseNavigation();
    } else if (upper === 'NAV:RESET') {
      this.resetToPointA();
    } else if (upper.startsWith('SET_ALGO:')) {
      const algo = cmd.substring(9).trim().toLowerCase() as NavAlgorithmMode;
      if (['voronoi_lloyd_spiral', 'tangent_bug', 'reactive_sonar', 'potential_field'].includes(algo)) {
        this.state.navigation.algorithm = algo;
        this.emitSerial(`ALGO:SET,${algo}`);
      }
    }
  }

  // --- Motor control handlers ---
  private handleMoveForward(cmd: string) {
    const parts = cmd.split(',');
    const pwm = parts.length > 1 ? parseInt(parts[1], 10) : this.state.motorPwm;
    const dur = parts.length > 2 ? parseInt(parts[2], 10) : 450;
    this.driveForwardPhysical(pwm, dur);
  }

  private handleMoveBackward(cmd: string) {
    const parts = cmd.split(',');
    const pwm = parts.length > 1 ? parseInt(parts[1], 10) : this.state.motorPwm;
    const dur = parts.length > 2 ? parseInt(parts[2], 10) : 450;
    this.driveBackwardPhysical(pwm, dur);
  }

  private handleTurnLeft(cmd: string) {
    const parts = cmd.split(',');
    const pwm = parts.length > 1 ? parseInt(parts[1], 10) : this.state.motorPwm;
    const deg = parts.length > 2 ? parseInt(parts[2], 10) : 15;
    this.turnLeftPhysical(pwm, deg);
  }

  private handleTurnRight(cmd: string) {
    const parts = cmd.split(',');
    const pwm = parts.length > 1 ? parseInt(parts[1], 10) : this.state.motorPwm;
    const deg = parts.length > 2 ? parseInt(parts[2], 10) : 15;
    this.turnRightPhysical(pwm, deg);
  }

  private driveForwardPhysical(pwm: number, durationMs: number) {
    const speed = Math.max(175, Math.min(198, pwm));
    this.state.gpioPins.pin25_motorL1 = speed;
    this.state.gpioPins.pin26_motorL2 = 0;
    this.state.gpioPins.pin32_motorR1 = speed;
    this.state.gpioPins.pin33_motorR2 = 0;

    const distStep = (durationMs / 450) * 16.0;
    const rad = (this.state.odometry.heading * Math.PI) / 180;
    this.state.odometry.x += distStep * Math.cos(rad);
    this.state.odometry.y += distStep * Math.sin(rad);

    if (this.prevPoseForDetour) {
      this.state.navigation.detourDistanceCm += distStep;
    }

    this.stopMotors();
    this.emitSerial(
      `POS:${this.state.odometry.x.toFixed(1)},${this.state.odometry.y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`
    );
  }

  private driveBackwardPhysical(pwm: number, durationMs: number) {
    const speed = Math.max(175, Math.min(198, pwm));
    this.state.gpioPins.pin25_motorL1 = 0;
    this.state.gpioPins.pin26_motorL2 = speed;
    this.state.gpioPins.pin32_motorR1 = 0;
    this.state.gpioPins.pin33_motorR2 = speed;

    const distStep = (durationMs / 450) * 14.0;
    const rad = (this.state.odometry.heading * Math.PI) / 180;
    this.state.odometry.x -= distStep * Math.cos(rad);
    this.state.odometry.y -= distStep * Math.sin(rad);

    this.stopMotors();
    this.emitSerial(
      `POS:${this.state.odometry.x.toFixed(1)},${this.state.odometry.y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`
    );
  }

  private turnLeftPhysical(pwm: number, deg: number) {
    const speed = Math.max(175, Math.min(198, pwm));
    this.state.gpioPins.pin25_motorL1 = 0;
    this.state.gpioPins.pin26_motorL2 = speed;
    this.state.gpioPins.pin32_motorR1 = speed;
    this.state.gpioPins.pin33_motorR2 = 0;

    this.state.odometry.heading = (this.state.odometry.heading + deg) % 360;
    if (this.state.odometry.heading < 0) this.state.odometry.heading += 360;

    this.stopMotors();
    this.emitSerial(
      `POS:${this.state.odometry.x.toFixed(1)},${this.state.odometry.y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`
    );

    // Turn restores normal sweep span (0 to 30 and 0 to -30)
    this.state.scanMode = 'NORMAL_SWEEP';
    this.state.scanSpanDeg = 30;
    this.emitSerial('SYS:SCAN_NORMAL_RESET_30');
  }

  private turnRightPhysical(pwm: number, deg: number) {
    const speed = Math.max(175, Math.min(198, pwm));
    this.state.gpioPins.pin25_motorL1 = speed;
    this.state.gpioPins.pin26_motorL2 = 0;
    this.state.gpioPins.pin32_motorR1 = 0;
    this.state.gpioPins.pin33_motorR2 = speed;

    this.state.odometry.heading = (this.state.odometry.heading - deg) % 360;
    if (this.state.odometry.heading < 0) this.state.odometry.heading += 360;

    this.stopMotors();
    this.emitSerial(
      `POS:${this.state.odometry.x.toFixed(1)},${this.state.odometry.y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`
    );

    // Turn restores normal sweep span
    this.state.scanMode = 'NORMAL_SWEEP';
    this.state.scanSpanDeg = 30;
    this.emitSerial('SYS:SCAN_NORMAL_RESET_30');
  }

  private stopMotors() {
    this.state.gpioPins.pin25_motorL1 = 0;
    this.state.gpioPins.pin26_motorL2 = 0;
    this.state.gpioPins.pin32_motorR1 = 0;
    this.state.gpioPins.pin33_motorR2 = 0;
  }

  // --- Point A & B and Navigation Logic ---
  public setPointA(x: number, y: number) {
    this.state.navigation.pointA = { x, y };
    this.state.odometry.x = x;
    this.state.odometry.y = y;
    this.updateGoalDistance();
    this.emitSerial(`NAV:SET_A,${x.toFixed(1)},${y.toFixed(1)}`);
    this.emitSerial(`POS:${x.toFixed(1)},${y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`);
  }

  public setPointB(x: number, y: number) {
    this.state.navigation.pointB = { x, y };
    this.state.navigation.goalReached = false;
    this.updateGoalDistance();
    this.state.navigation.initialDistanceCm = this.state.navigation.distanceToGoalCm;
    this.emitSerial(`NAV:SET_B,${x.toFixed(1)},${y.toFixed(1)}`);
  }

  private updateGoalDistance() {
    const dx = this.state.navigation.pointB.x - this.state.odometry.x;
    const dy = this.state.navigation.pointB.y - this.state.odometry.y;
    this.state.navigation.distanceToGoalCm = Math.hypot(dx, dy);
  }

  public syncBotPose(x: number, y: number, heading: number) {
    this.state.odometry.x = x;
    this.state.odometry.y = y;
    this.state.odometry.heading = heading;
    this.updateGoalDistance();
  }

  public setAIWaypoints(waypoints: { x: number; y: number }[], algoName = 'Hybrid A* Kinematic', iters = 184) {
    this.aiWaypoints = waypoints.map((w) => ({ x: Number(w.x.toFixed(1)), y: Number(w.y.toFixed(1)) }));
    this.currentWaypointIndex = 0;
    this.state.navigation.algorithm = 'ai_optimal';
    this.emitSerial(`AI:PLAN_LOADED,ALGO=${algoName},ITERS=${iters},WAYPOINTS=${waypoints.length}`);
    this.emitSerial(`SYS:OPTIMAL_PATH_ENGAGED,MIN_TURNS=TRUE`);
  }

  public clearAIWaypoints() {
    this.aiWaypoints = [];
    this.currentWaypointIndex = 0;
    if (this.state.navigation.algorithm === 'ai_optimal') {
      this.state.navigation.algorithm = 'tangent_bug';
    }
  }

  public getAIWaypoints() {
    return this.aiWaypoints;
  }

  public getCurrentWaypointIndex() {
    return this.currentWaypointIndex;
  }

  public setSpiralConfig(config: Partial<ArchimedeanSpiralConfig>) {
    this.spiralConfig = { ...this.spiralConfig, ...config };
  }

  public getSpiralConfig(): ArchimedeanSpiralConfig {
    return this.spiralConfig;
  }

  public getSpiralState() {
    return {
      currentRadiusCm: this.spiralCurrentRadiusCm,
      currentThetaRad: this.spiralThetaRad,
      turnsCompleted: this.spiralTurnsCompleted,
      maxRadiusCm: this.spiralConfig.maxRadiusCm,
      center: this.targetCentroid,
      isActive: this.state.navigation.state === 'EXECUTING_SPIRAL',
      isComplete: this.state.navigation.state === 'SPIRAL_COMPLETE',
    };
  }

  public getRecognizedObstacles(): RecognizedObstacle[] {
    return Array.from(this.recognizedObstacles.values());
  }

  public clearRecognizedObstacles() {
    this.recognizedObstacles.clear();
  }

  public startVoronoiAndSpiral(
    centroid: { x: number; y: number },
    customSpiralConfig?: Partial<ArchimedeanSpiralConfig>,
    boundaryPolygon?: Point2D[]
  ) {
    this.state.isRunning = true;
    this.state.navigation.isActive = true;
    this.state.navigation.algorithm = 'voronoi_lloyd_spiral';
    this.state.navigation.state = 'MOVING_TO_CENTROID';
    this.targetCentroid = { ...centroid };
    this.state.navigation.targetCentroid = { ...centroid };
    this.state.navigation.pointB = { ...centroid };

    this.boundaryPolygon = boundaryPolygon || customSpiralConfig?.boundaryPolygon || [];

    // Calculate maximum allowable radius within the Voronoi partition with safety margin (15 cm)
    let maxSafeRadius = 140;
    if (this.boundaryPolygon && this.boundaryPolygon.length >= 3) {
      const inradius = computeCellMaxInradius(centroid, this.boundaryPolygon);
      maxSafeRadius = Math.max(15, Math.floor(inradius - 15));
    }

    if (customSpiralConfig) {
      this.spiralConfig = {
        ...this.spiralConfig,
        ...customSpiralConfig,
        center: centroid,
        maxRadiusCm: Math.min(customSpiralConfig.maxRadiusCm ?? 140, maxSafeRadius),
        boundaryPolygon: this.boundaryPolygon,
      };
    } else {
      this.spiralConfig.center = centroid;
      this.spiralConfig.maxRadiusCm = Math.min(this.spiralConfig.maxRadiusCm, maxSafeRadius);
      this.spiralConfig.boundaryPolygon = this.boundaryPolygon;
    }

    this.spiralThetaRad = 0;
    this.spiralCurrentRadiusCm = Math.max(0, this.spiralConfig.a);
    this.spiralTurnsCompleted = 0;
    this.centerArrivalTicks = 0;
    this.state.navigation.goalReached = false;
    this.state.navigation.detourDistanceCm = 0;

    // Simulate incoming RS232 synchronization packet
    const rsPacket = `RS232:RX,[VORONOI_LATCH],CENTROID=(${centroid.x.toFixed(1)},${centroid.y.toFixed(1)}),PITCH=${this.spiralConfig.pitchCm}CM,R_MAX=${this.spiralConfig.maxRadiusCm}CM,DIR=${this.spiralConfig.direction}`;
    this.rs232LastPacket = rsPacket;
    this.emitSerial(rsPacket);
    this.emitSerial(`NAV:STATUS,MOVING_TO_CENTROID`);
    this.emitSerial(`ESP32:TRANSIT_START,TARGET=CENTROID,X=${centroid.x.toFixed(1)},Y=${centroid.y.toFixed(1)}`);
  }

  public startAutonomousNavigation() {
    this.state.isRunning = true;
    this.state.navigation.isActive = true;
    this.state.navigation.state = 'CRUISING';
    this.state.navigation.goalReached = false;
    this.state.navigation.detourDistanceCm = 0;
    this.emitSerial(`ESP32:AUTO_NAV_START,INTELLIGENT_OBSTACLE_AVOIDANCE`);
  }

  public startNavigationToB() {
    this.startAutonomousNavigation();
  }

  public pauseNavigation() {
    this.state.navigation.isActive = false;
    this.state.navigation.state = 'IDLE';
    this.stopMotors();
    this.emitSerial('NAV:PAUSED');
  }

  public resetToPointA() {
    this.state.navigation.isActive = false;
    this.state.navigation.state = 'IDLE';
    this.state.navigation.goalReached = false;
    this.state.navigation.detourDistanceCm = 0;
    this.state.navigation.obstaclesAvoidedCount = 0;
    this.state.odometry.x = this.state.navigation.pointA.x;
    this.state.odometry.y = this.state.navigation.pointA.y;
    this.state.odometry.heading = 90;
    this.stopMotors();
    this.updateGoalDistance();
    this.emitSerial(`NAV:RESET_TO_A`);
    this.emitSerial(
      `POS:${this.state.odometry.x.toFixed(1)},${this.state.odometry.y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`
    );
  }

  // --- Environment & Obstacle Management ---
  public setPreset(preset: MapEnvironmentPreset) {
    this.preset = preset;
  }

  public getDynamicObstacles(): DynamicObstacle[] {
    return this.dynamicObstacles;
  }

  public setDynamicObstacles(obs: DynamicObstacle[]) {
    this.dynamicObstacles = obs;
  }

  public addDynamicObstacle(x: number, y: number, radius: number = 18, label?: string) {
    const newObs: DynamicObstacle = {
      id: `obs-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      radius: Math.max(8, Math.min(50, radius)),
      label: label || `Obstáculo ${this.dynamicObstacles.length + 1}`,
    };
    this.dynamicObstacles.push(newObs);
    this.emitSerial(`SYS:OBSTACLE_ADDED,${newObs.x},${newObs.y},R=${newObs.radius}`);
    return newObs;
  }

  public removeDynamicObstacle(id: string) {
    this.dynamicObstacles = this.dynamicObstacles.filter((o) => o.id !== id);
    this.emitSerial(`SYS:OBSTACLE_REMOVED,${id}`);
  }

  public clearDynamicObstacles() {
    this.dynamicObstacles = [];
    this.emitSerial(`SYS:OBSTACLES_CLEARED`);
  }

  public spawnRandomObstaclesBetweenAandB(count: number = 4) {
    const a = this.state.navigation.pointA;
    const b = this.state.navigation.pointB;
    const newObstacles: DynamicObstacle[] = [];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 40) return;

    const perpX = -dy / dist;
    const perpY = dx / dist;

    for (let i = 1; i <= count; i++) {
      const frac = i / (count + 1);
      // center on line with random perpendicular jitter
      const lateralJitter = (Math.random() - 0.5) * 60;
      const ox = a.x + dx * frac + perpX * lateralJitter;
      const oy = a.y + dy * frac + perpY * lateralJitter;
      const r = Math.round(14 + Math.random() * 12);

      newObstacles.push({
        id: `obs-rnd-${Date.now()}-${i}`,
        x: Number(ox.toFixed(1)),
        y: Number(oy.toFixed(1)),
        radius: r,
        label: `Bloque ${i}`,
      });
    }

    this.dynamicObstacles = newObstacles;
    this.emitSerial(`SYS:SPAWNED_${count}_OBSTACLES`);
  }

  // --- Ultrasonic Raycaster (Checks Preset World + Dynamic Obstacles) ---
  public sampleRaycastDistance(sensorAngleDeg: number): number {
    const bot = this.state.odometry;
    const offsetFromForward = sensorAngleDeg - 90;
    const beamAngleDeg = bot.heading + offsetFromForward;
    const beamRad = (beamAngleDeg * Math.PI) / 180;
    const dx = Math.cos(beamRad);
    const dy = Math.sin(beamRad);

    let closestDist = 300; // max range

    // 1. Raycast on defined circular obstacles
    const layout = WORLD_PRESETS[this.preset] || WORLD_PRESETS.dungeon_chamber;

    for (const circ of layout.circles) {
      const dist = this.intersectRayCircle(bot.x, bot.y, dx, dy, circ.cx, circ.cy, circ.radius);
      if (dist !== null && dist < closestDist && dist >= 2) {
        closestDist = dist;
      }
    }

    // 2. Raycast on dynamic obstacles placed between Point A and Point B
    for (const obs of this.dynamicObstacles) {
      const dist = this.intersectRayCircle(bot.x, bot.y, dx, dy, obs.x, obs.y, obs.radius);
      if (dist !== null && dist < closestDist && dist >= 2) {
        closestDist = dist;
      }
    }

    // Physical sensor jitter
    const jitter = (Math.random() - 0.5) * 0.8;
    return Math.max(2, Math.min(300, Number((closestDist + jitter).toFixed(1))));
  }

  private intersectRayLine(
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
    const dot = v2x * -dy + v2y * dx;
    if (Math.abs(dot) < 0.000001) return null;
    const t1 = (v2x * v1y - v2y * v1x) / dot;
    const t2 = (v1x * -dy + v1y * dx) / dot;
    if (t1 > 0.01 && t2 >= 0 && t2 <= 1) return t1;
    return null;
  }

  private intersectRayCircle(
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
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const sqrtD = Math.sqrt(disc);
    const t1 = (-b - sqrtD) / (2 * a);
    const t2 = (-b + sqrtD) / (2 * a);
    if (t1 > 0.01) return t1;
    if (t2 > 0.01) return t2;
    return null;
  }

  // --- Real-time Simulator Loop (ticks every 40ms = 25Hz virtual ESP32 cycle) ---
  public start() {
    if (this.tickInterval) return;
    this.lastTickTimestamp = Date.now();
    this.tickInterval = setInterval(() => this.tick(), 40);
    this.emitSerial('SYS:READY,ESP32_V2_NAV_EMULATOR');
    this.emitSerial(`SYS:START_ANGLE,90`);
    this.emitSerial(`SYS:PWM_RANGE,175,198`);
    this.emitSerial(`PWM:${this.state.motorPwm}`);
    this.emitSerial(
      `POS:${this.state.odometry.x.toFixed(1)},${this.state.odometry.y.toFixed(1)},${this.state.odometry.heading.toFixed(1)}`
    );
  }

  public stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  public getSnapshot(): ESP32HardwareState {
    return JSON.parse(JSON.stringify(this.state));
  }

  private tick() {
    const now = Date.now();
    const dt = Math.max(1, now - this.lastTickTimestamp);
    this.lastTickTimestamp = now;
    this.state.millis += dt;

    if (!this.state.isRunning) return;

    // 1. Sonar servo sweep simulation (running continuously on ESP32)
    this.tickSonarSweep(now);

    // 2. Autonomous Navigation state machine if active
    if (this.state.navigation.isActive && !this.state.navigation.goalReached) {
      this.tickAutonomousNavigation();
    }
  }

  private tickSonarSweep(now: number) {
    const STEP_DELAY = 65; // ~65ms step period
    if (now - this.lastScanStepTime < STEP_DELAY) return;
    this.lastScanStepTime = now;

    // During wide probe or reversing, the navigation state machine handles the servo
    if (this.state.navigation.isActive && (this.state.navigation.state === 'PROBING_WIDE' || this.state.navigation.state === 'REVERSING_ESCAPE')) {
      return;
    }

    const CENTER_ANGLE = 90;
    const NORMAL_SPAN = 30; // 60° to 120°
    const OBSTACLE_SPAN = 10; // 80° to 100°
    const OBSTACLE_TRIGGER_CM = 40.0;

    // Step A: Sample ultrasonic distance at current servo angle
    const distance = this.sampleRaycastDistance(this.state.servoAngle);
    this.state.lastDistanceCm = distance;

    // Emit serial telemetry
    this.emitSerial(`PING:${this.state.servoAngle},${distance.toFixed(1)}`);
    this.emitSerial(`DIST:${distance.toFixed(1)}`);

    // Intelligent Obstacle Recognition & Clustering in ESP32 memory
    if (distance <= 65.0) {
      const bot = this.state.odometry;
      const relAngleDeg = this.state.servoAngle - 90;
      const worldAngleDeg = (bot.heading + relAngleDeg + 360) % 360;
      const worldAngleRad = (worldAngleDeg * Math.PI) / 180;
      const obsWorldX = Number((bot.x + distance * Math.cos(worldAngleRad)).toFixed(1));
      const obsWorldY = Number((bot.y + distance * Math.sin(worldAngleRad)).toFixed(1));

      const threatLevel: 'low' | 'medium' | 'critical' =
        distance <= 28 ? 'critical' : distance <= 44 ? 'medium' : 'low';
      const recommendedAction = relAngleDeg >= 0 ? 'steer_right' : 'steer_left';

      const clusterKey = `obs_${Math.round(obsWorldX / 25) * 25}_${Math.round(obsWorldY / 25) * 25}`;
      this.recognizedObstacles.set(clusterKey, {
        id: clusterKey,
        worldX: obsWorldX,
        worldY: obsWorldY,
        distanceCm: distance,
        angleDeg: worldAngleDeg,
        threatLevel,
        recommendedAction,
        lastSeenMillis: this.state.millis,
      });

      if (this.recognizedObstacles.size > 30) {
        const oldestKeys = Array.from(this.recognizedObstacles.keys()).slice(0, 5);
        oldestKeys.forEach((k) => this.recognizedObstacles.delete(k));
      }
    }

    // Step B: Obstacle trigger evaluation
    if (distance <= OBSTACLE_TRIGGER_CM) {
      if (this.state.scanMode !== 'OBSTACLE_REDUCED_SWEEP' && this.state.scanMode !== 'WIDE_PROBE_SWEEP') {
        this.state.scanMode = 'OBSTACLE_REDUCED_SWEEP';
        this.state.scanSpanDeg = OBSTACLE_SPAN;
        this.emitSerial(`ALERT:OBSTACLE_REDUCED_SPAN,${distance.toFixed(1)}`);
      }
    } else if (this.state.scanMode === 'OBSTACLE_REDUCED_SWEEP' && distance > OBSTACLE_TRIGGER_CM + 15) {
      // Clear
      this.state.scanMode = 'NORMAL_SWEEP';
      this.state.scanSpanDeg = NORMAL_SPAN;
    }

    // Step C: Advance servo angle
    const activeSpan =
      this.state.scanMode === 'WIDE_PROBE_SWEEP'
        ? 65
        : this.state.scanMode === 'OBSTACLE_REDUCED_SWEEP'
        ? OBSTACLE_SPAN
        : NORMAL_SPAN;
    const minAngle = CENTER_ANGLE - activeSpan;
    const maxAngle = CENTER_ANGLE + activeSpan;

    if (this.state.servoAngle > maxAngle) {
      this.state.servoAngle = maxAngle;
      this.state.sweepDirection = -1;
    } else if (this.state.servoAngle < minAngle) {
      this.state.servoAngle = minAngle;
      this.state.sweepDirection = 1;
    } else {
      this.state.servoAngle += this.state.sweepDirection * 3;
      if (this.state.servoAngle >= maxAngle) {
        this.state.servoAngle = maxAngle;
        this.state.sweepDirection = -1;
      } else if (this.state.servoAngle <= minAngle) {
        this.state.servoAngle = minAngle;
        this.state.sweepDirection = 1;
      }
    }

    this.state.gpioPins.pin18_servoPwm = this.state.servoAngle;
  }

  // --- Voronoi Cell Centroid Transit & Archimedean Spiral Execution ---
  private tickVoronoiSpiralNavigation() {
    const nav = this.state.navigation;
    const bot = this.state.odometry;

    // Direct front distance check
    const frontDist = this.sampleRaycastDistance(90);
    this.state.lastDistanceCm = frontDist;
    const isObstacleAhead = frontDist <= 44.0;

    // Critical proximity escape
    if (frontDist <= 26.0 && nav.state !== 'REVERSING_ESCAPE') {
      this.stopMotors();
      nav.state = 'REVERSING_ESCAPE';
      this.reverseTicksRemaining = 6;
      this.escapePivotDeg = 40;
      this.emitSerial(`ESP32:CRITICAL_PROXIMITY,DIST=${frontDist.toFixed(1)}CM,REVERSING`);
      return;
    }

    // 1. Transit to Voronoi Cell Centroid
    if (
      nav.state === 'MOVING_TO_CENTROID' ||
      nav.state === 'ORIENTING' ||
      nav.state === 'CRUISING'
    ) {
      const target = this.targetCentroid;
      const dx = target.x - bot.x;
      const dy = target.y - bot.y;
      const distToCentroid = Math.hypot(dx, dy);
      nav.distanceToGoalCm = distToCentroid;

      // Centroid arrival check:
      // Must physically arrive AT the center of this Voronoi point before beginning the spiral!
      if (distToCentroid <= 6.0) {
        // Docks precisely at the center of this Voronoi point/cell
        bot.x = target.x;
        bot.y = target.y;
        nav.distanceToGoalCm = 0;
        this.centerArrivalTicks = 4; // Brief centering stabilization pause (200ms)
        nav.state = 'ARRIVED_AT_CENTER';
        this.stopMotors();
        this.emitSerial(`NAV:STATUS,ARRIVED_AT_CENTER`);
        this.emitSerial(
          `ESP32:CENTER_REACHED,POINT=(${target.x.toFixed(1)},${target.y.toFixed(1)}),DIST=0.0CM,READY_FOR_SPIRAL`
        );
        this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);
        return;
      }

      // Check obstacle in transit to centroid
      if (isObstacleAhead) {
        const leftDist = this.sampleRaycastDistance(135);
        const rightDist = this.sampleRaycastDistance(45);
        this.avoidanceDirection = rightDist >= 42 ? 'right' : leftDist >= 42 ? 'left' : 'right';
        nav.state = this.avoidanceDirection === 'right' ? 'AVOIDING_RIGHT' : 'AVOIDING_LEFT';
        this.avoidanceTicksRemaining = 10;
        this.emitSerial(
          `ESP32:OBSTACLE_AVOIDANCE,DIR=${this.avoidanceDirection.toUpperCase()},CLEAR_R=${rightDist.toFixed(0)},CLEAR_L=${leftDist.toFixed(0)}`
        );
        return;
      }

      // Compute heading to centroid
      let targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (targetHeading < 0) targetHeading += 360;
      let headingError = targetHeading - bot.heading;
      while (headingError > 180) headingError -= 360;
      while (headingError < -180) headingError += 360;

      if (Math.abs(headingError) > 6.0) {
        const turnStep = Math.sign(headingError) * Math.min(10.0, Math.abs(headingError));
        bot.heading = (bot.heading + turnStep + 360) % 360;
      }

      // Drive forward with deceleration when close to center for high precision docking
      const speedPwm = distToCentroid < 25 ? Math.max(130, Math.round(this.state.motorPwm * 0.75)) : this.state.motorPwm;
      this.state.gpioPins.pin25_motorL1 = speedPwm;
      this.state.gpioPins.pin26_motorL2 = 0;
      this.state.gpioPins.pin32_motorR1 = speedPwm;
      this.state.gpioPins.pin33_motorR2 = 0;

      const stepCm = Math.min(3.4, Math.max(1.2, distToCentroid));
      const rad = (bot.heading * Math.PI) / 180;
      bot.x += stepCm * Math.cos(rad);
      bot.y += stepCm * Math.sin(rad);
      this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);
      return;
    }

    // 2. Centering State: Robot is at the exact center of this Voronoi point, preparing spiral
    if (nav.state === 'ARRIVED_AT_CENTER') {
      this.stopMotors();
      this.centerArrivalTicks--;
      if (this.centerArrivalTicks <= 0) {
        nav.state = 'EXECUTING_SPIRAL';
        this.spiralThetaRad = 0;
        this.spiralCurrentRadiusCm = Math.max(0, this.spiralConfig.a);
        this.spiralTurnsCompleted = 0;
        nav.spiralCurrentRadiusCm = Number(this.spiralCurrentRadiusCm.toFixed(1));
        nav.spiralTurnsCompleted = 0;
        this.emitSerial(`NAV:STATUS,EXECUTING_SPIRAL`);
        this.emitSerial(
          `ESP32:SPIRAL_START_FROM_CENTER,ORIGIN=(${this.targetCentroid.x.toFixed(1)},${this.targetCentroid.y.toFixed(1)}),PITCH=${this.spiralConfig.pitchCm}CM,MAX_R=${this.spiralConfig.maxRadiusCm}CM`
        );
      }
      return;
    }

    // 3. Executing Archimedean Spiral: r(theta) = a + b * theta
    // CRITICAL CONSTRAINT: The spiral strictly respects the boundaries of the Voronoi partition.
    // It will NEVER pass or exceed the limits of the Voronoi cell!
    if (nav.state === 'EXECUTING_SPIRAL') {
      const b = this.spiralConfig.pitchCm / (2 * Math.PI);
      const safetyMarginCm = 15.0; // 15 cm safety perimeter from any Voronoi partition edge

      // Determine inradius limit inside the Voronoi cell polygon with safety clearance
      let effectiveMaxRadius = this.spiralConfig.maxRadiusCm;
      if (this.boundaryPolygon && this.boundaryPolygon.length >= 3) {
        const cellInradius = computeCellMaxInradius(this.targetCentroid, this.boundaryPolygon);
        effectiveMaxRadius = Math.min(this.spiralConfig.maxRadiusCm, Math.max(12, cellInradius - safetyMarginCm));
      }

      // Angular increment pacing: constant linear arc velocity along the Archimedean spiral
      const rCurrent = Math.max(2.0, this.spiralCurrentRadiusCm);
      const deltaTheta = Math.max(0.02, Math.min(0.35, 3.2 / Math.sqrt(b * b + rCurrent * rCurrent)));
      const nextTheta = this.spiralThetaRad + deltaTheta;
      const nextRadius = this.spiralConfig.a + b * nextTheta;

      // Compute next target point on spiral
      const sign = this.spiralConfig.direction === 'clockwise' ? -1 : 1;
      const spiralTargetX = this.targetCentroid.x + nextRadius * Math.cos(sign * nextTheta);
      const spiralTargetY = this.targetCentroid.y + nextRadius * Math.sin(sign * nextTheta);
      const candidatePoint = { x: spiralTargetX, y: spiralTargetY };

      // Strictly verify if point would exceed the Voronoi cell partition boundary
      const isInsideVoronoi =
        this.boundaryPolygon.length < 3 ||
        isPointInsidePolygon(candidatePoint, this.boundaryPolygon, safetyMarginCm);
      const distToBoundary =
        this.boundaryPolygon.length >= 3
          ? distToPolygonBoundary(candidatePoint, this.boundaryPolygon)
          : Infinity;
      const botDistToBoundary =
        this.boundaryPolygon.length >= 3
          ? distToPolygonBoundary(bot, this.boundaryPolygon)
          : Infinity;

      // Check max radius limit OR reaching the Voronoi partition boundary (NEVER CROSS LIMITS)
      if (
        nextRadius > effectiveMaxRadius ||
        !isInsideVoronoi ||
        distToBoundary < safetyMarginCm ||
        botDistToBoundary < 12.0
      ) {
        nav.state = 'SPIRAL_COMPLETE';
        nav.goalReached = true;
        nav.isActive = false;
        this.stopMotors();
        this.emitSerial(`NAV:STATUS,SPIRAL_COMPLETE`);
        this.emitSerial(`NAV:GOAL_REACHED`);
        this.emitSerial(
          `ESP32:SPIRAL_COMPLETE,VORONOI_BOUNDARY_REACHED,R=${this.spiralCurrentRadiusCm.toFixed(1)}CM,TURNS=${this.spiralTurnsCompleted},DIST_EDGE=${botDistToBoundary.toFixed(1)}CM`
        );
        return;
      }

      this.spiralThetaRad = nextTheta;
      this.spiralCurrentRadiusCm = nextRadius;
      this.spiralTurnsCompleted = Number((this.spiralThetaRad / (2 * Math.PI)).toFixed(2));
      nav.spiralCurrentRadiusCm = Number(this.spiralCurrentRadiusCm.toFixed(1));
      nav.spiralTurnsCompleted = this.spiralTurnsCompleted;

      // Check obstacle in front during spiral
      if (isObstacleAhead) {
        const leftDist = this.sampleRaycastDistance(135);
        const rightDist = this.sampleRaycastDistance(45);
        const steerDir = rightDist >= leftDist ? 1 : -1;
        bot.heading = (bot.heading + steerDir * 12 + 360) % 360;
        nav.obstaclesAvoidedCount++;
        this.emitSerial(
          `ESP32:SPIRAL_OBSTACLE_BYPASS,DIST=${frontDist.toFixed(1)}CM,STEER=${steerDir > 0 ? 'RIGHT' : 'LEFT'}`
        );
      } else {
        const dx = spiralTargetX - bot.x;
        const dy = spiralTargetY - bot.y;
        let spiralHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (spiralHeading < 0) spiralHeading += 360;
        let headingError = spiralHeading - bot.heading;
        while (headingError > 180) headingError -= 360;
        while (headingError < -180) headingError += 360;

        const turnStep = Math.sign(headingError) * Math.min(14.0, Math.abs(headingError));
        bot.heading = (bot.heading + turnStep + 360) % 360;
      }

      // Advance bot along spiral
      const speedPwm = this.state.motorPwm;
      this.state.gpioPins.pin25_motorL1 = speedPwm;
      this.state.gpioPins.pin26_motorL2 = 0;
      this.state.gpioPins.pin32_motorR1 = speedPwm;
      this.state.gpioPins.pin33_motorR2 = 0;

      const stepCm = 3.2;
      const rad = (bot.heading * Math.PI) / 180;
      const nextX = bot.x + stepCm * Math.cos(rad);
      const nextY = bot.y + stepCm * Math.sin(rad);

      // Boundary safety guard on the robot body itself
      if (this.boundaryPolygon.length >= 3) {
        const nextDistToEdge = distToPolygonBoundary({ x: nextX, y: nextY }, this.boundaryPolygon);
        if (nextDistToEdge < 11.0) {
          nav.state = 'SPIRAL_COMPLETE';
          nav.goalReached = true;
          nav.isActive = false;
          this.stopMotors();
          this.emitSerial(`NAV:STATUS,SPIRAL_COMPLETE`);
          this.emitSerial(`NAV:GOAL_REACHED`);
          this.emitSerial(
            `ESP32:SPIRAL_COMPLETE,PHYSICAL_BOUNDARY_REACHED,R=${this.spiralCurrentRadiusCm.toFixed(1)}CM`
          );
          return;
        }
      }

      bot.x = nextX;
      bot.y = nextY;

      // Emit POS update so React hooks update botPose and draw trajectory breadcrumbs in real-time
      this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);
      this.emitSerial(
        `SPIRAL:R=${this.spiralCurrentRadiusCm.toFixed(1)},THETA=${((this.spiralThetaRad * 180) / Math.PI).toFixed(0)},POS=(${bot.x.toFixed(1)},${bot.y.toFixed(1)})`
      );
      return;
    }

    // 3. Evasive manoeuvres in Voronoi/Spiral
    if (nav.state === 'AVOIDING_RIGHT' || nav.state === 'AVOIDING_LEFT') {
      const turnDeg = nav.state === 'AVOIDING_RIGHT' ? -12 : 12;
      bot.heading = (bot.heading + turnDeg + 360) % 360;
      const speedPwm = this.state.motorPwm;
      this.state.gpioPins.pin25_motorL1 = speedPwm;
      this.state.gpioPins.pin26_motorL2 = 0;
      this.state.gpioPins.pin32_motorR1 = speedPwm;
      this.state.gpioPins.pin33_motorR2 = 0;
      const rad = (bot.heading * Math.PI) / 180;
      bot.x += 2.5 * Math.cos(rad);
      bot.y += 2.5 * Math.sin(rad);

      this.avoidanceTicksRemaining--;
      if (this.avoidanceTicksRemaining <= 0) {
        nav.state = 'MOVING_TO_CENTROID';
      }
      return;
    }

    if (nav.state === 'REVERSING_ESCAPE') {
      this.driveBackwardPhysical(this.state.motorPwm, 250);
      this.reverseTicksRemaining--;
      if (this.reverseTicksRemaining <= 0) {
        bot.heading = (bot.heading + this.escapePivotDeg + 360) % 360;
        nav.state = 'MOVING_TO_CENTROID';
      }
      return;
    }
  }

  // --- Autonomous Navigation Algorithm for Point A -> Point B with Obstacle Avoidance ---
  private tickAutonomousNavigation() {
    const nav = this.state.navigation;
    const bot = this.state.odometry;

    if (nav.algorithm === 'voronoi_lloyd_spiral') {
      this.tickVoronoiSpiralNavigation();
      return;
    }

    // AI Waypoint Target Selection
    const isUsingAI = nav.algorithm === 'ai_optimal' && this.aiWaypoints.length > 0;
    let target = nav.pointB;

    if (isUsingAI) {
      const currentWP = this.aiWaypoints[this.currentWaypointIndex];
      if (currentWP) {
        target = currentWP;
        const distToWP = Math.hypot(target.x - bot.x, target.y - bot.y);
        if (distToWP <= 16.0 && this.currentWaypointIndex < this.aiWaypoints.length - 1) {
          this.currentWaypointIndex++;
          this.emitSerial(`AI:WP_ADVANCE,IDX=${this.currentWaypointIndex + 1}/${this.aiWaypoints.length}`);
          target = this.aiWaypoints[this.currentWaypointIndex];
        }
      }
    }

    const distToFinalGoal = Math.hypot(nav.pointB.x - bot.x, nav.pointB.y - bot.y);
    nav.distanceToGoalCm = distToFinalGoal;

    // Check if goal reached (within 14 cm tolerance radius)
    if (distToFinalGoal <= 14.0) {
      nav.goalReached = true;
      nav.isActive = false;
      nav.state = 'GOAL_REACHED';
      this.stopMotors();
      this.emitSerial(`NAV:GOAL_REACHED,DIST_TO_B=${distToFinalGoal.toFixed(1)},TOTAL_DETOUR=${nav.detourDistanceCm.toFixed(1)}`);
      return;
    }

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;

    // Target heading directly towards active target (intermediate AI waypoint or Point B)
    let targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (targetHeading < 0) targetHeading += 360;

    // Compute heading error (-180 to +180)
    let headingError = targetHeading - bot.heading;
    while (headingError > 180) headingError -= 360;
    while (headingError < -180) headingError += 360;

    // Direct front distance check (center at 90°)
    const frontDist = this.sampleRaycastDistance(90);
    this.state.lastDistanceCm = frontDist;
    const isObstacleAhead = frontDist <= 46.0;

    switch (nav.state) {
      case 'ORIENTING': {
        // Rotate towards Point B
        if (Math.abs(headingError) > 8.0) {
          const turnStep = Math.sign(headingError) * Math.min(10, Math.abs(headingError));
          bot.heading = (bot.heading + turnStep) % 360;
          if (bot.heading < 0) bot.heading += 360;
          this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);
        } else {
          nav.state = 'CRUISING';
          this.state.scanMode = 'NORMAL_SWEEP';
          this.state.scanSpanDeg = 30;
          this.emitSerial(`NAV:STATUS,CRUISING,HEAD=${bot.heading.toFixed(0)}`);
        }
        break;
      }

      case 'CRUISING': {
        // Al detectar un obstáculo antes de llegar a él (dist <= 46cm),
        // amplía su lógica de sonda para aumentar el rango en grados y validar posibles obstáculos
        if (isObstacleAhead) {
          this.stopMotors();
          nav.state = 'PROBING_WIDE';
          this.state.scanMode = 'WIDE_PROBE_SWEEP';
          this.state.scanSpanDeg = 65; // Amplía a rango de 25° a 155°
          this.probeStep = 0;
          this.emitSerial(`SONDA:AMPLIANDO_RANGO_GRADOS,DIST_FRONT=${frontDist.toFixed(1)},SPAN=130DEG`);
          this.emitSerial(`NAV:STATUS,PROBING_WIDE`);
          return;
        }

        // Re-orient slightly toward goal if drifting
        if (Math.abs(headingError) > 12.0) {
          const turnStep = Math.sign(headingError) * 6;
          bot.heading = (bot.heading + turnStep) % 360;
          if (bot.heading < 0) bot.heading += 360;
        }

        // Step forward towards Point B
        const speedPwm = this.state.motorPwm;
        this.state.gpioPins.pin25_motorL1 = speedPwm;
        this.state.gpioPins.pin26_motorL2 = 0;
        this.state.gpioPins.pin32_motorR1 = speedPwm;
        this.state.gpioPins.pin33_motorR2 = 0;

        const stepCm = 3.5;
        const rad = (bot.heading * Math.PI) / 180;
        bot.x += stepCm * Math.cos(rad);
        bot.y += stepCm * Math.sin(rad);
        nav.detourDistanceCm += stepCm;

        this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);
        break;
      }

      case 'PROBING_WIDE': {
        // Sonda ampliada en grados: realiza barrido panorámico visual y evalúa sectores
        this.probeStep++;

        if (this.probeStep <= 3) {
          // Muestreo sector DERECHO amplio (40°)
          this.state.servoAngle = 40;
          this.state.gpioPins.pin18_servoPwm = 40;
          const dRight = this.sampleRaycastDistance(40);
          this.state.lastDistanceCm = dRight;
          this.emitSerial(`PING:40,${dRight.toFixed(1)}`);
          return;
        }

        if (this.probeStep <= 6) {
          // Muestreo sector IZQUIERDO amplio (140°)
          this.state.servoAngle = 140;
          this.state.gpioPins.pin18_servoPwm = 140;
          const dLeft = this.sampleRaycastDistance(140);
          this.state.lastDistanceCm = dLeft;
          this.emitSerial(`PING:140,${dLeft.toFixed(1)}`);
          return;
        }

        // Paso 3: Análisis completo de despeje en sectores
        this.state.servoAngle = 90;
        this.state.gpioPins.pin18_servoPwm = 90;

        const dRight35 = this.sampleRaycastDistance(35);
        const dRight65 = this.sampleRaycastDistance(65);
        const dLeft115 = this.sampleRaycastDistance(115);
        const dLeft145 = this.sampleRaycastDistance(145);

        const clearRight = Math.min(dRight35, dRight65);
        const clearLeft = Math.min(dLeft115, dLeft145);
        const MIN_CLEARANCE_CM = 42.0;

        this.emitSerial(
          `SONDA:EVALUACION_SECTORES,CLEAR_R=${clearRight.toFixed(1)},CLEAR_L=${clearLeft.toFixed(1)},MIN_REQ=${MIN_CLEARANCE_CM}`
        );

        // Regla: "siempre esquivara los objetos por derecha en el caso de ser posible si no por izquierda,
        // en caso de encontrarse encerrado, dara marcha atras validando una nueva ruta a tomar"
        if (clearRight >= MIN_CLEARANCE_CM) {
          // Esquiva por la derecha (prioridad preferente)
          nav.obstaclesAvoidedCount++;
          this.avoidanceDirection = 'right';
          this.avoidanceTicksRemaining = 8;
          nav.state = 'AVOIDING_RIGHT';
          this.emitSerial(`NAV:DECISION,ESQUIVE_POR_DERECHA_PREFERENTE,CLEAR_R=${clearRight.toFixed(1)}`);
          this.emitSerial(`NAV:AVOID_DECISION,DIR=RIGHT,CLEAR_R=${clearRight.toFixed(1)}`);
        } else if (clearLeft >= MIN_CLEARANCE_CM) {
          // Derecha bloqueada, esquiva por la izquierda (secundario)
          nav.obstaclesAvoidedCount++;
          this.avoidanceDirection = 'left';
          this.avoidanceTicksRemaining = 8;
          nav.state = 'AVOIDING_LEFT';
          this.emitSerial(`NAV:DECISION,ESQUIVE_POR_IZQUIERDA_ALTERNATIVO,CLEAR_L=${clearLeft.toFixed(1)}`);
          this.emitSerial(`NAV:AVOID_DECISION,DIR=LEFT,CLEAR_L=${clearLeft.toFixed(1)}`);
        } else {
          // Encerrado (ambos lados bloqueados): marcha atrás para validar nueva ruta
          this.reverseTicksRemaining = 8; // ~20 cm de retroceso
          this.escapePivotDeg = (clearRight >= clearLeft ? -45 : 45);
          nav.state = 'REVERSING_ESCAPE';
          this.emitSerial(
            `ALERTA:ENCERRADO_SIN_SALIDA,INICIANDO_MARCHA_ATRAS,R=${clearRight.toFixed(1)},L=${clearLeft.toFixed(1)}`
          );
          this.emitSerial('NAV:STATUS,REVERSING_ESCAPE');
        }
        break;
      }

      case 'REVERSING_ESCAPE': {
        // Marcha atrás del ESP32 por estar encerrado
        const speed = this.state.motorPwm;
        this.state.gpioPins.pin25_motorL1 = 0;
        this.state.gpioPins.pin26_motorL2 = speed;
        this.state.gpioPins.pin32_motorR1 = 0;
        this.state.gpioPins.pin33_motorR2 = speed;

        const stepCm = 2.4;
        const rad = (bot.heading * Math.PI) / 180;
        bot.x -= stepCm * Math.cos(rad);
        bot.y -= stepCm * Math.sin(rad);
        nav.detourDistanceCm += stepCm;

        this.reverseTicksRemaining--;
        this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);

        if (this.reverseTicksRemaining <= 0) {
          this.stopMotors();
          // Pivotar para explorar ángulo alternativo
          bot.heading = (bot.heading + this.escapePivotDeg + 360) % 360;
          this.state.scanMode = 'NORMAL_SWEEP';
          this.state.scanSpanDeg = 30;
          nav.state = 'ORIENTING';
          this.emitSerial(`NAV:RETROCESO_COMPLETO,NUEVA_ORIENTACION=${bot.heading.toFixed(0)}`);
          this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);
        }
        break;
      }

      case 'AVOIDING_RIGHT': {
        // Giro inicial hacia la derecha para contornear
        if (this.avoidanceTicksRemaining === 8) {
          bot.heading = (bot.heading - 36 + 360) % 360;
        }
        const stepCm = 2.4;
        const rad = (bot.heading * Math.PI) / 180;
        bot.x += stepCm * Math.cos(rad);
        bot.y += stepCm * Math.sin(rad);
        nav.detourDistanceCm += stepCm;

        this.avoidanceTicksRemaining--;
        this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);

        if (this.avoidanceTicksRemaining <= 0) {
          const frontClear = this.sampleRaycastDistance(90);
          if (frontClear > 45.0) {
            nav.state = 'REJOINING_GOAL';
            this.emitSerial(`NAV:REJOIN_GOAL,FRONT_CLEAR=${frontClear.toFixed(0)}`);
          } else {
            // Continúa contorneando si el frente sigue cerrado
            this.avoidanceTicksRemaining = 4;
          }
        }
        break;
      }

      case 'AVOIDING_LEFT': {
        // Giro inicial hacia la izquierda para contornear
        if (this.avoidanceTicksRemaining === 8) {
          bot.heading = (bot.heading + 36) % 360;
        }
        const stepCm = 2.4;
        const rad = (bot.heading * Math.PI) / 180;
        bot.x += stepCm * Math.cos(rad);
        bot.y += stepCm * Math.sin(rad);
        nav.detourDistanceCm += stepCm;

        this.avoidanceTicksRemaining--;
        this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);

        if (this.avoidanceTicksRemaining <= 0) {
          const frontClear = this.sampleRaycastDistance(90);
          if (frontClear > 45.0) {
            nav.state = 'REJOINING_GOAL';
            this.emitSerial(`NAV:REJOIN_GOAL,FRONT_CLEAR=${frontClear.toFixed(0)}`);
          } else {
            this.avoidanceTicksRemaining = 4;
          }
        }
        break;
      }

      case 'REJOINING_GOAL': {
        // Realinear rumbo óptimo hacia el Punto B
        if (Math.abs(headingError) > 8.0) {
          const turnStep = Math.sign(headingError) * 8;
          bot.heading = (bot.heading + turnStep + 360) % 360;
        }

        const stepCm = 2.6;
        const rad = (bot.heading * Math.PI) / 180;
        bot.x += stepCm * Math.cos(rad);
        bot.y += stepCm * Math.sin(rad);
        nav.detourDistanceCm += stepCm;

        this.emitSerial(`POS:${bot.x.toFixed(1)},${bot.y.toFixed(1)},${bot.heading.toFixed(1)}`);

        if (Math.abs(headingError) <= 12.0) {
          nav.state = 'CRUISING';
          this.state.scanMode = 'NORMAL_SWEEP';
          this.state.scanSpanDeg = 30;
          this.emitSerial(`NAV:REALIGNED_WITH_B`);
        }
        break;
      }

      default:
        break;
    }
  }
}

// Singleton emulator instance
export const esp32Emulator = new ESP32SimulatorEngine();
