import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  DiscoveredPoint2D,
  TrajectoryPoint,
  Waypoint,
  BotPose,
  GameVisualTheme,
  DynamicObstacle,
  MapInteractionMode,
} from '../../types/worldDiscoverer';
import { Navigation2, Target, Crosshair, ZoomIn, ZoomOut, Maximize2, Compass, Layers, Flag, ShieldAlert, Plus } from 'lucide-react';

interface WorldCanvas2DProps {
  points: DiscoveredPoint2D[];
  trajectory: TrajectoryPoint[];
  waypoints: Waypoint[];
  botPose: BotPose;
  currentAngle: number; // 0 to 180 relative to bot front
  currentDistanceCm: number;
  maxRangeCm: number;
  theme: GameVisualTheme;
  isScanning: boolean;
  onClearMap: () => void;
  onResetRoute?: () => void;
  pointA?: { x: number; y: number };
  pointB?: { x: number; y: number };
  dynamicObstacles?: DynamicObstacle[];
  interactionMode?: MapInteractionMode;
  onMapClickCoord?: (worldX: number, worldY: number) => void;
}

export const WorldCanvas2D: React.FC<WorldCanvas2DProps> = ({
  points,
  trajectory,
  waypoints,
  botPose,
  currentAngle,
  currentDistanceCm,
  maxRangeCm,
  theme,
  isScanning,
  pointA,
  pointB,
  dynamicObstacles = [],
  interactionMode = 'pan',
  onMapClickCoord,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Camera viewport: pan offset in world centimeters, zoom scale
  const [camera, setCamera] = useState<{ panX: number; panY: number; zoom: number }>({
    panX: botPose.x,
    panY: botPose.y + 60, // slightly forward so ahead is visible
    zoom: 1.1,
  });

  const [followBot, setFollowBot] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showPathArrows, setShowPathArrows] = useState(true);
  const [hoverCoord, setHoverCoord] = useState<{ worldX: number; worldY: number } | null>(null);

  // Mouse drag pan interaction
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; camX: number; camY: number }>({
    mouseX: 0,
    mouseY: 0,
    camX: 0,
    camY: 0,
  });

  // Follow bot tracking smoothly
  useEffect(() => {
    if (!followBot) return;
    setCamera((prev) => {
      // Smooth lerp toward bot position
      const targetPanX = botPose.x;
      const targetPanY = botPose.y;
      const lerp = 0.25;
      const newPanX = prev.panX + (targetPanX - prev.panX) * lerp;
      const newPanY = prev.panY + (targetPanY - prev.panY) * lerp;
      return {
        ...prev,
        panX: Number(newPanX.toFixed(1)),
        panY: Number(newPanY.toFixed(1)),
      };
    });
  }, [botPose.x, botPose.y, followBot]);

  // Theme color palettes
  const getThemePalette = useCallback((th: GameVisualTheme) => {
    switch (th) {
      case 'tactical_radar':
        return {
          bg: '#030a06',
          grid: 'rgba(22, 101, 52, 0.35)',
          gridText: '#15803d',
          trajectoryPath: '#10b981',
          trajectoryGlow: 'rgba(16, 185, 129, 0.35)',
          trajectoryDots: '#34d399',
          roverBody: '#064e3b',
          roverBorder: '#10b981',
          roverHeadingArrow: '#34d399',
          radarSweepCone: 'rgba(16, 185, 129, 0.12)',
          radarSweepBeam: 'rgba(52, 211, 153, 0.75)',
          pointObstacle: '#4ade80',
          pointObstacleGlow: 'rgba(74, 222, 128, 0.5)',
          pointAnomaly: '#facc15',
          waypointColor: '#38bdf8',
          textMuted: '#6ee7b7',
        };
      case 'dungeon_pixel':
        return {
          bg: '#0c0a09',
          grid: 'rgba(68, 64, 60, 0.4)',
          gridText: '#78716c',
          trajectoryPath: '#f59e0b',
          trajectoryGlow: 'rgba(245, 158, 11, 0.35)',
          trajectoryDots: '#fbbf24',
          roverBody: '#451a03',
          roverBorder: '#f59e0b',
          roverHeadingArrow: '#fde68a',
          radarSweepCone: 'rgba(245, 158, 11, 0.14)',
          radarSweepBeam: 'rgba(251, 191, 36, 0.8)',
          pointObstacle: '#d97706',
          pointObstacleGlow: 'rgba(217, 119, 6, 0.6)',
          pointAnomaly: '#38bdf8',
          waypointColor: '#ec4899',
          textMuted: '#fed7aa',
        };
      case 'cyber_sonar':
        return {
          bg: '#090514',
          grid: 'rgba(88, 28, 135, 0.35)',
          gridText: '#9333ea',
          trajectoryPath: '#06b6d4',
          trajectoryGlow: 'rgba(6, 182, 212, 0.4)',
          trajectoryDots: '#67e8f9',
          roverBody: '#3b0764',
          roverBorder: '#d946ef',
          roverHeadingArrow: '#f43f5e',
          radarSweepCone: 'rgba(217, 70, 239, 0.15)',
          radarSweepBeam: 'rgba(232, 121, 249, 0.85)',
          pointObstacle: '#c084fc',
          pointObstacleGlow: 'rgba(192, 132, 252, 0.6)',
          pointAnomaly: '#f43f5e',
          waypointColor: '#a855f7',
          textMuted: '#e9d5ff',
        };
      case 'blueprint':
      default:
        return {
          bg: '#051329',
          grid: 'rgba(30, 58, 138, 0.4)',
          gridText: '#3b82f6',
          trajectoryPath: '#60a5fa',
          trajectoryGlow: 'rgba(96, 165, 250, 0.35)',
          trajectoryDots: '#93c5fd',
          roverBody: '#1e3a8a',
          roverBorder: '#3b82f6',
          roverHeadingArrow: '#bfdbfe',
          radarSweepCone: 'rgba(96, 165, 250, 0.12)',
          radarSweepBeam: 'rgba(147, 197, 253, 0.8)',
          pointObstacle: '#93c5fd',
          pointObstacleGlow: 'rgba(147, 197, 253, 0.5)',
          pointAnomaly: '#fbbf24',
          waypointColor: '#34d399',
          textMuted: '#bfdbfe',
        };
    }
  }, []);

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const palette = getThemePalette(theme);

    // Pixels per centimeter at zoom 1.0 (e.g. 1cm = 1.3px)
    const basePpc = 1.25 * camera.zoom;

    // World coordinate (X_cm, Y_cm) -> Canvas screen coordinate (px, py)
    // Note: In cartography, Y+ points North/Up, so canvas Y = centerY - (Y_cm - panY) * ppc
    const worldToScreen = (wx: number, wy: number) => {
      const sx = w / 2 + (wx - camera.panX) * basePpc;
      const sy = h / 2 - (wy - camera.panY) * basePpc;
      return { sx, sy };
    };

    // Clear Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Global Metric Grid & Coordinate Labels
    if (showGrid) {
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2, 4]);

      const gridStepCm = 50; // every 50cm (0.5 meter)
      const stepPx = gridStepCm * basePpc;

      // Calculate visible world bounds in cm
      const minWorldX = camera.panX - (w / 2) / basePpc;
      const maxWorldX = camera.panX + (w / 2) / basePpc;
      const minWorldY = camera.panY - (h / 2) / basePpc;
      const maxWorldY = camera.panY + (h / 2) / basePpc;

      const firstX = Math.floor(minWorldX / gridStepCm) * gridStepCm;
      const firstY = Math.floor(minWorldY / gridStepCm) * gridStepCm;

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = palette.gridText;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      for (let gx = firstX; gx <= maxWorldX; gx += gridStepCm) {
        const { sx } = worldToScreen(gx, 0);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();

        // Label on axes
        if (gx % 100 === 0) {
          ctx.fillText(`${gx > 0 ? '+' : ''}${gx / 100}m`, sx + 4, h - 22);
        }
      }

      for (let gy = firstY; gy <= maxWorldY; gy += gridStepCm) {
        const { sy } = worldToScreen(0, gy);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();

        if (gy % 100 === 0) {
          ctx.fillText(`${gy > 0 ? '+' : ''}${gy / 100}m`, 8, sy + 4);
        }
      }

      // Draw Main World Axes (X=0 and Y=0)
      ctx.setLineDash([]);
      ctx.strokeStyle = palette.grid;
      ctx.lineWidth = 1.6;

      const origin = worldToScreen(0, 0);
      // Horizontal X axis (Y=0)
      ctx.beginPath();
      ctx.moveTo(0, origin.sy);
      ctx.lineTo(w, origin.sy);
      ctx.stroke();

      // Vertical Y axis (X=0)
      ctx.beginPath();
      ctx.moveTo(origin.sx, 0);
      ctx.lineTo(origin.sx, h);
      ctx.stroke();
    }

    // 1.5. Dynamic Fog of War Layer (Clearing along the bot's trajectory and vision cone)
    ctx.save();
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = w;
    fogCanvas.height = h;
    const fCtx = fogCanvas.getContext('2d');
    if (fCtx) {
      // Fill canvas with deep shroud of dark fog
      fCtx.fillStyle = 'rgba(7, 10, 16, 0.88)';
      fCtx.fillRect(0, 0, w, h);

      // Cut out revealed areas where the bot has traveled
      fCtx.globalCompositeOperation = 'destination-out';

      // Clear along trajectory
      trajectory.forEach((t) => {
        const ts = worldToScreen(t.x, t.y);
        const radius = 34 * camera.zoom;
        const grad = fCtx.createRadialGradient(ts.sx, ts.sy, radius * 0.3, ts.sx, ts.sy, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        fCtx.fillStyle = grad;
        fCtx.beginPath();
        fCtx.arc(ts.sx, ts.sy, radius, 0, Math.PI * 2);
        fCtx.fill();
      });

      // Clear around current bot pose
      const bs = worldToScreen(botPose.x, botPose.y);
      const botRadius = 48 * camera.zoom;
      const bGrad = fCtx.createRadialGradient(bs.sx, bs.sy, botRadius * 0.2, bs.sx, bs.sy, botRadius);
      bGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      bGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
      fCtx.fillStyle = bGrad;
      fCtx.beginPath();
      fCtx.arc(bs.sx, bs.sy, botRadius, 0, Math.PI * 2);
      fCtx.fill();

      // Clear along the live ultrasonic beam fan
      const offsetAngle = currentAngle - 90;
      const beamAngleRad = -((botPose.heading + offsetAngle - 90) * Math.PI) / 180;
      const beamReachPx = Math.min(currentDistanceCm, maxRangeCm) * basePpc;

      fCtx.beginPath();
      fCtx.moveTo(bs.sx, bs.sy);
      fCtx.arc(bs.sx, bs.sy, beamReachPx + 15, beamAngleRad - 0.25, beamAngleRad + 0.25);
      fCtx.closePath();
      fCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      fCtx.fill();

      // Render the fog of war overlay onto the main canvas
      ctx.drawImage(fogCanvas, 0, 0);
    }
    ctx.restore();

    // 2. Draw Discovered World Obstacles (Point Cloud & Wall Segments)
    // Connect points that are close (< 22cm) to visually sketch room boundaries
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = palette.pointObstacleGlow;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const s1 = worldToScreen(p1.worldX, p1.worldY);
      for (let j = i + 1; j < Math.min(i + 8, points.length); j++) {
        const p2 = points[j];
        const dist = Math.hypot(p1.worldX - p2.worldX, p1.worldY - p2.worldY);
        if (dist < 22) {
          const s2 = worldToScreen(p2.worldX, p2.worldY);
          ctx.moveTo(s1.sx, s1.sy);
          ctx.lineTo(s2.sx, s2.sy);
        }
      }
    }
    ctx.stroke();

    // Render individual obstacle points with hits confidence
    points.forEach((p) => {
      const { sx, sy } = worldToScreen(p.worldX, p.worldY);
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) return;

      const isAnomaly = p.type === 'anomaly';
      const radius = isAnomaly ? 5 : Math.min(4.5, 2.2 + p.hits * 0.4);

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);

      if (isAnomaly) {
        ctx.fillStyle = palette.pointAnomaly;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = palette.pointObstacle;
        ctx.fill();
      }
    });

    // 2.5 Draw Dynamic Simulated Obstacles (ESP32 Obstacle Dodging Test Arena)
    if (dynamicObstacles && dynamicObstacles.length > 0) {
      dynamicObstacles.forEach((obs) => {
        const { sx, sy } = worldToScreen(obs.x, obs.y);
        const radiusPx = obs.radius * basePpc;

        // Collision danger aura
        ctx.beginPath();
        ctx.arc(sx, sy, radiusPx + 6 * camera.zoom, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Main Obstacle Circle
        ctx.beginPath();
        ctx.arc(sx, sy, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Inner core
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(3, radiusPx * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        // Label & Radius badge
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(obs.label || 'Obstáculo', sx, sy - radiusPx - 3);

        ctx.font = '8px monospace';
        ctx.fillStyle = 'rgba(253, 230, 138, 0.8)';
        ctx.textBaseline = 'top';
        ctx.fillText(`R:${obs.radius}cm`, sx, sy + radiusPx + 2);
      });
    }

    // 2.6 Draw Ideal Straight Path from Point A to Point B (Reference Baseline)
    if (pointA && pointB) {
      const sA = worldToScreen(pointA.x, pointA.y);
      const sB = worldToScreen(pointB.x, pointB.y);

      ctx.beginPath();
      ctx.moveTo(sA.sx, sA.sy);
      ctx.lineTo(sB.sx, sB.sy);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      const straightDistCm = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y);
      const midX = (sA.sx + sB.sx) / 2;
      const midY = (sA.sy + sB.sy) / 2;

      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Línea Directa A➔B: ${(straightDistCm / 100).toFixed(2)}m`, midX, midY - 10);
    }

    // 2.7 Draw Point A (Start / Origin)
    if (pointA) {
      const { sx, sy } = worldToScreen(pointA.x, pointA.y);

      // Outer beacon ring
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner disc
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();

      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('PUNTO A (Inicio)', sx, sy - 16);
    }

    // 2.8 Draw Point B (Goal / Target)
    if (pointB) {
      const { sx, sy } = worldToScreen(pointB.x, pointB.y);

      // Outer pulsating beacon ring
      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Second ring
      ctx.beginPath();
      ctx.arc(sx, sy, 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Target bullseye dot
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      // Target Label
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('PUNTO B (Destino)', sx, sy - 18);
    }

    // 3. Draw the TRAJECTORY / ROUTE performed by the Bot (Core Feature)
    if (trajectory.length > 1) {
      // Route outer glow
      ctx.beginPath();
      const firstScreen = worldToScreen(trajectory[0].x, trajectory[0].y);
      ctx.moveTo(firstScreen.sx, firstScreen.sy);

      for (let i = 1; i < trajectory.length; i++) {
        const pt = worldToScreen(trajectory[i].x, trajectory[i].y);
        ctx.lineTo(pt.sx, pt.sy);
      }
      ctx.strokeStyle = palette.trajectoryGlow;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Sharp central route line
      ctx.beginPath();
      ctx.moveTo(firstScreen.sx, firstScreen.sy);
      for (let i = 1; i < trajectory.length; i++) {
        const pt = worldToScreen(trajectory[i].x, trajectory[i].y);
        ctx.lineTo(pt.sx, pt.sy);
      }
      ctx.strokeStyle = palette.trajectoryPath;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Trajectory breadcrumb dots & directional arrows
      let accumulatedDist = 0;
      for (let i = 1; i < trajectory.length; i++) {
        const p1 = trajectory[i - 1];
        const p2 = trajectory[i];
        const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        accumulatedDist += segDist;

        const s2 = worldToScreen(p2.x, p2.y);

        // Small breadcrumb dot
        ctx.beginPath();
        ctx.arc(s2.sx, s2.sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = palette.trajectoryDots;
        ctx.fill();

        // Direction arrow along trajectory every ~30-40cm
        if (showPathArrows && i % 4 === 0 && segDist > 2) {
          const s1 = worldToScreen(p1.x, p1.y);
          const angle = Math.atan2(s2.sy - s1.sy, s2.sx - s1.sx);
          const arrowLen = 7;

          ctx.beginPath();
          ctx.moveTo(s2.sx, s2.sy);
          ctx.lineTo(
            s2.sx - arrowLen * Math.cos(angle - Math.PI / 6),
            s2.sy - arrowLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            s2.sx - arrowLen * Math.cos(angle + Math.PI / 6),
            s2.sy - arrowLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = palette.trajectoryPath;
          ctx.fill();
        }

        // Distance Tag every 100cm (1 meter)
        if (accumulatedDist >= 100 && i % 6 === 0) {
          const meters = (accumulatedDist / 100).toFixed(0);
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillStyle = palette.textMuted;
          ctx.fillText(`${meters}m`, s2.sx + 6, s2.sy - 6);
        }
      }
    }

    // 4. Draw Waypoints / Pins along route
    waypoints.forEach((wp, idx) => {
      const { sx, sy } = worldToScreen(wp.x, wp.y);

      // Pin marker
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = wp.color || palette.waypointColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Waypoint index or icon
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), sx, sy);

      // Label badge
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(wp.label, sx + 10, sy - 2);
    });

    // 5. Draw Start / Base Station marker
    if (trajectory.length > 0) {
      const startPt = trajectory[0];
      const startScreen = worldToScreen(startPt.x, startPt.y);

      ctx.beginPath();
      ctx.arc(startScreen.sx, startScreen.sy, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(startScreen.sx, startScreen.sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText('BASE', startScreen.sx, startScreen.sy + 18);
    }

    // 6. Draw Rover (Bot) and its 180° Ultrasonic Sonar Sweep at Current Pose
    const botScreen = worldToScreen(botPose.x, botPose.y);
    const botHeadingRad = (botPose.heading * Math.PI) / 180;

    // Ultrasonic Radar Cone Sweeping from the Bot's head
    // Sensor Angle 90° = straight ahead, 0° = right (+90° offset), 180° = left (-90° offset)
    const sensorOffsetDeg = currentAngle - 90;
    const beamWorldDeg = botPose.heading + sensorOffsetDeg;
    const beamWorldRad = (beamWorldDeg * Math.PI) / 180;

    // Convert beam direction to screen: in screen coords, Y is inverted (sin is negative)
    const beamLengthPx = maxRangeCm * basePpc;
    const screenBeamRad = -beamWorldRad;
    const halfConeAngle = (12 * Math.PI) / 180; // +/- 12° dispersion cone

    // Radar Field of View Sweep Arc (180° arc ahead of bot)
    const botScreenHeadingRad = -botHeadingRad;
    ctx.beginPath();
    ctx.moveTo(botScreen.sx, botScreen.sy);
    ctx.arc(
      botScreen.sx,
      botScreen.sy,
      beamLengthPx,
      botScreenHeadingRad - Math.PI / 2,
      botScreenHeadingRad + Math.PI / 2,
      false
    );
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Ultrasonic Sound Cone at current angle
    ctx.beginPath();
    ctx.moveTo(botScreen.sx, botScreen.sy);
    ctx.arc(
      botScreen.sx,
      botScreen.sy,
      beamLengthPx,
      screenBeamRad - halfConeAngle,
      screenBeamRad + halfConeAngle,
      false
    );
    ctx.closePath();
    ctx.fillStyle = palette.radarSweepCone;
    ctx.fill();

    // Sharp Sweep Beam Line
    const beamEndX = botScreen.sx + Math.cos(screenBeamRad) * beamLengthPx;
    const beamEndY = botScreen.sy + Math.sin(screenBeamRad) * beamLengthPx;

    ctx.beginPath();
    ctx.moveTo(botScreen.sx, botScreen.sy);
    ctx.lineTo(beamEndX, beamEndY);
    ctx.strokeStyle = palette.radarSweepBeam;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Measured Ping Collision Point on beam
    if (currentDistanceCm > 0 && currentDistanceCm <= maxRangeCm) {
      const pingDistPx = currentDistanceCm * basePpc;
      const pingPx = botScreen.sx + Math.cos(screenBeamRad) * pingDistPx;
      const pingPy = botScreen.sy + Math.sin(screenBeamRad) * pingDistPx;

      ctx.beginPath();
      ctx.arc(pingPx, pingPy, 6, 0, Math.PI * 2);
      ctx.fillStyle = palette.pointObstacleGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pingPx, pingPy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Draw the Bot / Rover Vehicle Graphic
    ctx.save();
    ctx.translate(botScreen.sx, botScreen.sy);
    ctx.rotate(botScreenHeadingRad); // Rotate in screen coordinates

    // Wheels / Tracks
    const wheelW = 6 * camera.zoom;
    const wheelL = 22 * camera.zoom;
    const halfWidth = 14 * camera.zoom;

    ctx.fillStyle = '#171717';
    ctx.strokeStyle = palette.roverBorder;
    ctx.lineWidth = 1;

    // Left wheel
    ctx.fillRect(-halfWidth - wheelW, -wheelL / 2, wheelW, wheelL);
    ctx.strokeRect(-halfWidth - wheelW, -wheelL / 2, wheelW, wheelL);
    // Right wheel
    ctx.fillRect(halfWidth, -wheelL / 2, wheelW, wheelL);
    ctx.strokeRect(halfWidth, -wheelL / 2, wheelW, wheelL);

    // Rover Main Chassis Body
    const bodyW = 24 * camera.zoom;
    const bodyL = 26 * camera.zoom;
    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, -bodyL / 2, bodyW, bodyL, 4);
    ctx.fillStyle = palette.roverBody;
    ctx.fill();
    ctx.strokeStyle = palette.roverBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Directional chevron / arrow on chassis
    ctx.beginPath();
    ctx.moveTo(0, -bodyL / 2 + 3);
    ctx.lineTo(6 * camera.zoom, 2);
    ctx.lineTo(-6 * camera.zoom, 2);
    ctx.closePath();
    ctx.fillStyle = palette.roverHeadingArrow;
    ctx.fill();

    // Rotating Turret with Servo Indicator
    ctx.beginPath();
    ctx.arc(0, 0, 6 * camera.zoom, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Turret sensor orientation line (relative to bot chassis)
    const turretAngleRad = -((currentAngle - 90) * Math.PI) / 180;
    const turretLen = 14 * camera.zoom;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(turretAngleRad) * turretLen, Math.sin(turretAngleRad) * turretLen);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();

    // 7. Hover Crosshair & Coordinate Tooltip
    if (hoverCoord) {
      const { sx, sy } = worldToScreen(hoverCoord.worldX, hoverCoord.worldY);
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }, [
    points,
    trajectory,
    waypoints,
    botPose,
    currentAngle,
    currentDistanceCm,
    maxRangeCm,
    theme,
    camera,
    showGrid,
    showPathArrows,
    hoverCoord,
    getThemePalette,
  ]);

  // Handle Mouse Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      camX: camera.panX,
      camY: camera.panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const basePpc = 1.25 * camera.zoom;
    const w = rect.width;
    const h = rect.height;

    // Screen to world
    const worldX = Number((camera.panX + (mx - w / 2) / basePpc).toFixed(1));
    const worldY = Number((camera.panY - (my - h / 2) / basePpc).toFixed(1));
    setHoverCoord({ worldX, worldY });

    if (isDraggingRef.current) {
      // Pan world
      const dxPx = e.clientX - dragStartRef.current.mouseX;
      const dyPx = e.clientY - dragStartRef.current.mouseY;

      // Invert Y for world coordinates
      const newPanX = dragStartRef.current.camX - dxPx / basePpc;
      const newPanY = dragStartRef.current.camY + dyPx / basePpc;

      setFollowBot(false);
      setCamera((prev) => ({
        ...prev,
        panX: Number(newPanX.toFixed(1)),
        panY: Number(newPanY.toFixed(1)),
      }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;

    if (wasDragging) {
      const movedDist = Math.hypot(
        e.clientX - dragStartRef.current.mouseX,
        e.clientY - dragStartRef.current.mouseY
      );

      // If mouse barely moved, treat as a click
      if (movedDist < 6 && interactionMode !== 'pan' && onMapClickCoord) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const basePpc = 1.25 * camera.zoom;
          const w = rect.width;
          const h = rect.height;
          const clickWorldX = Number((camera.panX + (mx - w / 2) / basePpc).toFixed(1));
          const clickWorldY = Number((camera.panY - (my - h / 2) / basePpc).toFixed(1));
          onMapClickCoord(clickWorldX, clickWorldY);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(0.4, Math.min(3.5, Number((prev.zoom * zoomFactor).toFixed(2)))),
    }));
  };

  // Center camera on Bot
  const handleCenterOnBot = () => {
    setFollowBot(true);
    setCamera((prev) => ({
      ...prev,
      panX: botPose.x,
      panY: botPose.y,
    }));
  };

  // Fit Entire Route into view
  const handleFitRoute = () => {
    setFollowBot(false);
    if (trajectory.length === 0) return;

    let minX = botPose.x;
    let maxX = botPose.x;
    let minY = botPose.y;
    let maxY = botPose.y;

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

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const spanX = Math.max(120, maxX - minX + 60);
    const spanY = Math.max(120, maxY - minY + 60);

    const canvas = canvasRef.current;
    const w = canvas ? canvas.clientWidth : 800;
    const h = canvas ? canvas.clientHeight : 500;

    const zoomX = w / (spanX * 1.3);
    const zoomY = h / (spanY * 1.3);
    const targetZoom = Math.max(0.4, Math.min(2.0, Math.min(zoomX, zoomY)));

    setCamera({
      panX: Number(midX.toFixed(1)),
      panY: Number(midY.toFixed(1)),
      zoom: Number(targetZoom.toFixed(2)),
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] md:min-h-[580px] bg-neutral-950 rounded-2xl border border-neutral-800/90 overflow-hidden flex flex-col select-none"
    >
      {/* Top Floating Cartography Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Route Tracking Status Badge */}
        <div className="flex items-center gap-2.5 text-xs bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-3.5 py-1.5 rounded-xl text-neutral-200 font-mono pointer-events-auto shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-100">Ruta del Bot:</span>
            <span className="text-emerald-400 font-bold">
              {(botPose.totalDistanceCm / 100).toFixed(2)} m
            </span>
          </div>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            {trajectory.length} puntos
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            {waypoints.length} hitos
          </span>
          <span className="text-neutral-600">·</span>
          <span
            className={`font-semibold ${
              currentDistanceCm <= 40
                ? 'text-rose-400 animate-pulse'
                : 'text-cyan-300'
            }`}
          >
            Distancia: {currentDistanceCm.toFixed(1)} cm {currentDistanceCm <= 40 ? '(180°)' : '(±15°)'}
          </span>
        </div>

        {/* Hover World Coordinates */}
        {hoverCoord && (
          <div className="hidden sm:flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-3 py-1.5 rounded-xl text-xs font-mono text-neutral-300 pointer-events-auto shadow-lg">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>X: {(hoverCoord.worldX / 100).toFixed(2)}m</span>
            <span className="text-neutral-600">·</span>
            <span>Y: {(hoverCoord.worldY / 100).toFixed(2)}m</span>
          </div>
        )}

        {/* Camera & Map View Controls */}
        <div className="flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 p-1.5 rounded-xl pointer-events-auto shadow-lg text-xs">
          <button
            onClick={handleCenterOnBot}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              followBot
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Seguir al Bot en tiempo real"
          >
            <Navigation2 className="w-3.5 h-3.5" />
            <span>Seguir Bot</span>
          </button>

          <button
            onClick={handleFitRoute}
            className="px-2 py-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1"
            title="Ajustar y ver toda la ruta recorrida"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ver Ruta</span>
          </button>

          <span className="w-[1px] h-4 bg-neutral-800 mx-0.5" />

          <button
            onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(3.5, c.zoom + 0.2) }))}
            className="p-1 hover:bg-neutral-800 text-neutral-300 rounded transition-colors"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="px-1 font-mono text-[11px] text-neutral-400">
            {camera.zoom.toFixed(1)}x
          </span>
          <button
            onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(0.4, c.zoom - 0.2) }))}
            className="p-1 hover:bg-neutral-800 text-neutral-300 rounded transition-colors"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="w-[1px] h-4 bg-neutral-800 mx-0.5" />

          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`px-2 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1 ${
              showGrid
                ? 'bg-neutral-800 text-emerald-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Alternar cuadrícula métrica"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Métrica</span>
          </button>
        </div>
      </div>

      {/* Active Placement Tool Banner if setting A, B, or Obstacle */}
      {interactionMode !== 'pan' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-neutral-900/95 backdrop-blur-md border border-amber-500/50 px-4 py-2 rounded-xl text-xs shadow-2xl flex items-center gap-2 animate-bounce pointer-events-auto">
          {interactionMode === 'set_a' && (
            <>
              <Flag className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-emerald-300">
                Modo: Haz clic en el mapa para situar el PUNTO A (Inicio)
              </span>
            </>
          )}
          {interactionMode === 'set_b' && (
            <>
              <Target className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-amber-300">
                Modo: Haz clic en el mapa para situar el PUNTO B (Destino)
              </span>
            </>
          )}
          {interactionMode === 'add_obstacle' && (
            <>
              <Plus className="w-4 h-4 text-rose-400" />
              <span className="font-semibold text-rose-300">
                Modo: Haz clic en el mapa para colocar un obstáculo
              </span>
            </>
          )}
        </div>
      )}

      {/* Main Interactive Canvas for Trajectory & Obstacle Mapping */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          setHoverCoord(null);
        }}
        onWheel={handleWheel}
        className={`w-full h-full flex-1 ${
          interactionMode !== 'pan'
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Bottom Telemetry HUD Ribbon */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none text-xs font-mono">
        {/* Bot Real-time Pose & Velocity */}
        <div className="flex items-center gap-3 bg-neutral-900/90 backdrop-blur-md border border-neutral-800/90 px-3.5 py-1.5 rounded-xl pointer-events-auto shadow-lg text-neutral-300">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="text-neutral-400">Bot:</span>
            <span className="text-neutral-100 font-semibold">
              ({(botPose.x / 100).toFixed(2)}m, {(botPose.y / 100).toFixed(2)}m)
            </span>
          </div>
          <span className="text-neutral-600">·</span>
          <div>
            <span className="text-neutral-400">Rumbo: </span>
            <span className="text-cyan-400 font-semibold">{Math.round(botPose.heading)}°</span>
          </div>
          <span className="text-neutral-600">·</span>
          <div>
            <span className="text-neutral-400">Vel: </span>
            <span className="text-neutral-100">{botPose.speed} cm/s</span>
          </div>
        </div>

        {/* Live Sonar Sweep Telemetry (180° in 20s) */}
        <div className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800/90 px-3.5 py-1.5 rounded-xl pointer-events-auto shadow-lg text-neutral-300">
          <span className="text-neutral-400">Radar 180°/20s:</span>
          <span className="text-amber-400 font-semibold">{Math.round(currentAngle)}°</span>
          <span className="text-neutral-600">·</span>
          <span className="text-emerald-400 font-semibold">
            {currentDistanceCm.toFixed(1)} cm
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            {points.length} obs.
          </span>
        </div>
      </div>
    </div>
  );
};
