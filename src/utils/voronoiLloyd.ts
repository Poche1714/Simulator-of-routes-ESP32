/**
 * Voronoi Partitioning & Lloyd's Relaxation Engine + Archimedean Spiral Generator
 * For Autonomous Robotics, Cellular Decomposition & ESP32 Coverage Survey
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface VoronoiCell {
  id: number;
  seed: Point2D;
  centroid: Point2D;
  polygon: Point2D[];
  areaCm2: number;
  isAssigned: boolean;
  color: string;
}

export interface VoronoiLloydResult {
  cells: VoronoiCell[];
  lloydIterations: number;
  assignedCellId: number;
  assignedCentroid: Point2D;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  minPointDistanceCm: number;
  rawRS232Packet: string;
  timestamp: number;
}

export interface ArchimedeanSpiralConfig {
  a: number; // Initial radius offset in cm (default: 5)
  pitchCm: number; // Radial expansion per full turn (d = 2*pi*b) in cm (default: 28)
  maxRadiusCm: number; // Maximum radius of the spiral in cm (default: 140)
  angularSpeedDeg: number; // Angular advance step per control loop in deg (default: 10)
  direction: 'clockwise' | 'counter_clockwise'; // default: 'clockwise'
  center: Point2D; // The Voronoi Centroid
  boundaryPolygon?: Point2D[]; // Voronoi cell polygon boundary to confine the spiral
}

export const DEFAULT_SPIRAL_CONFIG: ArchimedeanSpiralConfig = {
  a: 5,
  pitchCm: 28,
  maxRadiusCm: 140,
  angularSpeedDeg: 10,
  direction: 'clockwise',
  center: { x: 0, y: 150 },
};

export interface ArchimedeanSpiralState {
  isActive: boolean;
  currentThetaRad: number;
  currentRadiusCm: number;
  targetPoint: Point2D;
  turnsCompleted: number;
  coverageAreaM2: number;
  isComplete: boolean;
  pathPoints: Point2D[];
}

/**
 * Compute the polygon centroid using the standard surveyor's formula
 */
export function computePolygonCentroid(polygon: Point2D[]): Point2D {
  if (polygon.length === 0) return { x: 0, y: 0 };
  if (polygon.length === 1) return { x: polygon[0].x, y: polygon[0].y };
  if (polygon.length === 2) return { x: (polygon[0].x + polygon[1].x) / 2, y: (polygon[0].y + polygon[1].y) / 2 };

  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const p1 = polygon[i];
    const p2 = polygon[j];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  area = area * 0.5;
  if (Math.abs(area) < 1e-5) {
    // Fallback: average of vertices
    const sumX = polygon.reduce((s, p) => s + p.x, 0);
    const sumY = polygon.reduce((s, p) => s + p.y, 0);
    return { x: sumX / polygon.length, y: sumY / polygon.length };
  }

  cx = cx / (6 * area);
  cy = cy / (6 * area);
  return { x: Number(cx.toFixed(1)), y: Number(cy.toFixed(1)) };
}

/**
 * Calculate polygon area
 */
export function computePolygonArea(polygon: Point2D[]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
  }
  return Math.abs(area * 0.5);
}

/**
 * Clip a convex polygon against a half-plane defined by a line through mid perpendicular to (s1 -> s2)
 */
function clipPolygonWithBisector(poly: Point2D[], s1: Point2D, s2: Point2D): Point2D[] {
  // Bisector line: point mid = (s1 + s2)/2, normal pointing toward s1: n = s1 - s2
  const midX = (s1.x + s2.x) / 2;
  const midY = (s1.y + s2.y) / 2;
  const nx = s1.x - s2.x;
  const ny = s1.y - s2.y;

  const output: Point2D[] = [];
  if (poly.length === 0) return output;

  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];

    // Signed distance: (p - mid) . n >= 0 means inside s1's half-plane
    const d1 = (p1.x - midX) * nx + (p1.y - midY) * ny;
    const d2 = (p2.x - midX) * nx + (p2.y - midY) * ny;

    if (d1 >= 0) {
      output.push(p1);
    }

    // Edge crosses the bisector
    if ((d1 >= 0 && d2 < 0) || (d1 < 0 && d2 >= 0)) {
      const t = d1 / (d1 - d2);
      const ix = p1.x + t * (p2.x - p1.x);
      const iy = p1.y + t * (p2.y - p1.y);
      output.push({ x: Number(ix.toFixed(1)), y: Number(iy.toFixed(1)) });
    }
  }

  return output;
}

