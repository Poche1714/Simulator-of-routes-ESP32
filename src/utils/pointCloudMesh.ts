import { Point3D } from '../types/scanner';

export interface TriangleFace {
  a: number; // vertex index 0-based
  b: number;
  c: number;
  normal?: [number, number, number];
}

export interface ReconstructedMesh {
  vertices: [number, number, number][];
  faces: TriangleFace[];
}

/**
 * Reconstructs a triangulated 3D mesh from cylindrical scanner points.
 * Groups points by vertical layer (or synthesizes a cylinder/profile if single slice).
 */
export function reconstructMeshFromPoints(
  points: Point3D[],
  options: {
    closeBottom?: boolean;
    closeTop?: boolean;
    smoothRadius?: boolean;
    scale?: number;
  } = {}
): ReconstructedMesh {
  const { closeBottom = true, closeTop = true, scale = 10.0 } = options; // scale cm to mm by default (10x)

  if (points.length < 3) {
    return { vertices: [], faces: [] };
  }

  // Group points by layer / height y (with tolerance, or round to nearest mm)
  const layerMap = new Map<number, Point3D[]>();
  points.forEach((pt) => {
    // Round y to 2 decimal places to cluster into layers
    const key = Math.round(pt.y * 10) / 10;
    if (!layerMap.has(key)) {
      layerMap.set(key, []);
    }
    layerMap.get(key)!.push(pt);
  });

  const sortedLayerKeys = Array.from(layerMap.keys()).sort((a, b) => a - b);

  // If only 1 layer exists (e.g. single plane 360 turntable scan),
  // create an extrusion of height to form a 3D printable solid token/profile
  if (sortedLayerKeys.length === 1) {
    const singleLayer = layerMap.get(sortedLayerKeys[0])!;
    const sorted = [...singleLayer].sort((a, b) => a.angle - b.angle);
    const extrudedLayers: Point3D[][] = [];
    const heightLevels = [-0.5, 0, 0.5, 1.0]; // cm thickness
    heightLevels.forEach((h) => {
      extrudedLayers.push(
        sorted.map((p) => ({
          ...p,
          y: p.y + h,
        }))
      );
    });
    return buildMeshFromOrderedLayers(extrudedLayers, closeBottom, closeTop, scale);
  }

  // Multiple layers
  const orderedLayers: Point3D[][] = [];
  sortedLayerKeys.forEach((key) => {
    const pts = layerMap.get(key)!;
    // Sort points in layer by angle (0 to 360)
    const sorted = [...pts].sort((a, b) => a.angle - b.angle);
    // Deduplicate any close angles in same layer
    const deduped: Point3D[] = [];
    sorted.forEach((pt) => {
      if (
        deduped.length === 0 ||
        Math.abs(deduped[deduped.length - 1].angle - pt.angle) > 0.2
      ) {
        deduped.push(pt);
      }
    });
    if (deduped.length >= 3) {
      orderedLayers.push(deduped);
    }
  });

  if (orderedLayers.length < 2) {
    // Fallback simple triangulation
    return buildMeshFromOrderedLayers(
      [orderedLayers[0], orderedLayers[0].map((p) => ({ ...p, y: p.y + 0.5 }))],
      closeBottom,
      closeTop,
      scale
    );
  }

  return buildMeshFromOrderedLayers(orderedLayers, closeBottom, closeTop, scale);
}

function buildMeshFromOrderedLayers(
  layers: Point3D[][],
  closeBottom: boolean,
  closeTop: boolean,
  scale: number
): ReconstructedMesh {
  const vertices: [number, number, number][] = [];
  const faces: TriangleFace[] = [];

  // Track start vertex indices for each layer
  const layerIndexOffsets: number[] = [];

  layers.forEach((layer) => {
    layerIndexOffsets.push(vertices.length);
    layer.forEach((pt) => {
      vertices.push([pt.x * scale, pt.y * scale, pt.z * scale]);
    });
  });

  // Connect adjacent layers with triangle quads
  for (let l = 0; l < layers.length - 1; l++) {
    const layerA = layers[l];
    const layerB = layers[l + 1];
    const offsetA = layerIndexOffsets[l];
    const offsetB = layerIndexOffsets[l + 1];

    const countA = layerA.length;
    const countB = layerB.length;

    // Use angle-based nearest neighbor or normalized index stepping
    const maxSteps = Math.max(countA, countB);
    for (let i = 0; i < maxSteps; i++) {
      const iA = Math.floor((i / maxSteps) * countA);
      const nextIA = Math.floor(((i + 1) % maxSteps / maxSteps) * countA);
      const iB = Math.floor((i / maxSteps) * countB);
      const nextIB = Math.floor(((i + 1) % maxSteps / maxSteps) * countB);

      const vA1 = offsetA + iA;
      const vA2 = offsetA + nextIA;
      const vB1 = offsetB + iB;
      const vB2 = offsetB + nextIB;

      if (vA1 !== vA2 && vB1 !== vB2) {
        faces.push({ a: vA1, b: vB1, c: vA2 });
        faces.push({ a: vA2, b: vB1, c: vB2 });
      } else if (vA1 !== vA2) {
        faces.push({ a: vA1, b: vB1, c: vA2 });
      } else if (vB1 !== vB2) {
        faces.push({ a: vA1, b: vB1, c: vB2 });
      }
    }
  }

  // Cap bottom
  if (closeBottom && layers.length > 0) {
    const bottomLayer = layers[0];
    const offsetBottom = layerIndexOffsets[0];
    const count = bottomLayer.length;
    // Calculate center vertex for fan triangulation
    let cx = 0, cy = 0, cz = 0;
    bottomLayer.forEach((p) => {
      cx += p.x * scale;
      cy += p.y * scale;
      cz += p.z * scale;
    });
    cx /= count;
    cy /= count;
    cz /= count;

    const centerIdx = vertices.length;
    vertices.push([cx, cy, cz]);

    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      // Winding order facing outward (downward)
      faces.push({
        a: centerIdx,
        b: offsetBottom + next,
        c: offsetBottom + i,
      });
    }
  }

  // Cap top
  if (closeTop && layers.length > 0) {
    const topIdx = layers.length - 1;
    const topLayer = layers[topIdx];
    const offsetTop = layerIndexOffsets[topIdx];
    const count = topLayer.length;

    let cx = 0, cy = 0, cz = 0;
    topLayer.forEach((p) => {
      cx += p.x * scale;
      cy += p.y * scale;
      cz += p.z * scale;
    });
    cx /= count;
    cy /= count;
    cz /= count;

    const centerIdx = vertices.length;
    vertices.push([cx, cy, cz]);

    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      // Winding order facing outward (upward)
      faces.push({
        a: centerIdx,
        b: offsetTop + i,
        c: offsetTop + next,
      });
    }
  }

  return { vertices, faces };
}
