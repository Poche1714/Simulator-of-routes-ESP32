// 2D World Map & Bot Trajectory Exporter (GeoJSON, JSON, CSV, SVG)

import {
  DiscoveredPoint2D,
  TrajectoryPoint,
  Waypoint,
  BotPose,
  ExplorationStats,
} from '../types/worldDiscoverer';

export function exportRouteAndMapAsJSON(
  trajectory: TrajectoryPoint[],
  points: DiscoveredPoint2D[],
  waypoints: Waypoint[],
  stats: ExplorationStats,
  botPose: BotPose,
  sectorName: string
): void {
  const data = {
    app: 'Terra·Scan 2D - Bot Trajectory & World Mapper',
    exportTimestamp: new Date().toISOString(),
    sectorName,
    missionSummary: {
      totalDistanceMeters: stats.totalDistanceTraveledM,
      activeScanTimeSeconds: stats.activeScanTimeSeconds,
      trajectoryPointsCount: trajectory.length,
      waypointsCount: waypoints.length,
      obstaclesDetectedCount: points.length,
      fogClearedPercentage: stats.fogClearedPercentage,
      currentBotPosition: {
        x_cm: botPose.x,
        y_cm: botPose.y,
        heading_deg: botPose.heading,
      },
    },
    waypoints: waypoints.map((wp, idx) => ({
      index: idx + 1,
      id: wp.id,
      label: wp.label,
      x_cm: wp.x,
      y_cm: wp.y,
      timestamp: wp.timestamp,
    })),
    botTrajectory: trajectory.map((t, idx) => ({
      step: idx + 1,
      timestamp: t.timestamp,
      x_cm: t.x,
      y_cm: t.y,
      heading_deg: t.heading,
      distanceFromStart_cm: t.distanceFromStartCm,
      speed_cm_s: t.speed,
      waypoint: t.waypointLabel || null,
    })),
    discoveredObstacles: points.map((p) => ({
      id: p.id,
      worldX_cm: p.worldX,
      worldY_cm: p.worldY,
      robotX_cm: p.robotX,
      robotY_cm: p.robotY,
      robotHeading_deg: p.robotHeading,
      sensorAngle_deg: p.sensorAngle,
      distance_cm: p.distanceCm,
      hits: p.hits,
      type: p.type,
      sweepCycle: p.sweepCycle,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `trayecto_bot_${sectorName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRouteAsGeoJSON(
  trajectory: TrajectoryPoint[],
  waypoints: Waypoint[],
  points: DiscoveredPoint2D[],
  sectorName: string
): void {
  // Convert cm relative coordinates to local projected metric geometry
  const features: any[] = [];

  // Trajectory LineString
  if (trajectory.length > 1) {
    features.push({
      type: 'Feature',
      properties: {
        name: 'Trayecto Recorrido por el Bot',
        totalPoints: trajectory.length,
        distanceMeters: trajectory[trajectory.length - 1].distanceFromStartCm / 100,
      },
      geometry: {
        type: 'LineString',
        coordinates: trajectory.map((p) => [Number((p.x / 100).toFixed(3)), Number((p.y / 100).toFixed(3))]),
      },
    });
  }

  // Waypoints
  waypoints.forEach((wp, idx) => {
    features.push({
      type: 'Feature',
      properties: {
        name: wp.label,
        type: 'waypoint',
        index: idx + 1,
      },
      geometry: {
        type: 'Point',
        coordinates: [Number((wp.x / 100).toFixed(3)), Number((wp.y / 100).toFixed(3))],
      },
    });
  });

  // Obstacle points (MultiPoint)
  if (points.length > 0) {
    features.push({
      type: 'Feature',
      properties: {
        name: 'Obstáculos y Muros Detectados',
        count: points.length,
      },
      geometry: {
        type: 'MultiPoint',
        coordinates: points.map((p) => [Number((p.worldX / 100).toFixed(3)), Number((p.worldY / 100).toFixed(3))]),
      },
    });
  }

  const geoJson = {
    type: 'FeatureCollection',
    sector: sectorName,
    generator: 'Terra·Scan 2D Cartographer',
    features,
  };

  const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ruta_bot_geojson_${sectorName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.geojson`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRouteAsCSV(trajectory: TrajectoryPoint[], sectorName: string): void {
  const headers = ['Step', 'Timestamp_ISO', 'X_cm', 'Y_cm', 'Heading_deg', 'DistanceTraveled_cm', 'Speed_cms', 'Waypoint'];
  const rows = trajectory.map((t, idx) => [
    idx + 1,
    new Date(t.timestamp).toISOString(),
    t.x,
    t.y,
    t.heading,
    t.distanceFromStartCm,
    t.speed,
    `"${t.waypointLabel || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ruta_bot_telemetria_${sectorName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportMapAndRouteAsSVG(
  trajectory: TrajectoryPoint[],
  waypoints: Waypoint[],
  points: DiscoveredPoint2D[],
  botPose: BotPose,
  sectorName: string
): void {
  const width = 900;
  const height = 650;

  // Calculate bounding box in cm
  let minX = -150;
  let maxX = 150;
  let minY = -30;
  let maxY = 300;

  trajectory.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  points.forEach((p) => {
    minX = Math.min(minX, p.worldX);
    maxX = Math.max(maxX, p.worldX);
    minY = Math.min(minY, p.worldY);
    maxY = Math.max(maxY, p.worldY);
  });

  const spanX = Math.max(200, maxX - minX + 60);
  const spanY = Math.max(200, maxY - minY + 60);
  const scale = Math.min((width - 80) / spanX, (height - 120) / spanY);

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const toSvgX = (xCm: number) => (width / 2 + (xCm - midX) * scale).toFixed(1);
  const toSvgY = (yCm: number) => (height / 2 - (yCm - midY) * scale).toFixed(1);

  // SVG route path string
  let pathD = '';
  if (trajectory.length > 0) {
    pathD = `M ${toSvgX(trajectory[0].x)} ${toSvgY(trajectory[0].y)} ` +
      trajectory.slice(1).map((p) => `L ${toSvgX(p.x)} ${toSvgY(p.y)}`).join(' ');
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .bg { fill: #050a07; }
    .grid { stroke: #143520; stroke-width: 0.8; stroke-dasharray: 4,4; }
    .routeGlow { stroke: rgba(16, 185, 129, 0.35); stroke-width: 8; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .routeLine { stroke: #10b981; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .point { fill: #4ade80; }
    .anomaly { fill: #facc15; stroke: #fff; stroke-width: 1.2; }
    .waypoint { fill: #38bdf8; stroke: #fff; stroke-width: 1.5; }
    .bot { fill: #064e3b; stroke: #10b981; stroke-width: 2; }
    .title { fill: #f5f5f5; font-family: monospace; font-size: 16px; font-weight: bold; }
    .subtitle { fill: #10b981; font-family: monospace; font-size: 12px; }
    .meta { fill: #a3a3a3; font-family: sans-serif; font-size: 11px; }
  </style>
  
  <rect width="100%" height="100%" class="bg" />

  <!-- Title & Route Summary -->
  <text x="30" y="35" class="title">MAPA DE RUTA Y EXPLORACIÓN DEL BOT 2D</text>
  <text x="30" y="55" class="subtitle">Sector: ${sectorName} · Distancia: ${(botPose.totalDistanceCm / 100).toFixed(2)} m · ${trajectory.length} puntos de ruta</text>
  <text x="30" y="72" class="meta">Sensor ultrasónico en barrido continuo 180° cada 20 segundos</text>

  <!-- Obstacles Point Cloud -->
  ${points
    .map(
      (p) =>
        `<circle cx="${toSvgX(p.worldX)}" cy="${toSvgY(p.worldY)}" r="${
          p.type === 'anomaly' ? 4.5 : 2.5
        }" class="${p.type === 'anomaly' ? 'anomaly' : 'point'}" />`
    )
    .join('\n  ')}

  <!-- Traversed Route Path -->
  ${pathD ? `<path d="${pathD}" class="routeGlow" />\n  <path d="${pathD}" class="routeLine" />` : ''}

  <!-- Waypoints -->
  ${waypoints
    .map(
      (wp, idx) =>
        `<circle cx="${toSvgX(wp.x)}" cy="${toSvgY(wp.y)}" r="6" class="waypoint" />
  <text x="${Number(toSvgX(wp.x)) + 8}" y="${Number(toSvgY(wp.y)) - 4}" fill="#ffffff" font-family="sans-serif" font-size="10">${wp.label}</text>`
    )
    .join('\n  ')}

  <!-- Bot Current Location -->
  <circle cx="${toSvgX(botPose.x)}" cy="${toSvgY(botPose.y)}" r="9" class="bot" />
  <text x="${toSvgX(botPose.x)}" y="${Number(toSvgY(botPose.y)) + 20}" fill="#10b981" font-family="monospace" font-size="11" text-anchor="middle">BOT (Rumbo: ${Math.round(botPose.heading)}°)</text>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mapa_ruta_vectorial_${sectorName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}