/**
 * Enforce minimum distance constraint between all points (seeds/centroids).
 * Iteratively pushes points apart if their Euclidean distance is under minDistCm.
 */
export function enforceMinPointDistance(
  points: Point2D[],
  minDistCm: number,
  box: { minX: number; maxX: number; minY: number; maxY: number },
  iterations = 10
): Point2D[] {
  if (points.length < 2) return points;
  const pts = points.map((p) => ({ ...p }));
  const margin = Math.min(50, minDistCm * 0.1);

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDistCm) {
          moved = true;
          const overlap = minDistCm - dist;
          const angle = dist > 0.001 ? Math.atan2(dy, dx) : ((i + 1) * Math.PI) / 2;
          const push = overlap / 2 + 1;
          const pushX = Math.cos(angle) * push;
          const pushY = Math.sin(angle) * push;

          pts[i].x -= pushX;
          pts[i].y -= pushY;
          pts[j].x += pushX;
          pts[j].y += pushY;
        }
      }
    }

    // Keep points strictly within bounding box with safety margin
    for (let i = 0; i < pts.length; i++) {
      pts[i].x = Math.max(box.minX + margin, Math.min(box.maxX - margin, pts[i].x));
      pts[i].y = Math.max(box.minY + margin, Math.min(box.maxY - margin, pts[i].y));
    }

    if (!moved) break;
  }

  return pts.map((p) => ({
    x: Number(p.x.toFixed(1)),
    y: Number(p.y.toFixed(1)),
  }));
}

/**
 * Generate Bounded Voronoi Tessellation and apply Lloyd's Relaxation iterations,
 * strictly enforcing a minimum distance between Voronoi points (default: 5.0m / 500 cm).
 */
