import React from 'react';
import { Play, Square, Download, Cpu, RefreshCw } from 'lucide-react';
import { Button } from '../atoms/Button';
import { ScanStatus } from '../../types/scanner';

export interface HeaderOrganismProps {
  scanStatus: ScanStatus;
  pointsCount: number;
  onStartScan: () => void;
  onStopScan: () => void;
  onOpenExport: () => void;
  onOpenFirmware: () => void;
}

export const HeaderOrganism: React.FC<HeaderOrganismProps> = ({
  scanStatus,
  pointsCount,
  onStartScan,
  onStopScan,
  onOpenExport,
  onOpenFirmware,
}) => {
  const isScanning = scanStatus === 'scanning';

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-neutral-950 border-b border-neutral-800/80 sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark in display face */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="text-lg font-bold tracking-tight text-neutral-100 hover:text-white transition-colors"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ScanESP32 3D
        </a>
        <span className="text-neutral-600 hidden sm:inline" aria-hidden="true">·</span>
        <span className="text-xs text-neutral-400 hidden sm:inline">
          Escáner Ultrasónico & Servomotor
        </span>
      </div>

      {/* Zone 2: Clean text links / info items */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        <button
          onClick={onOpenFirmware}
          className="hover:text-amber-400 transition-colors cursor-pointer"
        >
          Firmware Arduino
        </button>
        <a
          href="#calibracion"
          className="hover:text-amber-400 transition-colors"
        >
          Calibración
        </a>
        <a
          href="#consola"
          className="hover:text-amber-400 transition-colors"
        >
          Monitor Serial
        </a>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2.5">
        {isScanning ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onStopScan}
            leftIcon={<Square className="w-3.5 h-3.5 fill-current" />}
          >
            Detener Escaneo
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onStartScan}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            Iniciar Escaneo 3D
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenExport}
          disabled={pointsCount === 0}
          leftIcon={<Download className="w-3.5 h-3.5 text-amber-400" />}
        >
          Exportar STL / OBJ
        </Button>
      </div>
    </header>
  );
};
