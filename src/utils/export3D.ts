import { Point3D, ExportFormat } from '../types/scanner';
import { reconstructMeshFromPoints, ReconstructedMesh } from './pointCloudMesh';

/**
 * Calculates normal vector for a triangle face
 */
function calculateFaceNormal(
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number]
): [number, number, number] {
  const ax = p2[0] - p1[0];
  const ay = p2[1] - p1[1];
  const az = p2[2] - p1[2];

  const bx = p3[0] - p1[0];
  const by = p3[1] - p1[1];
  const bz = p3[2] - p1[2];

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return [0, 1, 0];
  return [nx / len, ny / len, nz / len];
}

/**
 * Generates an ASCII STL string from a reconstructed mesh
 */
export function generateStlAscii(mesh: ReconstructedMesh, modelName = 'ESP32_3D_Scan'): string {
  const { vertices, faces } = mesh;
  const lines: string[] = [];

  lines.push(`solid ${modelName}`);

  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const v1 = vertices[f.a];
    const v2 = vertices[f.b];
    const v3 = vertices[f.c];

    if (!v1 || !v2 || !v3) continue;

    const normal = calculateFaceNormal(v1, v2, v3);
    lines.push(`  facet normal ${normal[0].toFixed(5)} ${normal[1].toFixed(5)} ${normal[2].toFixed(5)}`);
    lines.push('    outer loop');
    lines.push(`      vertex ${v1[0].toFixed(4)} ${v1[1].toFixed(4)} ${v1[2].toFixed(4)}`);
    lines.push(`      vertex ${v2[0].toFixed(4)} ${v2[1].toFixed(4)} ${v2[2].toFixed(4)}`);
    lines.push(`      vertex ${v3[0].toFixed(4)} ${v3[1].toFixed(4)} ${v3[2].toFixed(4)}`);
    lines.push('    endloop');
    lines.push('  endfacet');
  }

  lines.push(`endsolid ${modelName}`);
  return lines.join('\n');
}

/**
 * Generates a Wavefront OBJ string with polygonal faces
 */
export function generateObjMesh(mesh: ReconstructedMesh, modelName = 'ESP32_3D_Scan'): string {
  const { vertices, faces } = mesh;
  const lines: string[] = [];

  lines.push(`# ScanESP32 3D Reconstructed Mesh`);
  lines.push(`# Object: ${modelName}`);
  lines.push(`# Vertices: ${vertices.length}`);
  lines.push(`# Faces: ${faces.length}`);
  lines.push(`o ${modelName}`);

  // Vertices (OBJ is 1-indexed)
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    lines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`);
  }

  lines.push('s 1'); // Smooth shading group

  // Faces
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    lines.push(`f ${f.a + 1} ${f.b + 1} ${f.c + 1}`);
  }

  return lines.join('\n');
}

/**
 * Generates a Wavefront OBJ string for point clouds
 */
export function generateObjPointCloud(points: Point3D[], scale = 10.0): string {
  const lines: string[] = [];
  lines.push(`# ScanESP32 3D Point Cloud`);
  lines.push(`# Point Count: ${points.length}`);

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(`v ${(p.x * scale).toFixed(4)} ${(p.y * scale).toFixed(4)} ${(p.z * scale).toFixed(4)}`);
  }

  // Define points element
  if (points.length > 0) {
    const pointIndices = Array.from({ length: points.length }, (_, i) => i + 1).join(' ');
    lines.push(`p ${pointIndices}`);
  }

  return lines.join('\n');
}

/**
 * Generates a Stanford PLY format point cloud string
 */
export function generatePlyPointCloud(points: Point3D[], scale = 10.0): string {
  const lines: string[] = [];
  lines.push('ply');
  lines.push('format ascii 1.0');
  lines.push('comment Created by ScanESP32 3D Ultrasonic Studio');
  lines.push(`element vertex ${points.length}`);
  lines.push('property float x');
  lines.push('property float y');
  lines.push('property float z');
  lines.push('property float angle');
  lines.push('property float distance');
  lines.push('end_header');

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(
      `${(p.x * scale).toFixed(4)} ${(p.y * scale).toFixed(4)} ${(p.z * scale).toFixed(4)} ${p.angle.toFixed(1)} ${p.distance.toFixed(2)}`
    );
  }

  return lines.join('\n');
}

/**
 * Generates CSV / XYZ coordinates
 */
export function generateXyzCsv(points: Point3D[], scale = 10.0): string {
  const lines: string[] = ['x,y,z,angle_deg,distance_cm,timestamp'];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    lines.push(
      `${(p.x * scale).toFixed(4)},${(p.y * scale).toFixed(4)},${(p.z * scale).toFixed(4)},${p.angle.toFixed(2)},${p.distance.toFixed(2)},${p.timestamp}`
    );
  }
  return lines.join('\n');
}

/**
 * Master download trigger
 */
export function trigger3DDownload(
  points: Point3D[],
  format: ExportFormat,
  options: {
    filename?: string;
    scale?: number; // scale multiplier, default 10 for cm->mm
    closeBase?: boolean;
  } = {}
) {
  const { filename = 'escaner_esp32_3d', scale = 10.0, closeBase = true } = options;

  let content = '';
  let mimeType = 'text/plain';
  let extension = 'txt';

  switch (format) {
    case 'stl_mesh': {
      const mesh = reconstructMeshFromPoints(points, { scale, closeBottom: closeBase, closeTop: true });
      content = generateStlAscii(mesh, filename);
      mimeType = 'model/stl';
      extension = 'stl';
      break;
    }
    case 'stl_cloud': {
      // Reconstruct minimal mesh or bounding triangles
      const mesh = reconstructMeshFromPoints(points, { scale, closeBottom: false, closeTop: false });
      content = generateStlAscii(mesh, filename);
      mimeType = 'model/stl';
      extension = 'stl';
      break;
    }
    case 'obj_mesh': {
      const mesh = reconstructMeshFromPoints(points, { scale, closeBottom: closeBase, closeTop: true });
      content = generateObjMesh(mesh, filename);
      mimeType = 'text/plain';
      extension = 'obj';
      break;
    }
    case 'obj_cloud': {
      content = generateObjPointCloud(points, scale);
      mimeType = 'text/plain';
      extension = 'obj';
      break;
    }
    case 'ply': {
      content = generatePlyPointCloud(points, scale);
      mimeType = 'application/octet-stream';
      extension = 'ply';
      break;
    }
    case 'xyz': {
      content = generateXyzCsv(points, scale);
      mimeType = 'text/csv';
      extension = 'csv';
      break;
    }
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