export function generateVoronoiWithLloyd(
  bounds = { minX: -600, maxX: 600, minY: -100, maxY: 1100 },
  initialSeeds?: Point2D[],
  lloydIterations = 8,
  assignedSeedIndex = 0,
  minPointDistanceCm = 500 // 5.0 meters minimum distance between points in the simulation
): VoronoiLloydResult {
  // Ensure the bounding box is large enough to comfortably space points >= minPointDistanceCm
  const minRequiredSpan = minPointDistanceCm * 2.0; // At least 1000 cm (10m)
  let effectiveBounds = { ...bounds };
  const currentW = effectiveBounds.maxX - effectiveBounds.minX;
  const currentH = effectiveBounds.maxY - effectiveBounds.minY;

  if (currentW < minRequiredSpan || currentH < minRequiredSpan) {
    const midX = (effectiveBounds.minX + effectiveBounds.maxX) / 2;
    const midY = (effectiveBounds.minY + effectiveBounds.maxY) / 2;
    const halfW = Math.max(minRequiredSpan / 2, currentW / 2);
    const halfH = Math.max(minRequiredSpan / 2, currentH / 2);
    effectiveBounds = {
      minX: Math.round(midX - halfW),
      maxX: Math.round(midX + halfW),
      minY: Math.round(midY - halfH),
      maxY: Math.round(midY + halfH),
    };
  }

  // Bounding box polygon
  const baseBox: Point2D[] = [
    { x: effectiveBounds.minX, y: effectiveBounds.minY },
    { x: effectiveBounds.maxX, y: effectiveBounds.minY },
    { x: effectiveBounds.maxX, y: effectiveBounds.maxY },
    { x: effectiveBounds.minX, y: effectiveBounds.maxY },
  ];

  const midX = (effectiveBounds.minX + effectiveBounds.maxX) / 2;
  const midY = (effectiveBounds.minY + effectiveBounds.maxY) / 2;
  // Offset to guarantee pairwise distances >= minPointDistanceCm (e.g. 520 cm / 2 = 260 cm)
  const seedOffset = Math.max(260, (minPointDistanceCm * 1.05) / 2);

  // Default seeds placed with >= 5.0m (500cm) spacing
  let seeds: Point2D[] =
    initialSeeds && initialSeeds.length >= 2
      ? enforceMinPointDistance(initialSeeds, minPointDistanceCm, effectiveBounds)
      : [
          { x: Number((midX - seedOffset).toFixed(1)), y: Number((midY - seedOffset).toFixed(1)) },
          { x: Number((midX + seedOffset).toFixed(1)), y: Number((midY - seedOffset).toFixed(1)) },
          { x: Number((midX - seedOffset).toFixed(1)), y: Number((midY + seedOffset).toFixed(1)) },
          { x: Number((midX + seedOffset).toFixed(1)), y: Number((midY + seedOffset).toFixed(1)) },
        ];

  // Guarantee seed separation initially
  seeds = enforceMinPointDistance(seeds, minPointDistanceCm, effectiveBounds);

  const colors = [
    'rgba(6, 182, 212, 0.18)', // Cyan (Assigned / Rover sector)
    'rgba(168, 85, 247, 0.14)', // Purple
    'rgba(245, 158, 11, 0.14)', // Amber
    'rgba(16, 185, 129, 0.14)', // Emerald
    'rgba(239, 68, 68, 0.14)',  // Rose
    'rgba(59, 130, 246, 0.14)', // Blue
  ];

  // Run Lloyd's Relaxation iterations with minimum distance constraint preservation
  let currentCells: { seed: Point2D; centroid: Point2D; poly: Point2D[] }[] = [];

  for (let iter = 0; iter < lloydIterations; iter++) {
    currentCells = seeds.map((seed, i) => {
      let cellPoly = [...baseBox];
      for (let j = 0; j < seeds.length; j++) {
        if (i !== j) {
          cellPoly = clipPolygonWithBisector(cellPoly, seed, seeds[j]);
        }
      }
      const centroid = computePolygonCentroid(cellPoly);
      return { seed, centroid, poly: cellPoly };
    });

    // Move seeds toward centroid (CVT - Centroidal Voronoi Tessellation)
    const relaxedSeeds = currentCells.map((c) => ({
      x: Number((c.seed.x * 0.25 + c.centroid.x * 0.75).toFixed(1)),
      y: Number((c.seed.y * 0.25 + c.centroid.y * 0.75).toFixed(1)),
    }));

    // Enforce >= 5.0m constraint so seeds do not collapse together
    seeds = enforceMinPointDistance(relaxedSeeds, minPointDistanceCm, effectiveBounds, 6);
  }

  // Final Voronoi Cells assembly
  const finalCells: VoronoiCell[] = currentCells.map((c, i) => {
    const area = computePolygonArea(c.poly);
    return {
      id: i + 1,
      seed: c.seed,
      centroid: c.centroid,
      polygon: c.poly,
      areaCm2: Math.round(area),
      isAssigned: i === assignedSeedIndex,
      color: colors[i % colors.length],
    };
  });

  // Calculate actual minimum distance between all pairs of centroids
  let minCentroidDistanceCm = Infinity;
  for (let i = 0; i < finalCells.length; i++) {
    for (let j = i + 1; j < finalCells.length; j++) {
      const dist = Math.hypot(
        finalCells[i].centroid.x - finalCells[j].centroid.x,
        finalCells[i].centroid.y - finalCells[j].centroid.y
      );
      if (dist < minCentroidDistanceCm) {
        minCentroidDistanceCm = dist;
      }
    }
  }

  const assigned = finalCells[assignedSeedIndex] || finalCells[0];

  // Synthesize realistic RS232 frame packet simulating UART transmission with MIN_DIST field
  const minDistanceMeters = (minCentroidDistanceCm / 100).toFixed(2);
  const rawRS232Packet = `RS232:RX,[VORONOI_SYNC],CELLS=${finalCells.length},MIN_DIST_M=${minDistanceMeters},ASSIGNED_ID=${assigned.id},LLOYD_ITERS=${lloydIterations},CENTROID=(${assigned.centroid.x},${assigned.centroid.y}),AREA_CM2=${assigned.areaCm2},CRC=0x8F4A`;

  return {
    cells: finalCells,
    lloydIterations,
    assignedCellId: assigned.id,
    assignedCentroid: assigned.centroid,
    bounds: effectiveBounds,
    minPointDistanceCm: Number(minCentroidDistanceCm.toFixed(1)),
    rawRS232Packet,
    timestamp: Date.now(),
  };
}

