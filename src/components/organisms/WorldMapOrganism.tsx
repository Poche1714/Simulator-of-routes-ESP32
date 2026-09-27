import React, { useState } from 'react';
import {
  DiscoveredPoint2D,
  TrajectoryPoint,
  Waypoint,
  BotPose,
  GameVisualTheme,
  RoverSweepState,
  MapEnvironmentPreset,
  DynamicObstacle,
  MapInteractionMode,
} from '../../types/worldDiscoverer';
import { WorldCanvas2D } from '../molecules/WorldCanvas2D';
import { WorldSimulator3D } from '../molecules/WorldSimulator3D';
import {
  Download,
  Compass,
  RefreshCw,
  Footprints,
  MapPin,
  Box,
  Map,
  Columns2,
  Sparkles,
} from 'lucide-react';

export type MainViewMode = '3d' | '2d' | 'split';

interface WorldMapOrganismProps {
  points: DiscoveredPoint2D[];
  trajectory: TrajectoryPoint[];
  waypoints: Waypoint[];
  botPose: BotPose;
  roverState: RoverSweepState;
  preset: MapEnvironmentPreset;
  theme: GameVisualTheme;
  isAutonomous: boolean;
  onToggleAutonomous: () => void;
  onDriveForward: () => void;
  onDriveBackward: () => void;
  onTurnLeft: () => void;
  onTurnRight: () => void;
  onStopBot: () => void;
  onAddWaypoint: () => void;
  onClearMap: () => void;
  onResetRoute?: () => void;
  onOpenExport: () => void;
  pointA?: { x: number; y: number };
  pointB?: { x: number; y: number };
  dynamicObstacles?: DynamicObstacle[];
  interactionMode?: MapInteractionMode;
  onMapClickCoord?: (worldX: number, worldY: number) => void;
}

export const WorldMapOrganism: React.FC<WorldMapOrganismProps> = ({
  points,
  trajectory,
  waypoints,
  botPose,
  roverState,
  preset,
  theme,
  isAutonomous,
  onToggleAutonomous,
  onDriveForward,
  onDriveBackward,
  onTurnLeft,
  onTurnRight,
  onStopBot,
  onAddWaypoint,
  onClearMap,
  onResetRoute,
  onOpenExport,
  pointA,
  pointB,
  dynamicObstacles,
  interactionMode,
  onMapClickCoord,
}) => {
  // Default to 3D Gazebo simulation view as requested by user
  const [viewMode, setViewMode] = useState<MainViewMode>('3d');

  return (
    <div id="mapa" className="flex flex-col gap-2.5 h-full">
      {/* Viewport Header Controls */}
      <div className="flex flex-wrap items-center justify-between px-1 gap-2">
        <div className="flex items-center gap-2">
          <Footprints className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-neutral-100">
            {viewMode === '3d'
              ? 'Simulador 3D en Tiempo Real (Entorno Gazebo / ROS)'
              : viewMode === '2d'
              ? 'Mapa Cartográfico 2D (SLAM & Ruta del Bot)'
              : 'Vista Dual Simultánea: Simulación 3D + Cartografía 2D'}
          </h2>
          <span className="text-xs text-amber-400 font-mono hidden xl:inline bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            Trayecto en Vivo & Sonar 180°
          </span>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-amber-500 text-black font-semibold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title="Ver simulación 3D estilo Gazebo del robot y su trayecto"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Simulación 3D</span>
            </button>

            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-amber-500 text-black font-semibold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title="Ver plano cartográfico 2D del recorrido"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Mapa 2D</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-amber-500 text-black font-semibold shadow-md'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title="Ver simultáneamente simulación 3D y mapa cartográfico 2D"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dividida</span>
            </button>
          </div>

          {onResetRoute && (
            <button
              onClick={onResetRoute}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Reiniciar ruta del bot al punto de origen"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reiniciar</span>
            </button>
          )}

          <button
            onClick={onClearMap}
            className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Borrar obstáculos mapeados"
          >
            <span className="hidden sm:inline">Limpiar Obstáculos</span>
            <span className="sm:hidden">Limpiar</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Main Viewport Content based on viewMode */}
      <div className="flex-1 w-full min-h-[520px] md:min-h-[600px]">
        {viewMode === '3d' && (
          <WorldSimulator3D
            botPose={botPose}
            trajectory={trajectory}
            waypoints={waypoints}
            roverState={roverState}
            points={points}
            preset={preset}
            isAutonomous={isAutonomous}
            onToggleAutonomous={onToggleAutonomous}
            onDriveForward={onDriveForward}
            onDriveBackward={onDriveBackward}
            onTurnLeft={onTurnLeft}
            onTurnRight={onTurnRight}
            onStopBot={onStopBot}
            onAddWaypoint={onAddWaypoint}
            onResetRoute={onResetRoute || (() => {})}
          />
        )}

        {viewMode === '2d' && (
          <WorldCanvas2D
            points={points}
            trajectory={trajectory}
            waypoints={waypoints}
            botPose={botPose}
            currentAngle={roverState.currentAngle}
            currentDistanceCm={roverState.currentDistanceCm}
            maxRangeCm={roverState.maxRangeCm}
            theme={theme}
            isScanning={roverState.isScanning}
            onClearMap={onClearMap}
            onResetRoute={onResetRoute}
            pointA={pointA}
            pointB={pointB}
            dynamicObstacles={dynamicObstacles}
            interactionMode={interactionMode}
            onMapClickCoord={onMapClickCoord}
          />
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 h-full">
            <div className="h-[480px] xl:h-full">
              <WorldSimulator3D
                botPose={botPose}
                trajectory={trajectory}
                waypoints={waypoints}
                roverState={roverState}
                points={points}
                preset={preset}
                isAutonomous={isAutonomous}
                onToggleAutonomous={onToggleAutonomous}
                onDriveForward={onDriveForward}
                onDriveBackward={onDriveBackward}
                onTurnLeft={onTurnLeft}
                onTurnRight={onTurnRight}
                onStopBot={onStopBot}
                onAddWaypoint={onAddWaypoint}
                onResetRoute={onResetRoute || (() => {})}
              />
            </div>
            <div className="h-[480px] xl:h-full">
              <WorldCanvas2D
                points={points}
                trajectory={trajectory}
                waypoints={waypoints}
                botPose={botPose}
                currentAngle={roverState.currentAngle}
                currentDistanceCm={roverState.currentDistanceCm}
                maxRangeCm={roverState.maxRangeCm}
                theme={theme}
                isScanning={roverState.isScanning}
                onClearMap={onClearMap}
                onResetRoute={onResetRoute}
                pointA={pointA}
                pointB={pointB}
                dynamicObstacles={dynamicObstacles}
                interactionMode={interactionMode}
                onMapClickCoord={onMapClickCoord}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
