import { Point3D, ScannerSettings } from '../types/scanner';

export interface ParsedPacket {
  type: 'data' | 'status' | 'log';
  angle?: number;
  distance?: number;
  z?: number;
  statusMessage?: string;
  raw: string;
}

/**
 * Parses raw serial lines incoming from the ESP32
 */
export function parseSerialLine(line: string): ParsedPacket | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // 1. Try JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const angle = Number(parsed.angle ?? parsed.a ?? parsed.deg);
      const distance = Number(parsed.dist ?? parsed.distance ?? parsed.d);
      const z = parsed.z !== undefined ? Number(parsed.z) : 0;

      if (!isNaN(angle) && !isNaN(distance)) {
        return {
          type: 'data',
          angle,
          distance,
          z,
          raw: trimmed,
        };
      }
    } catch {
      // Not valid json, continue to regex
    }
  }

  // 2. Try Key-Value: "A:45 D:8.42" or "A:45,D:8.42" or "ANGLE:45 DIST:8.42"
  const kvAngleMatch = trimmed.match(/(?:A|ANG|ANGLE)[:=]\s*(-?[\d.]+)/i);
  const kvDistMatch = trimmed.match(/(?:D|DIST|DISTANCE)[:=]\s*(-?[\d.]+)/i);
  const kvZMatch = trimmed.match(/(?:Z|LAYER)[:=]\s*(-?[\d.]+)/i);

  if (kvAngleMatch && kvDistMatch) {
    const angle = parseFloat(kvAngleMatch[1]);
    const distance = parseFloat(kvDistMatch[1]);
    const z = kvZMatch ? parseFloat(kvZMatch[1]) : 0;
    if (!isNaN(angle) && !isNaN(distance)) {
      return { type: 'data', angle, distance, z, raw: trimmed };
    }
  }

  // 3. Try CSV / Delimited: "45,8.42" or "DATA,45,8.42" or "45.0 8.42"
  const cleanTokens = trimmed.replace(/^DATA,|^POINT,/i, '').split(/[\s,]+/);
  if (cleanTokens.length >= 2) {
    const p1 = parseFloat(cleanTokens[0]);
    const p2 = parseFloat(cleanTokens[1]);
    const p3 = cleanTokens[2] ? parseFloat(cleanTokens[2]) : 0;

    if (!isNaN(p1) && !isNaN(p2)) {
      // If p1 is in angle range (0..360) and p2 is distance
      return {
        type: 'data',
        angle: p1,
        distance: p2,
        z: isNaN(p3) ? 0 : p3,
        raw: trimmed,
      };
    }
  }

  // 4. Status or diagnostic command response
  return {
    type: 'status',
    statusMessage: trimmed,
    raw: trimmed,
  };
}

/**
 * Converts polar ultrasonic sensor readings into Cartesian (X, Y, Z) point
 * Turntable center is at (0, 0, 0).
 * Ultrasonic sensor is positioned along the positive X-axis at (turntableRadius, 0, 0) pointing toward center (0,0,0).
 * Distance d measured by sensor means object surface is at distance:
 * r = turntableRadius - d from the rotation center.
 */
export function convertToCartesian(
  angleDeg: number,
  distanceCm: number,
  zLevelCm: number,
  settings: ScannerSettings
): Point3D | null {
  // Discard out-of-range readings
  if (distanceCm < settings.minDistance || distanceCm > settings.maxDistance) {
    return null;
  }

  // Surface radius from center of turntable
  const r = settings.turntableRadius - distanceCm;

  // Filter if r <= 0 (reading behind turntable center or noise)
  if (r <= 0) return null;

  // Turntable rotation angle in radians
  const rad = (angleDeg * Math.PI) / 180;

  // Cylindrical coordinate conversion:
  // x = r * cos(theta), z_depth = r * sin(theta), y = height
  const x = r * Math.cos(rad);
  const z = r * Math.sin(rad);
  const y = zLevelCm;

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
    angle: angleDeg,
    distance: distanceCm,
    timestamp: Date.now(),
  };
}