/**
 * Calculate Euclidean distance from point P to line segment V-W
 */
export function distToSegment(p: Point2D, v: Point2D, w: Point2D): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

/**
 * Calculate shortest Euclidean distance from point P to any edge of polygon
 */
export function distToPolygonBoundary(p: Point2D, polygon: Point2D[]): number {
  if (!polygon || polygon.length < 3) return Infinity;
  let minDist = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const d = distToSegment(p, polygon[i], polygon[j]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Calculate the maximum inscribed radius (inradius) of a Voronoi cell from its centroid
 */
export function computeCellMaxInradius(centroid: Point2D, polygon: Point2D[]): number {
  return distToPolygonBoundary(centroid, polygon);
}

/**
 * Test if a point is strictly inside a polygon, with an optional safety margin from the edges.
 * Uses ray casting algorithm and boundary distance validation.
 */
export function isPointInsidePolygon(point: Point2D, polygon: Point2D[], safetyMarginCm = 0): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  if (!inside) return false;

  if (safetyMarginCm > 0) {
    const d = distToPolygonBoundary(point, polygon);
    if (d < safetyMarginCm) return false;
  }

  return true;
}

/**
 * Calculate the Archimedean Spiral path points
 * Formula: r(theta) = a + b * theta
 * Where pitch d = 2 * pi * b  =>  b = pitch / (2 * pi)
 *
 * CRITICAL CONSTRAINT: The spiral strictly respects the boundaries of the Voronoi cell partition.
 * It will immediately terminate before passing outside the cell polygon.
 */
export function generateArchimedeanSpiralPoints(
  config: ArchimedeanSpiralConfig,
  totalTurnLimit = 6,
  overridePolygon?: Point2D[],
  safetyMarginCm = 15
): Point2D[] {
  const { a, pitchCm, maxRadiusCm, center, direction, boundaryPolygon } = config;
  const poly = overridePolygon || boundaryPolygon;
  const b = pitchCm / (2 * Math.PI); // radial increase per radian
  const points: Point2D[] = [];

  // Center point is the guaranteed origin of the Archimedean spiral
  points.push({ x: Number(center.x.toFixed(1)), y: Number(center.y.toFixed(1)) });

  // If a polygon boundary is provided, determine the max permissible inradius in this Voronoi cell
  let cellInradius = Infinity;
  if (poly && poly.length >= 3) {
    cellInradius = computeCellMaxInradius(center, poly);
  }
  const effectiveMaxRadius = Math.min(maxRadiusCm, Math.max(12, cellInradius - safetyMarginCm));

  const maxTheta = totalTurnLimit * 2 * Math.PI;
  // Step resolution for smooth trajectory
  const stepDeg = Math.min(6, config.angularSpeedDeg || 6);
  const thetaStep = (stepDeg * Math.PI) / 180;
  const sign = direction === 'clockwise' ? -1 : 1;

  for (let theta = thetaStep; theta <= maxTheta; theta += thetaStep) {
    const r = a + b * theta;
    if (r > effectiveMaxRadius) break;

    const x = center.x + r * Math.cos(sign * theta);
    const y = center.y + r * Math.sin(sign * theta);
    const candidatePoint = { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };

    // Strict boundary enforcement: NEVER exceed or touch the Voronoi cell boundaries!
    if (poly && poly.length >= 3) {
      const distEdge = distToPolygonBoundary(candidatePoint, poly);
      if (!isPointInsidePolygon(candidatePoint, poly, safetyMarginCm) || distEdge < safetyMarginCm) {
        break; // Stop immediately at the Voronoi partition boundary
      }
    }

    points.push(candidatePoint);
  }

  return points;
}

