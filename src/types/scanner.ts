export interface Point3D {
  x: number;
  y: number; // height (z in physical world, y in Three.js up-axis)
  z: number; // depth
  angle: number; // degrees
  distance: number; // cm from sensor
  intensity?: number;
  timestamp: number;
}

export type ScanStatus = 'idle' | 'scanning' | 'paused' | 'completed' | 'homing';

export type ConnectionMode = 'serial' | 'simulator' | 'bluetooth' | 'websocket';

export interface TurntableState {
  currentAngle: number; // 0 to 360
  targetAngle: number;
  direction: 'left' | 'right' | 'idle';
  stepSize: number; // e.g., 1, 2, 5, 10 degrees
  speed: number; // deg/sec or delay ms
  isRotating: boolean;
}

export interface UltrasonicSensorData {
  distanceCm: number;
  rawEchoMicros: number;
  valid: boolean;
  lastPingTime: number;
}

export interface ScannerSettings {
  turntableRadius: number; // Distance from ultrasonic sensor face to turntable center in cm (default: 15.0 cm)
  minDistance: number; // Min valid object distance in cm (default: 2.0 cm)
  maxDistance: number; // Max valid object distance in cm (default: 14.5 cm)
  angularResolution: number; // Step size in degrees (e.g. 1.8°, 3.0°, 5.0°)
  fullSweepAngle: number; // Usually 360° or 180°
  verticalLayers: number; // Number of vertical height slices if Z-stage is used
  currentLayer: number;
  layerHeightMm: number;
  filterOutliers: boolean;
  samplesPerAngle: number; // Noise reduction averaging
}

export type VisualRenderMode = 'points' | 'wireframe' | 'surface' | 'points_and_mesh';
export type ColorMapMode = 'height' | 'distance' | 'angle' | 'cyber' | 'monochrome';

export type ExportFormat = 'stl_mesh' | 'stl_cloud' | 'obj_mesh' | 'obj_cloud' | 'ply' | 'xyz';

export interface SerialErrorInfo {
  code: 'LOCKED_OR_IN_USE' | 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'DISCONNECTED' | 'UNKNOWN';
  title: string;
  message: string;
  reasons: string[];
  solutions: string[];
}
