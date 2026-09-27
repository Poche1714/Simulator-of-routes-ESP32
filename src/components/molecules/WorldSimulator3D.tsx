import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  BotPose,
  TrajectoryPoint,
  Waypoint,
  RoverSweepState,
  DiscoveredPoint2D,
  MapEnvironmentPreset,
} from '../../types/worldDiscoverer';
import { createRover3DModel, updateRover3D, Rover3DInstance } from '../../utils/rover3DModel';
import {
  Crosshair,
  Compass,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Camera,
  MapPin,
  RotateCcw,
  Footprints,
  Radio,
  Sun,
  Grid,
  CloudFog,
  Boxes,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  ShieldAlert,
} from 'lucide-react';

export type CameraViewMode = 'orbit' | 'chase' | 'fpv' | 'top_down';

export interface WorldSimulator3DProps {
  botPose: BotPose;
  trajectory: TrajectoryPoint[];
  waypoints: Waypoint[];
  roverState: RoverSweepState;
  points: DiscoveredPoint2D[];
  preset: MapEnvironmentPreset;
  isAutonomous: boolean;
  onToggleAutonomous: () => void;
  onDriveForward: () => void;
  onDriveBackward: () => void;
  onTurnLeft: () => void;
  onTurnRight: () => void;
  onStopBot: () => void;
  onAddWaypoint: () => void;
  onResetRoute: () => void;
}

