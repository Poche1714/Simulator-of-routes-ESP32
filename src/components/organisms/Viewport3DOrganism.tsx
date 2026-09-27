import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Point3D,
  VisualRenderMode,
  ColorMapMode,
  ScannerSettings,
} from '../../types/scanner';
import { ViewportToolbar } from '../molecules/ViewportToolbar';
import { reconstructMeshFromPoints } from '../../utils/pointCloudMesh';

export interface Viewport3DOrganismProps {
  points: Point3D[];
  turntableAngle: number;
  currentDistance: number;
  settings: ScannerSettings;
  onClearPoints: () => void;
}

export const Viewport3DOrganism: React.FC<Viewport3DOrganismProps> = ({
  points,
  turntableAngle,
  currentDistance,
  settings,
  onClearPoints,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport display states
  const [renderMode, setRenderMode] = useState<VisualRenderMode>('points_and_mesh');
  const [colorMap, setColorMap] = useState<ColorMapMode>('height');
  const [showGrid, setShowGrid] = useState(true);
  const [showSensorBeam, setShowSensorBeam] = useState(true);
  const [showTurntable, setShowTurntable] = useState(true);
  const [pointSize, setPointSize] = useState(4);

  // Three.js instances ref
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    pointsMesh: THREE.Points;
    surfaceMesh: THREE.Mesh;
    turntableGroup: THREE.Group;
    platterMesh: THREE.Mesh;
    sensorGroup: THREE.Group;
    beamLine: THREE.Line;
    beamCone: THREE.Mesh;
    gridHelper: THREE.GridHelper;
    isInteracting: boolean;
    mousePrev: { x: number; y: number };
    spherical: { radius: number; theta: number; phi: number };
    target: THREE.Vector3;
    animationFrameId: number;
  } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    const initialSpherical = { radius: 36, theta: Math.PI / 4, phi: Math.PI / 3 };
    const target = new THREE.Vector3(0, 2, 0);

    const updateCameraPos = () => {
      camera.position.x =
        target.x +
        initialSpherical.radius *
          Math.sin(initialSpherical.phi) *
          Math.sin(initialSpherical.theta);
      camera.position.y =
        target.y + initialSpherical.radius * Math.cos(initialSpherical.phi);
      camera.position.z =
        target.z +
        initialSpherical.radius *
          Math.sin(initialSpherical.phi) *
          Math.cos(initialSpherical.theta);
      camera.lookAt(target);
    };
    updateCameraPos();

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xddeeff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff3db, 1.4);
    keyLight.position.set(20, 30, 20);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x06b6d4, 0.6);
    fillLight.position.set(-20, 15, -20);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 0.8);
    rimLight.position.set(0, -10, -25);
    scene.add(rimLight);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(30, 30, 0xf59e0b, 0x222228);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Turntable Assembly
    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);

    // Platter base stationary ring
    const baseRingGeo = new THREE.CylinderGeometry(8, 8.3, 0.6, 64);
    const baseRingMat = new THREE.MeshStandardMaterial({
      color: 0x18181c,
      roughness: 0.8,
      metalness: 0.3,
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.position.y = -0.3;
    turntableGroup.add(baseRing);

    // Rotating platter
    const platterGeo = new THREE.CylinderGeometry(7.6, 7.6, 0.4, 64);
    const platterMat = new THREE.MeshStandardMaterial({
      color: 0x202026,
      roughness: 0.4,
      metalness: 0.6,
    });
    const platterMesh = new THREE.Mesh(platterGeo, platterMat);
    platterMesh.position.y = 0.2;
    turntableGroup.add(platterMesh);

    // Graduation lines on platter
    const marksGeo = new THREE.RingGeometry(5.5, 7.5, 36);
    const marksMat = new THREE.MeshBasicMaterial({
      color: 0x383842,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const marksMesh = new THREE.Mesh(marksGeo, marksMat);
    marksMesh.rotation.x = Math.PI / 2;
    marksMesh.position.y = 0.41;
    platterMesh.add(marksMesh);

    // Turntable center crosshair
    const centerPoint = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.45, 16),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    centerPoint.position.y = 0.22;
    platterMesh.add(centerPoint);

    // Ultrasonic Sensor Tower (HC-SR04)
    const sensorGroup = new THREE.Group();
    scene.add(sensorGroup);

    // Sensor stand
    const standGeo = new THREE.BoxGeometry(1.2, 8, 1.2);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x26262b, metalness: 0.5 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(settings.turntableRadius, 4, 0);
    sensorGroup.add(stand);

    // Sensor PCB body (blue PCB like HC-SR04)
    const pcbGeo = new THREE.BoxGeometry(0.8, 2.0, 4.5);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x0f4c81, roughness: 0.3 });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    pcb.position.set(settings.turntableRadius - 0.4, 4, 0);
    sensorGroup.add(pcb);

    // Ultrasonic transducer cylinders (Emitter & Receiver)
    const transducerGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.8, 24);
    const transducerMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.2 });

    const transT = new THREE.Mesh(transducerGeo, transducerMat);
    transT.rotation.z = Math.PI / 2;
    transT.position.set(settings.turntableRadius - 1.0, 4, 1.2);
    sensorGroup.add(transT);

    const transR = new THREE.Mesh(transducerGeo, transducerMat);
    transR.rotation.z = Math.PI / 2;
    transR.position.set(settings.turntableRadius - 1.0, 4, -1.2);
    sensorGroup.add(transR);

    // Acoustic Sensor Beam Line
    const beamLineMat = new THREE.LineDashedMaterial({
      color: 0x06b6d4,
      dashSize: 0.4,
      gapSize: 0.2,
      linewidth: 2,
    });
    const beamLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(settings.turntableRadius - 1.4, 4, 0),
      new THREE.Vector3(0, 4, 0),
    ]);
    const beamLine = new THREE.Line(beamLineGeo, beamLineMat);
    beamLine.computeLineDistances();
    scene.add(beamLine);

    // Acoustic Cone Mesh (faint transparent cone)
    const beamConeGeo = new THREE.ConeGeometry(2.5, settings.turntableRadius, 24, 1, true);
    const beamConeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
      side: THREE.DoubleSide,
    });
    const beamCone = new THREE.Mesh(beamConeGeo, beamConeMat);
    beamCone.rotation.z = Math.PI / 2;
    beamCone.position.set(settings.turntableRadius / 2, 4, 0);
    scene.add(beamCone);

    // Point Cloud geometry & material
    const pointsGeo = new THREE.BufferGeometry();
    const pointsMat = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
    });
    const pointsMesh = new THREE.Points(pointsGeo, pointsMat);
    scene.add(pointsMesh);

    // Surface Mesh geometry & material
    const surfaceGeo = new THREE.BufferGeometry();
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.2,
      roughness: 0.45,
      side: THREE.DoubleSide,
      flatShading: false,
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    scene.add(surfaceMesh);

    // Interaction handling (drag to orbit, right drag to pan, wheel to zoom)
    let isMouseDown = false;
    let isRightMouseDown = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown = true;
      if (e.button === 2) isRightMouseDown = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown && !isRightMouseDown) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      prevMouse = { x: e.clientX, y: e.clientY };

      if (isMouseDown) {
        // Orbit rotation
        initialSpherical.theta -= dx * 0.008;
        initialSpherical.phi = Math.max(
          0.05,
          Math.min(Math.PI / 2 - 0.02, initialSpherical.phi - dy * 0.008)
        );
      } else if (isRightMouseDown) {
        // Pan
        target.y += dy * 0.05;
      }
      updateCameraPos();
    };

    const onMouseUp = () => {
      isMouseDown = false;
      isRightMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      initialSpherical.radius = Math.max(
        8,
        Math.min(100, initialSpherical.radius + e.deltaY * 0.04)
      );
      updateCameraPos();
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Subtle beam pulse animation
      if (beamCone.visible) {
        const pulse = 0.09 + 0.04 * Math.sin(Date.now() * 0.005);
        (beamCone.material as THREE.MeshBasicMaterial).opacity = pulse;
      }

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    threeRef.current = {
      renderer,
      scene,
      camera,
      pointsMesh,
      surfaceMesh,
      turntableGroup,
      platterMesh,
      sensorGroup,
      beamLine,
      beamCone,
      gridHelper,
      isInteracting: false,
      mousePrev: { x: 0, y: 0 },
      spherical: initialSpherical,
      target,
      animationFrameId: animId,
    };

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContextMenu);
      renderer.dispose();
    };
  }, []);

  // Update Turntable physical rotation & sensor position with settings
  useEffect(() => {
    if (!threeRef.current) return;
    const { platterMesh, sensorGroup, beamLine, beamCone } = threeRef.current;

    // Turntable rotates around Y axis (in radians)
    platterMesh.rotation.y = (-turntableAngle * Math.PI) / 180;

    // Sensor group position
    sensorGroup.position.set(0, 0, 0);

    // Beam Line endpoint
    const r = currentDistance > 0 ? settings.turntableRadius - currentDistance : 0;
    const beamEnd = new THREE.Vector3(r, 4, 0);
    const linePositions = new Float32Array([
      settings.turntableRadius - 1.4, 4, 0,
      beamEnd.x, beamEnd.y, beamEnd.z,
    ]);
    beamLine.geometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    beamLine.computeLineDistances();
  }, [turntableAngle, currentDistance, settings.turntableRadius]);

  // Update Points & Surface Mesh Geometry when points, renderMode, or colorMap change
  useEffect(() => {
    if (!threeRef.current) return;
    const { pointsMesh, surfaceMesh } = threeRef.current;

    const count = points.length;

    // 1. Update Points
    if (count > 0 && renderMode !== 'surface') {
      pointsMesh.visible = true;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      let minY = Infinity, maxY = -Infinity;
      points.forEach((p) => {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const ySpan = Math.max(1, maxY - minY);

      for (let i = 0; i < count; i++) {
        const pt = points[i];
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y + 0.4; // offset above platter
        positions[i * 3 + 2] = pt.z;

        // Color computation based on mode
        let c = new THREE.Color();
        if (colorMap === 'height') {
          const t = (pt.y - minY) / ySpan;
          c.setHSL(0.6 - t * 0.5, 0.95, 0.55); // Cyan to amber gradient
        } else if (colorMap === 'distance') {
          const t = Math.min(1, Math.max(0, pt.distance / settings.turntableRadius));
          c.setHSL(t * 0.35, 1.0, 0.5); // Red near, green far
        } else if (colorMap === 'angle') {
          c.setHSL(pt.angle / 360, 0.9, 0.55);
        } else if (colorMap === 'cyber') {
          c.set(0xf59e0b); // Cyber amber
        } else {
          c.set(0xf1f5f9); // Monochrome white
        }

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      pointsMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      pointsMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      pointsMesh.geometry.attributes.position.needsUpdate = true;
      pointsMesh.geometry.attributes.color.needsUpdate = true;
      (pointsMesh.material as THREE.PointsMaterial).size = pointSize;
    } else {
      pointsMesh.visible = false;
    }

    // 2. Update Surface Mesh
    if (
      (renderMode === 'surface' ||
        renderMode === 'wireframe' ||
        renderMode === 'points_and_mesh') &&
      count >= 6
    ) {
      surfaceMesh.visible = true;
      const meshData = reconstructMeshFromPoints(points, {
        scale: 1.0, // viewport native cm
        closeBottom: true,
        closeTop: true,
      });

      if (meshData.faces.length > 0) {
        const vertices = meshData.vertices;
        const faces = meshData.faces;

        const positions = new Float32Array(faces.length * 3 * 3);
        let ptr = 0;

        for (let i = 0; i < faces.length; i++) {
          const f = faces[i];
          const vA = vertices[f.a];
          const vB = vertices[f.b];
          const vC = vertices[f.c];

          if (!vA || !vB || !vC) continue;

          positions[ptr++] = vA[0];
          positions[ptr++] = vA[1] + 0.4;
          positions[ptr++] = vA[2];

          positions[ptr++] = vB[0];
          positions[ptr++] = vB[1] + 0.4;
          positions[ptr++] = vB[2];

          positions[ptr++] = vC[0];
          positions[ptr++] = vC[1] + 0.4;
          positions[ptr++] = vC[2];
        }

        surfaceMesh.geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(positions.subarray(0, ptr), 3)
        );
        surfaceMesh.geometry.computeVertexNormals();
        surfaceMesh.geometry.attributes.position.needsUpdate = true;

        // Visual finish
        const mat = surfaceMesh.material as THREE.MeshStandardMaterial;
        mat.wireframe = renderMode === 'wireframe';
        mat.color = new THREE.Color(colorMap === 'cyber' ? 0xf59e0b : 0xe2e8f0);
      }
    } else {
      surfaceMesh.visible = false;
    }
  }, [points, renderMode, colorMap, pointSize, settings.turntableRadius]);

  // Visibility toggles
  useEffect(() => {
    if (!threeRef.current) return;
    const { gridHelper, beamLine, beamCone, turntableGroup } = threeRef.current;
    gridHelper.visible = showGrid;
    beamLine.visible = showSensorBeam;
    beamCone.visible = showSensorBeam;
    turntableGroup.visible = showTurntable;
  }, [showGrid, showSensorBeam, showTurntable]);

  // Camera presets
  const handleSetCameraView = (view: 'iso' | 'top' | 'front') => {
    if (!threeRef.current) return;
    const { spherical, camera, target } = threeRef.current;

    if (view === 'iso') {
      spherical.theta = Math.PI / 4;
      spherical.phi = Math.PI / 3;
      spherical.radius = 36;
    } else if (view === 'top') {
      spherical.theta = 0;
      spherical.phi = 0.05;
      spherical.radius = 34;
    } else if (view === 'front') {
      spherical.theta = 0;
      spherical.phi = Math.PI / 2 - 0.05;
      spherical.radius = 32;
    }

    camera.position.x =
      target.x +
      spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    camera.position.y =
      target.y + spherical.radius * Math.cos(spherical.phi);
    camera.position.z =
      target.z +
      spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    camera.lookAt(target);
  };

  const handleResetCamera = () => {
    handleSetCameraView('iso');
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full relative">
      {/* Viewport Toolbar */}
      <ViewportToolbar
        renderMode={renderMode}
        colorMap={colorMap}
        showGrid={showGrid}
        showSensorBeam={showSensorBeam}
        showTurntable={showTurntable}
        pointSize={pointSize}
        onRenderModeChange={setRenderMode}
        onColorMapChange={setColorMap}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onToggleSensorBeam={() => setShowSensorBeam(!showSensorBeam)}
        onToggleTurntable={() => setShowTurntable(!showTurntable)}
        onPointSizeChange={setPointSize}
        onResetCamera={handleResetCamera}
        onSetCameraView={handleSetCameraView}
        onClearPoints={onClearPoints}
        pointCount={points.length}
      />

      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        className="w-full flex-1 min-h-[460px] md:min-h-[520px] bg-neutral-950 rounded-2xl border border-neutral-800/80 overflow-hidden relative select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating HUD info */}
        <div className="absolute bottom-3 left-3 pointer-events-none flex flex-col gap-1 text-[11px] font-mono text-neutral-400 bg-neutral-950/70 backdrop-blur-xs p-2 rounded-lg border border-neutral-800/60">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Plataforma:</span>
            <span className="text-amber-400 font-bold">{turntableAngle.toFixed(1)}°</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Eco Sensor:</span>
            <span className="text-cyan-400 font-bold">
              {currentDistance > 0 ? `${currentDistance.toFixed(2)} cm` : 'Inactivo'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Puntos Nube:</span>
            <span className="text-neutral-200">{points.length}</span>
          </div>
        </div>

        {/* Viewport interaction guide badge */}
        <div className="absolute top-3 right-3 pointer-events-none text-[10px] text-neutral-400 bg-neutral-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-neutral-800/60">
          Clic izq: Rotar 3D · Clic der: Desplazar · Rueda: Zoom
        </div>

        {/* Empty state hint */}
        {points.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-amber-400 mb-3">
              <span className="text-xl font-bold font-mono">3D</span>
            </div>
            <h4 className="text-sm font-semibold text-neutral-300">
              Área de Visualización 3D Lista
            </h4>
            <p className="text-xs text-neutral-400 max-w-sm mt-1">
              Gira el servomotor manualmente con los botones de la izquierda o presiona &ldquo;Iniciar Escaneo 3D&rdquo; para capturar la nube de puntos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
