import React, { useState } from 'react';
import { useScannerHardware } from '../../hooks/useScannerHardware';
import { HeaderOrganism } from '../organisms/HeaderOrganism';
import { ConnectionBar } from '../molecules/ConnectionBar';
import { PointCloudStats } from '../molecules/PointCloudStats';
import { ServoTurntableControls } from '../molecules/ServoTurntableControls';
import { SensorGauge } from '../molecules/SensorGauge';
import { ScannerSettingsCard } from '../molecules/ScannerSettingsCard';
import { Viewport3DOrganism } from '../organisms/Viewport3DOrganism';
import { SerialConsoleOrganism } from '../organisms/SerialConsoleOrganism';
import { ExportModal } from '../molecules/ExportModal';
import { FirmwareModal } from '../molecules/FirmwareModal';
import { SerialErrorAlert } from '../molecules/SerialErrorAlert';

export const ScannerWorkspaceTemplate: React.FC = () => {
  const {
    connectionMode,
    setConnectionMode,
    isConnected,
    isConnecting,
    portName,
    baudRate,
    setBaudRate,
    simulatedModel,
    setSimulatedModel,
    serialError,
    dismissSerialError,
    switchToSimulator,
    scanStatus,
    turntable,
    sensorData,
    points,
    settings,
    setSettings,
    serialLogs,
    handleConnect,
    handleDisconnect,
    handleTurnLeft,
    handleTurnRight,
    handleGotoAngle,
    handleHome,
    handleStepChange,
    handlePingSensor,
    handleClearPoints,
    startAutomatedScan,
    stopAutomatedScan,
    sendSerialCommand,
    clearSerialLogs,
  } = useScannerHardware();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* 1. Header (Top Bar Contract) */}
      <HeaderOrganism
        scanStatus={scanStatus}
        pointsCount={points.length}
        onStartScan={startAutomatedScan}
        onStopScan={stopAutomatedScan}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenFirmware={() => setIsFirmwareModalOpen(true)}
      />

      {/* Main Container (Desktop baseline 1440px) */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
        {/* Connection Bar */}
        <ConnectionBar
          connectionMode={connectionMode}
          isConnected={isConnected}
          isConnecting={isConnecting}
          portName={portName}
          baudRate={baudRate}
          simulatedModel={simulatedModel}
          onModeChange={setConnectionMode}
          onBaudRateChange={setBaudRate}
          onSimulatedModelChange={setSimulatedModel}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onOpenFirmware={() => setIsFirmwareModalOpen(true)}
        />

        {/* Serial Connection Diagnostic Alert */}
        {serialError && (
          <SerialErrorAlert
            error={serialError}
            onRetry={handleConnect}
            onSwitchToSimulator={switchToSimulator}
            onDismiss={dismissSerialError}
            onOpenFirmware={() => setIsFirmwareModalOpen(true)}
          />
        )}

        {/* Scan Telemetry Stats */}
        <PointCloudStats
          points={points}
          scanStatus={scanStatus}
          currentAngle={turntable.currentAngle}
          sweepAngle={settings.fullSweepAngle}
          currentDistance={sensorData.distanceCm}
        />

        {/* Core Workspace Grid: Controls & 3D Viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Hardware & Motor Controls) - 4 cols */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Turntable Servo Motor Controls */}
            <ServoTurntableControls
              turntable={turntable}
              onTurnLeft={handleTurnLeft}
              onTurnRight={handleTurnRight}
              onGotoAngle={handleGotoAngle}
              onHome={handleHome}
              onStepChange={handleStepChange}
              disabled={!isConnected}
            />

            {/* Ultrasonic HC-SR04 Sensor Gauge */}
            <SensorGauge
              sensorData={sensorData}
              settings={settings}
              onPingSensor={handlePingSensor}
              disabled={!isConnected}
            />

            {/* Calibration & Scanner Settings */}
            <div id="calibracion">
              <ScannerSettingsCard
                settings={settings}
                onSettingsChange={setSettings}
                disabled={scanStatus === 'scanning'}
              />
            </div>
          </div>

          {/* Right Column (3D Viewport & Serial Console) - 8 cols */}
          <div className="lg:col-span-8 flex flex-col gap-4 h-full">
            {/* 3D WebGL Viewport */}
            <div className="h-[520px] md:h-[580px] w-full flex flex-col">
              <Viewport3DOrganism
                points={points}
                turntableAngle={turntable.currentAngle}
                currentDistance={sensorData.distanceCm}
                settings={settings}
                onClearPoints={handleClearPoints}
              />
            </div>

            {/* Serial Monitor & Command Terminal */}
            <div id="consola">
              <SerialConsoleOrganism
                logs={serialLogs}
                onSendCommand={sendSerialCommand}
                onClearLogs={clearSerialLogs}
                isConnected={isConnected}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4 mt-8 text-neutral-500 text-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span>ScanESP32 3D Studio</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Arquitectura Molecular (Atomic Design)</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>Sensor HC-SR04 & Servomotor PWM</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFirmwareModalOpen(true)}
            className="hover:text-neutral-300 transition-colors"
          >
            Pines ESP32
          </button>
          <span>·</span>
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="hover:text-neutral-300 transition-colors"
          >
            Exportar STL / OBJ
          </button>
        </div>
      </footer>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        points={points}
        onClose={() => setIsExportModalOpen(false)}
      />

      <FirmwareModal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
      />
    </div>
  );
};
