import React, { useState } from 'react';
import { useWorldDiscoverer } from '../../hooks/useWorldDiscoverer';
import { GameHeaderOrganism } from '../organisms/GameHeaderOrganism';
import { SerialConnectionBar } from '../molecules/SerialConnectionBar';
import { SerialDiagnosticAlert } from '../molecules/SerialDiagnosticAlert';
import { ExplorationHUD } from '../molecules/ExplorationHUD';
import { SweepProgressTimer } from '../atoms/SweepProgressTimer';
import { RoverRadarControls } from '../molecules/RoverRadarControls';
import { WorldMapOrganism } from '../organisms/WorldMapOrganism';
import { ScoutConsoleOrganism } from '../organisms/ScoutConsoleOrganism';
import { MapExportModal } from '../molecules/MapExportModal';
import { FirmwareEsp32Modal } from '../molecules/FirmwareEsp32Modal';
import { ESP32AlgorithmWorkbench } from '../molecules/ESP32AlgorithmWorkbench';
import { BotNavigationCard } from '../molecules/BotNavigationCard';

export const WorldDiscovererTemplate: React.FC = () => {
  const {
    connectionMode,
    setConnectionMode,
    isConnected,
    isConnecting,
    portName,
    baudRate,
    setBaudRate,
    serialError,
    dismissSerialError,
    switchToSimulator,
    preset,
    setPreset,
    visualTheme,
    setVisualTheme,
    isMuted,
    toggleMute,
    botPose,
    trajectory,
    waypoints,
    isAutonomous,
    toggleAutonomous,
    driveForward,
    driveBackward,
    turnLeft,
    turnRight,
    stopBot,
    handleAddWaypoint,
    handleResetRoute,
    handleClearWorldMap,
    handleClearAll,
    roverState,
    setRoverState,
    points,
    logs,
    clearLogs,
    explorationStats,
    handleConnectSerial,
    handleDisconnectSerial,
    handleTurnLeft,
    handleTurnRight,
    handleGotoAngle,
    handleToggleScan,
    sendSerialCommand,
    motorPwm,
    setMotorPwm,
    // Voronoi Partitioning, Lloyd Relaxation & Archimedean Spiral (RS232)
    voronoiResult,
    spiralConfig,
    recognizedObstacles,
    rs232Logs,
    handleRunVoronoiAndSpiral,
    handleUpdateSpiralConfig,
    handleResetSpiralDefaults,
    dynamicObstacles,
    interactionMode,
    setInteractionMode,
    navStats,
    hardwarePins,
    handleSetAlgorithm,
    handleStartNavigation,
    handlePauseNavigation,
    handleResetToPointA,
    handleAddDynamicObstacle,
    handleRemoveDynamicObstacle,
    handleClearDynamicObstacles,
    handleSpawnObstaclesPreset,
    handleMapClickCoord,
    // AI Route Optimizer
    aiOptimizationResult,
    showCandidateIterations,
  } = useWorldDiscoverer();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Header (Top Bar Contract) */}
      <GameHeaderOrganism
        isScanning={roverState.isScanning}
        pointsCount={points.length}
        onToggleScan={handleToggleScan}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenFirmware={() => setIsFirmwareModalOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
        {/* Connection Bar (Simulator vs ESP32 Web Serial) */}
        <SerialConnectionBar
          connectionMode={connectionMode}
          isConnected={isConnected}
          isConnecting={isConnecting}
          portName={portName}
          baudRate={baudRate}
          preset={preset}
          onModeChange={setConnectionMode}
          onBaudRateChange={setBaudRate}
          onPresetChange={setPreset}
          onConnect={handleConnectSerial}
          onDisconnect={handleDisconnectSerial}
          onOpenFirmware={() => setIsFirmwareModalOpen(true)}
        />

        {/* Diagnostic Port Alert (if COM port error) */}
        {serialError && (
          <SerialDiagnosticAlert
            error={serialError}
            onRetry={handleConnectSerial}
            onSwitchToSimulator={switchToSimulator}
            onDismiss={dismissSerialError}
            onOpenFirmware={() => setIsFirmwareModalOpen(true)}
          />
        )}

        {/* Exploration & Bot Route HUD (Trajectory meters, fog cleared, obstacles, and exact cm distance) */}
        <ExplorationHUD
          stats={explorationStats}
          currentDistanceCm={roverState.currentDistanceCm}
          isObstacleDetected={roverState.isObstacleDetected}
          obstacleThresholdCm={roverState.obstacleThresholdCm}
          scanMode={roverState.scanMode}
          theme={visualTheme}
          onThemeChange={setVisualTheme}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />

        {/* ESP32 Algorithm: Voronoi Partitioning, Lloyd's Relaxation & Archimedean Spiral Coverage (RS232) */}
        <ESP32AlgorithmWorkbench
          navStats={navStats}
          dynamicObstacles={dynamicObstacles}
          interactionMode={interactionMode}
          onInteractionModeChange={setInteractionMode}
          onSetAlgorithm={handleSetAlgorithm}
          onStartNavigation={handleStartNavigation}
          onPauseNavigation={handlePauseNavigation}
          onResetToA={handleResetToPointA}
          onAddObstacle={handleAddDynamicObstacle}
          onRemoveObstacle={handleRemoveDynamicObstacle}
          onClearObstacles={handleClearDynamicObstacles}
          onSpawnObstaclesPreset={handleSpawnObstaclesPreset}
          hardwarePins={hardwarePins}
          voronoiResult={voronoiResult}
          spiralConfig={spiralConfig}
          recognizedObstacles={recognizedObstacles}
          rs232Logs={rs232Logs}
          onRunVoronoiAndSpiral={handleRunVoronoiAndSpiral}
          onUpdateSpiralConfig={handleUpdateSpiralConfig}
          onResetSpiralDefaults={handleResetSpiralDefaults}
        />

        {/* Core Exploration Viewport Grid: Controls & 2D Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Bot Navigation & Sweep Controls (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4" id="rover">
            {/* Live 20-Second Sweep Countdown & Angle Gauge */}
            <SweepProgressTimer roverState={roverState} />

            {/* Servomotor & Radar 180° Sweep Controls */}
            <RoverRadarControls
              roverState={roverState}
              onToggleScan={handleToggleScan}
              onTurnLeft={handleTurnLeft}
              onTurnRight={handleTurnRight}
              onGotoAngle={handleGotoAngle}
              onRangeChange={(rangeCm) =>
                setRoverState((prev) => ({ ...prev, maxRangeCm: rangeCm }))
              }
              onClearMap={handleClearWorldMap}
            />

            {/* Bot Drive Controls with Calibrated PWM (175 - 198) */}
            <BotNavigationCard
              botPose={botPose}
              trajectory={trajectory}
              waypoints={waypoints}
              roverState={roverState}
              isAutonomous={isAutonomous}
              onToggleAutonomous={toggleAutonomous}
              onDriveForward={driveForward}
              onDriveBackward={driveBackward}
              onTurnLeft={turnLeft}
              onTurnRight={turnRight}
              onStopBot={stopBot}
              onAddWaypoint={handleAddWaypoint}
              onResetRoute={handleResetRoute}
              motorPwm={motorPwm}
              onSetMotorPwm={setMotorPwm}
            />
          </div>

          {/* Right Column: 2D Cartographic Map with Bot Trajectory (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4 h-full">
            {/* Interactive 2D World Canvas Viewport */}
            <div className="w-full">
              <WorldMapOrganism
                points={points}
                trajectory={trajectory}
                waypoints={waypoints}
                botPose={botPose}
                roverState={roverState}
                preset={preset}
                theme={visualTheme}
                isAutonomous={isAutonomous}
                onToggleAutonomous={toggleAutonomous}
                onDriveForward={() => driveForward(20)}
                onDriveBackward={() => driveBackward(20)}
                onTurnLeft={() => turnLeft(15)}
                onTurnRight={() => turnRight(15)}
                onStopBot={stopBot}
                onAddWaypoint={() => handleAddWaypoint()}
                onClearMap={handleClearWorldMap}
                onResetRoute={handleResetRoute}
                onOpenExport={() => setIsExportModalOpen(true)}
                dynamicObstacles={dynamicObstacles}
                interactionMode={interactionMode}
                onMapClickCoord={handleMapClickCoord}
                aiOptimalPath={aiOptimizationResult?.waypoints}
                candidateIterations={showCandidateIterations ? aiOptimizationResult?.candidateIterations : undefined}
                voronoiResult={voronoiResult}
                spiralConfig={spiralConfig}
                recognizedObstacles={recognizedObstacles}
              />
            </div>

            {/* Hardware Telemetry & Serial Terminal */}
            <div className="w-full">
              <ScoutConsoleOrganism
                logs={logs}
                currentDistanceCm={roverState.currentDistanceCm}
                currentAngle={roverState.currentAngle}
                isConnected={isConnected}
                onSendCommand={sendSerialCommand}
                onClearLogs={clearLogs}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4 mt-8 text-neutral-500 text-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Terra·Scan 2D — Mapeador de Trayectoria y Cartografía del Bot</span>
          <span aria-hidden="true">·</span>
          <span>Barrido Sonar 180° cada 20 segundos</span>
          <span aria-hidden="true">·</span>
          <span>ESP32 & HC-SR04</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFirmwareModalOpen(true)}
            className="hover:text-neutral-300 transition-colors cursor-pointer"
          >
            Diagrama Pines ESP32
          </button>
          <span>·</span>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="hover:text-neutral-300 transition-colors cursor-pointer"
          >
            Exportar Ruta (GeoJSON / SVG / CSV)
          </button>
        </div>
      </footer>

      {/* Modals */}
      <MapExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        points={points}
        trajectory={trajectory}
        waypoints={waypoints}
        botPose={botPose}
        stats={explorationStats}
        maxRangeCm={roverState.maxRangeCm}
      />

      <FirmwareEsp32Modal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
      />
    </div>
  );
};