export const WorldSimulator3D: React.FC<WorldSimulator3DProps> = ({
  botPose,
  trajectory,
  waypoints,
  roverState,
  points,
  preset,
  isAutonomous,
  onToggleAutonomous,
  onDriveForward,
  onDriveBackward,
  onTurnLeft,
  onTurnRight,
  onStopBot,
  onAddWaypoint,
  onResetRoute,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport Settings
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('orbit');
  const [showGrid, setShowGrid] = useState(true);
  const [showBeam, setShowBeam] = useState(true);
  const [showFogOfWar, setShowFogOfWar] = useState(true);
  const [showPointcloud, setShowPointcloud] = useState(true);
  const [showShadows, setShowShadows] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clearedPercent, setClearedPercent] = useState<number>(0);

  // Fog of War offscreen canvas ref
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fogTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const lastDrawnTrajIdxRef = useRef<number>(0);

  // References for Three.js engine
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    roverInstance: Rover3DInstance;
    trajectoryLine: THREE.Line;
    trajectoryPositions: Float32Array;
    waypointsGroup: THREE.Group;
    discoveredWallsGroup: THREE.Group;
    pointcloudPoints: THREE.Points;
    pointcloudGeo: THREE.BufferGeometry;
    gridHelper: THREE.GridHelper;
    groundMesh: THREE.Mesh;
    fogShroudMesh: THREE.Mesh;
    dirLight: THREE.DirectionalLight;
    controls: {
      isDragging: boolean;
      dragButton: number;
      prevMouse: { x: number; y: number };
      spherical: { radius: number; theta: number; phi: number };
      target: THREE.Vector3;
    };
    animFrameId: number;
    lastTime: number;
  } | null>(null);

  // Track latest props in refs to avoid re-instantiating Three.js scene
  const botPoseRef = useRef(botPose);
  botPoseRef.current = botPose;

  const roverStateRef = useRef(roverState);
  roverStateRef.current = roverState;

  const trajectoryRef = useRef(trajectory);
  trajectoryRef.current = trajectory;

  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;

  const pointsRef = useRef(points);
  pointsRef.current = points;

  // Initialize Three.js Simulation
  useEffect(() => {
    const container = mountRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // 2. Scene with Gazebo simulation atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1319);
    scene.fog = new THREE.FogExp2(0x0f1319, 0.028);

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 500);
    camera.position.set(0, 2.5, 3.8);

    // Orbit Camera State
    const controls = {
      isDragging: false,
      dragButton: 0,
      prevMouse: { x: 0, y: 0 },
      spherical: { radius: 4.5, theta: Math.PI / 4, phi: Math.PI / 3.2 },
      target: new THREE.Vector3(0, 0.2, 0),
    };

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.4);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-6, 4, -8);
    scene.add(fillLight);

    // 5. Gazebo Ground Plane with Texture Grid
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1b2028,
      roughness: 0.85,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // High contrast Gazebo Grid
    const gridHelper = new THREE.GridHelper(60, 60, 0x06b6d4, 0x273549);
    gridHelper.position.y = 0.002;
    scene.add(gridHelper);

    // 6. Base / Start Station Landing Pad
    const baseGroup = new THREE.Group();
    baseGroup.position.set(0, 0.005, 0);

    const basePadMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.42, 32),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide })
    );
    basePadMesh.rotation.x = -Math.PI / 2;
    baseGroup.add(basePadMesh);

    const baseInnerMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x064e3b, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    );
    baseInnerMesh.rotation.x = -Math.PI / 2;
    baseGroup.add(baseInnerMesh);
    scene.add(baseGroup);

    // 7. 3D Rover Instance
    const roverInstance = createRover3DModel();
    scene.add(roverInstance.rootGroup);

    // 8. 3D Trajectory Ribbon (Historical Path Line on Ground)
    const MAX_TRAJECTORY_POINTS = 3000;
    const trajectoryPositions = new Float32Array(MAX_TRAJECTORY_POINTS * 3);
    const trajectoryGeo = new THREE.BufferGeometry();
    trajectoryGeo.setAttribute('position', new THREE.BufferAttribute(trajectoryPositions, 3));
    trajectoryGeo.setDrawRange(0, 0);

    const trajectoryMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 3,
    });
    const trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
    scene.add(trajectoryLine);

    // 9. Waypoints Group in 3D
    const waypointsGroup = new THREE.Group();
    scene.add(waypointsGroup);

    // 10. Dynamic Discovered Walls Group (NO PRE-BAKED 3D OBJECTS)
    // Only walls discovered by the bot's sonar sensor are created here!
    const discoveredWallsGroup = new THREE.Group();
    discoveredWallsGroup.name = 'DiscoveredWallsGroup';
    scene.add(discoveredWallsGroup);

    // 11. Sonar Pointcloud in 3D
    const MAX_PCD_POINTS = 2000;
    const pcdPositions = new Float32Array(MAX_PCD_POINTS * 3);
    const pcdColors = new Float32Array(MAX_PCD_POINTS * 3);
    const pointcloudGeo = new THREE.BufferGeometry();
    pointcloudGeo.setAttribute('position', new THREE.BufferAttribute(pcdPositions, 3));
    pointcloudGeo.setAttribute('color', new THREE.BufferAttribute(pcdColors, 3));
    pointcloudGeo.setDrawRange(0, 0);

    const pointcloudMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const pointcloudPoints = new THREE.Points(pointcloudGeo, pointcloudMat);
    scene.add(pointcloudPoints);

    // 12. Dynamic Fog of War Shroud Mesh & Canvas
    // Offscreen 512x512 canvas: initially opaque black shroud
    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = 512;
    fogCanvas.height = 512;
    const fogCtx = fogCanvas.getContext('2d')!;
    fogCtx.fillStyle = '#0a0e16';
    fogCtx.fillRect(0, 0, 512, 512);

    const fogTexture = new THREE.CanvasTexture(fogCanvas);
    fogTexture.minFilter = THREE.LinearFilter;
    fogTexture.magFilter = THREE.LinearFilter;

    const fogShroudGeo = new THREE.PlaneGeometry(60, 60);
    const fogShroudMat = new THREE.MeshBasicMaterial({
      map: fogTexture,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });
    const fogShroudMesh = new THREE.Mesh(fogShroudGeo, fogShroudMat);
    fogShroudMesh.rotation.x = -Math.PI / 2;
    fogShroudMesh.position.y = 0.025; // Floating above the ground grid
    scene.add(fogShroudMesh);

    fogCanvasRef.current = fogCanvas;
    fogTextureRef.current = fogTexture;

    // Store references
    threeRef.current = {
      renderer,
      scene,
      camera,
      roverInstance,
      trajectoryLine,
      trajectoryPositions,
      waypointsGroup,
      discoveredWallsGroup,
      pointcloudPoints,
      pointcloudGeo,
      gridHelper,
      groundMesh,
      fogShroudMesh,
      dirLight,
      controls,
      animFrameId: 0,
      lastTime: performance.now(),
    };

    // Initial clear of fog at starting position
    clearFogAtWorldPos(fogCanvas, fogCtx, fogTexture, botPose.x, botPose.y, 4.0);

    // Animation Loop
    const animate = (time: number) => {
      const state = threeRef.current;
      if (!state) return;

      const deltaSec = Math.min((time - state.lastTime) / 1000, 0.1);
      state.lastTime = time;

      const currentBot = botPoseRef.current;
      const currentRoverState = roverStateRef.current;
      const currentCamMode = cameraModeRef.current;

      // Update Rover transformations, wheels spinning, sonar servo rotation
      updateRover3D(
        state.roverInstance,
        currentBot.x,
        currentBot.y,
        currentBot.heading,
        currentRoverState.currentAngle,
        currentRoverState.currentDistanceCm,
        currentRoverState.maxRangeCm,
        currentBot.speed,
        currentBot.isMoving,
        deltaSec
      );

      // Pulse wave in sonar beam
      const pulseZ =
        ((time * 0.002) % 1) *
        -(Math.min(currentRoverState.currentDistanceCm, currentRoverState.maxRangeCm) / 100);
      state.roverInstance.beamPulse.position.z = pulseZ;

      // Continuously clear Fog of War around bot and in current sonar beam
      if (fogCanvasRef.current && fogTextureRef.current) {
        const fCanvas = fogCanvasRef.current;
        const fCtx = fCanvas.getContext('2d');
        if (fCtx) {
          clearFogAtWorldPos(fCanvas, fCtx, fogTextureRef.current, currentBot.x, currentBot.y, 3.2);

          // Clear vision fan along sonar sensor direction
          clearFogVisionFan(
            fCanvas,
            fCtx,
            fogTextureRef.current,
            currentBot.x,
            currentBot.y,
            currentBot.heading,
            currentRoverState.currentAngle,
            currentRoverState.currentDistanceCm
          );
        }
      }

      // Update Camera based on active mode
      const roverPos = state.roverInstance.rootGroup.position;
      const roverHeadingRad = ((currentBot.heading - 90) * Math.PI) / 180;

      if (currentCamMode === 'chase') {
        const chaseDist = 2.4;
        const chaseHeight = 1.35;
        const forwardX = Math.cos(-roverHeadingRad - Math.PI / 2);
        const forwardZ = Math.sin(-roverHeadingRad - Math.PI / 2);

        const targetCamX = roverPos.x - forwardX * chaseDist;
        const targetCamZ = roverPos.z - forwardZ * chaseDist;
        const targetCamY = roverPos.y + chaseHeight;

        state.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.15);
        state.camera.lookAt(roverPos.x, roverPos.y + 0.3, roverPos.z);
      } else if (currentCamMode === 'fpv') {
        const forwardX = Math.cos(-roverHeadingRad - Math.PI / 2);
        const forwardZ = Math.sin(-roverHeadingRad - Math.PI / 2);

        state.camera.position.set(
          roverPos.x + forwardX * 0.08,
          roverPos.y + 0.28,
          roverPos.z + forwardZ * 0.08
        );
        const lookTarget = new THREE.Vector3(
          roverPos.x + forwardX * 3.5,
          roverPos.y + 0.22,
          roverPos.z + forwardZ * 3.5
        );
        state.camera.lookAt(lookTarget);
      } else if (currentCamMode === 'top_down') {
        state.camera.position.set(roverPos.x, 8.5, roverPos.z + 0.01);
        state.camera.lookAt(roverPos.x, 0, roverPos.z);
      } else {
        const sph = state.controls.spherical;
        const target = state.controls.target;

        if (currentBot.isMoving) {
          target.lerp(new THREE.Vector3(roverPos.x, 0.2, roverPos.z), 0.08);
        }

        const camX = target.x + sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
        const camY = target.y + sph.radius * Math.cos(sph.phi);
        const camZ = target.z + sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);

        state.camera.position.set(camX, camY, camZ);
        state.camera.lookAt(target);
      }

      state.renderer.render(state.scene, state.camera);
      state.animFrameId = requestAnimationFrame(animate);
    };

    threeRef.current.animFrameId = requestAnimationFrame(animate);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0 && threeRef.current) {
          threeRef.current.renderer.setSize(w, h);
          threeRef.current.camera.aspect = w / h;
          threeRef.current.camera.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.animFrameId);
        threeRef.current.renderer.dispose();
      }
    };
  }, []);

  // Whenever points change: DYNAMICALLY CREATE 3D WALLS AT EACH DETECTED OBSTACLE POINT!
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    rebuildDiscoveredWalls(state.discoveredWallsGroup, points);
  }, [points]);

  // Whenever trajectory points are added: Clear Fog of War along the bot's travel path
  useEffect(() => {
    const state = threeRef.current;
    if (!state || !fogCanvasRef.current || !fogTextureRef.current) return;

    const fCanvas = fogCanvasRef.current;
    const fCtx = fCanvas.getContext('2d');
    if (!fCtx) return;

    const startIdx = Math.max(0, lastDrawnTrajIdxRef.current);
    for (let i = startIdx; i < trajectory.length; i++) {
      const p = trajectory[i];
      clearFogAtWorldPos(fCanvas, fCtx, fogTextureRef.current, p.x, p.y, 2.8);
    }
    lastDrawnTrajIdxRef.current = trajectory.length;

    // Estimate cleared percentage
    setClearedPercent(Math.min(100, Math.round(trajectory.length * 0.45 + points.length * 0.35)));
  }, [trajectory, points.length]);

  // Reset Fog when route is reset
  useEffect(() => {
    if (trajectory.length <= 1 && fogCanvasRef.current && fogTextureRef.current) {
      const fCanvas = fogCanvasRef.current;
      const fCtx = fCanvas.getContext('2d');
      if (fCtx) {
        fCtx.globalCompositeOperation = 'source-over';
        fCtx.fillStyle = '#0a0e16';
        fCtx.fillRect(0, 0, 512, 512);
        clearFogAtWorldPos(fCanvas, fCtx, fogTextureRef.current, botPose.x, botPose.y, 4.0);
        lastDrawnTrajIdxRef.current = 0;
        setClearedPercent(2);
      }
    }
  }, [trajectory.length, botPose.x, botPose.y]);

  // Update Trajectory Buffer in 3D
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    const count = Math.min(trajectory.length, 3000);
    const positions = state.trajectoryPositions;

    for (let i = 0; i < count; i++) {
      const p = trajectory[i];
      positions[i * 3 + 0] = p.x / 100;
      positions[i * 3 + 1] = 0.035;
      positions[i * 3 + 2] = -p.y / 100;
    }

    state.trajectoryLine.geometry.attributes.position.needsUpdate = true;
    state.trajectoryLine.geometry.setDrawRange(0, count);
  }, [trajectory]);

  // Update Waypoint Markers in 3D
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    const group = state.waypointsGroup;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    waypoints.forEach((wp, index) => {
      const wpGroup = new THREE.Group();
      wpGroup.position.set(wp.x / 100, 0, -wp.y / 100);

      const poleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
      const poleMat = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x10b981 : 0x06b6d4,
        transparent: true,
        opacity: 0.7,
      });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 0.4;
      wpGroup.add(pole);

      const sphereGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: index === 0 ? 0x10b981 : 0x06b6d4,
        emissive: index === 0 ? 0x059669 : 0x0891b2,
        emissiveIntensity: 0.9,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 0.8;
      wpGroup.add(sphere);

      const ringGeo = new THREE.RingGeometry(0.12, 0.16, 20);
      const ringMat = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x10b981 : 0x06b6d4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.005;
      wpGroup.add(ring);

      group.add(wpGroup);
    });
  }, [waypoints]);

  // Update Sonar Hit Points in 3D
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    const geo = state.pointcloudGeo;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const colAttr = geo.attributes.color as THREE.BufferAttribute;

    const count = Math.min(points.length, 2000);
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const p = points[i];
      positions[i * 3 + 0] = p.worldX / 100;
      positions[i * 3 + 1] = 0.18;
      positions[i * 3 + 2] = -p.worldY / 100;

      if (p.type === 'anomaly') {
        colors[i * 3 + 0] = 0.93;
        colors[i * 3 + 1] = 0.28;
        colors[i * 3 + 2] = 0.60;
      } else if (p.distanceCm <= 40) {
        colors[i * 3 + 0] = 0.96;
        colors[i * 3 + 1] = 0.25;
        colors[i * 3 + 2] = 0.37;
      } else {
        colors[i * 3 + 0] = 0.02;
        colors[i * 3 + 1] = 0.71;
        colors[i * 3 + 2] = 0.83;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.setDrawRange(0, count);
  }, [points]);

  // Toggles update
  useEffect(() => {
    if (!threeRef.current) return;
    threeRef.current.gridHelper.visible = showGrid;
    threeRef.current.roverInstance.beamGroup.visible = showBeam;
    threeRef.current.pointcloudPoints.visible = showPointcloud;
    threeRef.current.fogShroudMesh.visible = showFogOfWar;
    threeRef.current.dirLight.castShadow = showShadows;
  }, [showGrid, showBeam, showPointcloud, showFogOfWar, showShadows]);

  // Mouse / Touch Event Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (cameraModeRef.current !== 'orbit') return;
    const state = threeRef.current;
    if (!state) return;

    state.controls.isDragging = true;
    state.controls.dragButton = e.button;
    state.controls.prevMouse = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = threeRef.current;
    if (!state || !state.controls.isDragging || cameraModeRef.current !== 'orbit') return;

    const dx = e.clientX - state.controls.prevMouse.x;
    const dy = e.clientY - state.controls.prevMouse.y;
    state.controls.prevMouse = { x: e.clientX, y: e.clientY };

    if (state.controls.dragButton === 0) {
      state.controls.spherical.theta -= dx * 0.007;
      state.controls.spherical.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, state.controls.spherical.phi - dy * 0.007)
      );
    } else if (state.controls.dragButton === 2) {
      const panSpeed = 0.004 * (state.controls.spherical.radius / 5);
      const theta = state.controls.spherical.theta;
      state.controls.target.x -= (dx * Math.cos(theta) - dy * Math.sin(theta)) * panSpeed;
      state.controls.target.z += (dx * Math.sin(theta) + dy * Math.cos(theta)) * panSpeed;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!threeRef.current) return;
    threeRef.current.controls.isDragging = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (cameraModeRef.current !== 'orbit') return;
    const state = threeRef.current;
    if (!state) return;

    e.preventDefault();
    const zoomFactor = e.deltaY * 0.003;
    state.controls.spherical.radius = Math.max(
      1.2,
      Math.min(18.0, state.controls.spherical.radius + zoomFactor)
    );
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleFocusBot = useCallback(() => {
    if (!threeRef.current) return;
    const pos = threeRef.current.roverInstance.rootGroup.position;
    threeRef.current.controls.target.set(pos.x, 0.2, pos.z);
    threeRef.current.controls.spherical.radius = 4.0;
    threeRef.current.controls.spherical.phi = Math.PI / 3.4;
  }, []);

  const handleTakeSnapshot = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `slam-3d-walls-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 select-none shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[520px] md:h-[600px]'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Left: Procedural SLAM Wall Mapping & Fog Status Badge */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
        <div className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-neutral-700/80 shadow-lg pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wide text-neutral-100 flex items-center gap-1.5 font-mono">
            <span>SLAM 3D PROCEDURAL</span>
            <span className="text-cyan-300 text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/30">
              PAREDES DESCUBIERTAS: {points.length}
            </span>
          </span>
          <span className="text-neutral-500 text-xs">|</span>
          <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
            <CloudFog className="w-3.5 h-3.5 text-cyan-400" />
            <span>Niebla Despejada: {clearedPercent}%</span>
          </span>
        </div>

        {/* Real-time Distance & Telemetry Overlay */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-300">
          <div
            className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
              roverState.currentDistanceCm <= roverState.obstacleThresholdCm
                ? 'bg-rose-950/90 border-rose-500/60 shadow-lg shadow-rose-950/40 text-rose-200 animate-pulse'
                : 'bg-neutral-900/85 backdrop-blur-md border-neutral-800 text-neutral-300'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                roverState.currentDistanceCm <= roverState.obstacleThresholdCm
                  ? 'text-rose-400'
                  : 'text-cyan-400'
              }`}
            />
            <span>DISTANCIA:</span>
            <span
              className={`font-bold text-xs ${
                roverState.currentDistanceCm <= roverState.obstacleThresholdCm
                  ? 'text-rose-400'
                  : roverState.currentDistanceCm < 100
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {roverState.currentDistanceCm.toFixed(1)} cm
            </span>
            <span className="text-[10px] text-neutral-400 font-normal">
              ({roverState.relativeAngle > 0 ? `+${roverState.relativeAngle}°` : `${roverState.relativeAngle}°`})
            </span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase font-bold ${
                roverState.scanMode === 'survey_paused' || !roverState.isScanning
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                  : roverState.scanMode === 'obstacle_focused_survey'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse'
                  : roverState.currentDistanceCm <= roverState.obstacleThresholdCm
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {roverState.scanMode === 'survey_paused' || !roverState.isScanning
                ? 'Sondeo Detenido (Gira Bot)'
                : roverState.scanMode === 'obstacle_focused_survey'
                ? `Sondeo (${Math.min(3, (roverState.surveyPassesCount || 0) + 1)}/3)`
                : roverState.scanMode === 'narrow_patrol'
                ? '±15°'
                : '±55°'}
            </span>
          </div>

          {/* Motor PWM Badge */}
          <div className="bg-neutral-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-neutral-800 flex items-center gap-1.5">
            <span className="text-amber-400 font-bold text-[10px]">PWM:</span>
            <span className="font-bold text-amber-300 text-xs">
              {roverState.motorPwm ?? 185}
            </span>
            <span className="text-[9px] text-neutral-500">(175-198)</span>
          </div>

          <div className="bg-neutral-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-neutral-800 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-amber-400" />
            <span>RUTA:</span>
            <span className="font-bold text-neutral-100">
              {(botPose.totalDistanceCm / 100).toFixed(2)} m
            </span>
          </div>

          <div className="bg-neutral-900/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-neutral-800 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            <span>POS:</span>
            <span className="text-neutral-200">
              [{Math.round(botPose.x)}, {Math.round(botPose.y)}]cm
            </span>
          </div>
        </div>
      </div>

      {/* Top Right: Camera Mode Switcher & Viewport Actions */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <div className="bg-neutral-900/90 backdrop-blur-md p-1 rounded-lg border border-neutral-800 flex items-center gap-1 shadow-lg">
          <button
            onClick={() => setCameraMode('orbit')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
              cameraMode === 'orbit'
                ? 'bg-amber-500 text-black font-semibold'
                : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
            title="Cámara Orbital Libre"
          >
            Orbital
          </button>
          <button
            onClick={() => setCameraMode('chase')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
              cameraMode === 'chase'
                ? 'bg-amber-500 text-black font-semibold'
                : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
            title="Cámara Persecución"
          >
            Seguir Bot
          </button>
          <button
            onClick={() => setCameraMode('fpv')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
              cameraMode === 'fpv'
                ? 'bg-amber-500 text-black font-semibold'
                : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
            title="Cámara a Bordo (FPV)"
          >
            FPV
          </button>
          <button
            onClick={() => setCameraMode('top_down')}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
              cameraMode === 'top_down'
                ? 'bg-amber-500 text-black font-semibold'
                : 'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800'
            }`}
            title="Vista Cenital"
          >
            Cenital
          </button>
        </div>

        <button
          onClick={handleFocusBot}
          className="p-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-lg border border-neutral-800 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Centrar en el Robot"
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={handleTakeSnapshot}
          className="p-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-lg border border-neutral-800 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title="Capturar Foto 3D"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 rounded-lg border border-neutral-800 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Left: Layer Toggles (Niebla de Guerra, Paredes 3D, Cuadrícula, Haz) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
        <div className="bg-neutral-900/85 backdrop-blur-md p-1 rounded-lg border border-neutral-800 flex items-center gap-1 shadow-lg text-[11px]">
          <button
            onClick={() => setShowFogOfWar(!showFogOfWar)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              showFogOfWar
                ? 'bg-neutral-800 text-cyan-300 font-medium'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Alternar Niebla de Guerra Dinámica"
          >
            <CloudFog className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Niebla de Guerra</span>
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              showGrid ? 'bg-neutral-800 text-cyan-300 font-medium' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Alternar Cuadrícula 3D"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cuadrícula</span>
          </button>

          <button
            onClick={() => setShowBeam(!showBeam)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              showBeam ? 'bg-neutral-800 text-cyan-300 font-medium' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Alternar Haz Ultrasónico"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Haz Sonar</span>
          </button>

          <button
            onClick={() => setShowShadows(!showShadows)}
            className={`px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer ${
              showShadows ? 'bg-neutral-800 text-amber-300 font-medium' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            title="Alternar Sombras en Tiempo Real"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sombras</span>
          </button>
        </div>
      </div>

      {/* Bottom Right: Quick Drive D-Pad */}
      <div className="absolute bottom-3 right-3 flex flex-col items-end gap-2 z-10">
        <div className="bg-neutral-900/90 backdrop-blur-md p-2 rounded-xl border border-neutral-800 shadow-xl flex flex-col items-center gap-1">
          <button
            onClick={onDriveForward}
            disabled={isAutonomous}
            className="w-9 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black text-neutral-200 rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            title="Avanzar (W)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={onTurnLeft}
              disabled={isAutonomous}
              className="w-9 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black text-neutral-200 rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
              title="Girar Izquierda (A)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onStopBot}
              className="w-9 h-8 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-600 text-rose-400 active:text-white rounded-md flex items-center justify-center transition-colors cursor-pointer"
              title="Detener (Espacio)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>

            <button
              onClick={onTurnRight}
              disabled={isAutonomous}
              className="w-9 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black text-neutral-200 rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
              title="Girar Derecha (D)"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onDriveBackward}
            disabled={isAutonomous}
            className="w-9 h-8 bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black text-neutral-200 rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
            title="Retroceder (S)"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md p-1 rounded-lg border border-neutral-800 shadow-lg text-xs">
          <button
            onClick={onToggleAutonomous}
            className={`px-2.5 py-1.5 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              isAutonomous
                ? 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
            }`}
            title="Alternar Exploración y Mapeo Autónomo"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>{isAutonomous ? 'Auto: ON' : 'Auto-Mapeo'}</span>
          </button>

          <button
            onClick={onAddWaypoint}
            className="px-2.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Fijar Hito en la Ruta Actual"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Hito #{waypoints.length + 1}</span>
          </button>

          <button
            onClick={onResetRoute}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 rounded transition-colors cursor-pointer"
            title="Reiniciar Posición y Ruta del Robot"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Procedural 3D Wall Generation:
 * Automatically builds 3D wall blocks and connecting wall slabs wherever the sonar sensor detects an obstacle!
 * No static pre-baked objects are shown.
 */
function rebuildDiscoveredWalls(group: THREE.Group, points: DiscoveredPoint2D[]) {
  // Clear old dynamic wall meshes
  while (group.children.length > 0) {
    const child = group.children[0];
    if ((child as any).geometry) {
      (child as any).geometry.dispose();
    }
    group.remove(child);
  }

  // REGLA ESTRICTA: Solo pintar paredes si la distancia es MENOR a 70 cm (< 70 cm)
  const validPoints = points.filter((p) => p.distanceCm < 70.0);
  if (validPoints.length === 0) return;

  const wallHeight = 0.75; // 75 cm wall height
  const wallWidth = 0.22; // 22 cm wall thickness

  const wallMatNormal = new THREE.MeshStandardMaterial({
    color: 0x334155, // Dark slate concrete barrier
    roughness: 0.55,
    metalness: 0.35,
  });

  const wallMatCloseAlert = new THREE.MeshStandardMaterial({
    color: 0x4c1d24, // Red tinted barrier
    roughness: 0.45,
    metalness: 0.4,
  });

  const topRimMatCyan = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 0.7,
  });

  const topRimMatRose = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xe11d48,
    emissiveIntensity: 0.8,
  });

  // 1. Spawn a 3D wall block at each detected obstacle point (< 70 cm)
  validPoints.forEach((p) => {
    const wx = p.worldX / 100;
    const wz = -p.worldY / 100;
    const isClose = p.distanceCm <= 40;

    const blockGroup = new THREE.Group();
    blockGroup.position.set(wx, 0, wz);

    // Wall pillar block
    const blockGeo = new THREE.BoxGeometry(wallWidth, wallHeight, wallWidth);
    const blockMesh = new THREE.Mesh(blockGeo, isClose ? wallMatCloseAlert : wallMatNormal);
    blockMesh.position.y = wallHeight / 2;
    blockMesh.castShadow = true;
    blockMesh.receiveShadow = true;
    blockGroup.add(blockMesh);

    // Glowing top rim cap
    const capGeo = new THREE.BoxGeometry(wallWidth * 1.05, 0.04, wallWidth * 1.05);
    const capMesh = new THREE.Mesh(capGeo, isClose ? topRimMatRose : topRimMatCyan);
    capMesh.position.y = wallHeight + 0.02;
    blockGroup.add(capMesh);

    group.add(blockGroup);
  });

  // 2. Connect adjacent detected obstacle points with continuous 3D wall slabs (< 35 cm apart)
  const connectedPairs = new Set<string>();
  for (let i = 0; i < validPoints.length; i++) {
    const p1 = validPoints[i];
    const x1 = p1.worldX / 100;
    const z1 = -p1.worldY / 100;

    for (let j = i + 1; j < Math.min(i + 12, validPoints.length); j++) {
      const p2 = validPoints[j];
      const x2 = p2.worldX / 100;
      const z2 = -p2.worldY / 100;

      const distM = Math.hypot(x2 - x1, z2 - z1);
      if (distM > 0.04 && distM < 0.35) {
        const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (connectedPairs.has(pairKey)) continue;
        connectedPairs.add(pairKey);

        const dx = x2 - x1;
        const dz = z2 - z1;
        const angle = Math.atan2(dz, dx);
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;

        const isClose = p1.distanceCm <= 40 || p2.distanceCm <= 40;

        const slabGeo = new THREE.BoxGeometry(distM, wallHeight, wallWidth * 0.85);
        const slabMesh = new THREE.Mesh(slabGeo, isClose ? wallMatCloseAlert : wallMatNormal);
        slabMesh.position.set(midX, wallHeight / 2, midZ);
        slabMesh.rotation.y = -angle;
        slabMesh.castShadow = true;
        slabMesh.receiveShadow = true;
        group.add(slabMesh);

        // Glowing top rim for connecting slab
        const slabCapGeo = new THREE.BoxGeometry(distM, 0.03, wallWidth * 0.88);
        const slabCapMesh = new THREE.Mesh(slabCapGeo, isClose ? topRimMatRose : topRimMatCyan);
        slabCapMesh.position.set(midX, wallHeight + 0.015, midZ);
        slabCapMesh.rotation.y = -angle;
        group.add(slabCapMesh);
      }
    }
  }
}

/**
 * Clears Fog of War at a specific world coordinate (X_cm, Y_cm)
 */
function clearFogAtWorldPos(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  texture: THREE.CanvasTexture,
  worldXCm: number,
  worldYCm: number,
  radiusM: number
) {
  // World bounds: -30m to +30m (60m span)
  const px = ((worldXCm / 100 + 30) / 60) * canvas.width;
  const py = ((-worldYCm / 100 + 30) / 60) * canvas.height;
  const radiusPx = (radiusM / 60) * canvas.width;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  const grad = ctx.createRadialGradient(px, py, radiusPx * 0.2, px, py, radiusPx);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  texture.needsUpdate = true;
}

/**
 * Clears Fog of War along the vision / sonar cone in front of the robot
 */
function clearFogVisionFan(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  texture: THREE.CanvasTexture,
  worldXCm: number,
  worldYCm: number,
  botHeadingDeg: number,
  sensorAngleDeg: number,
  distanceCm: number
) {
  const px = ((worldXCm / 100 + 30) / 60) * canvas.width;
  const py = ((-worldYCm / 100 + 30) / 60) * canvas.height;

  // Global beam angle
  const offsetAngle = sensorAngleDeg - 90;
  const beamAngleDeg = botHeadingDeg + offsetAngle;
  // Convert heading to canvas angle (in world 2D, Y+ is North, so in canvas Y- is North)
  const beamRad = (-beamAngleDeg * Math.PI) / 180;

  const beamReachM = Math.min(distanceCm, 250) / 100;
  const reachPx = (beamReachM / 60) * canvas.width;
  const coneSpreadRad = (18 * Math.PI) / 180; // 18 degree sonar spread

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';

  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, reachPx, beamRad - coneSpreadRad, beamRad + coneSpreadRad);
  ctx.closePath();

  const grad = ctx.createRadialGradient(px, py, reachPx * 0.1, px, py, reachPx);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.6)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
  texture.needsUpdate = true;
}
