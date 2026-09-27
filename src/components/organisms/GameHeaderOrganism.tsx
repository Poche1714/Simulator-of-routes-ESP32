import React from 'react';
import { Play, Pause, Download, FileCode } from 'lucide-react';

interface GameHeaderOrganismProps {
  isScanning: boolean;
  pointsCount: number;
  onToggleScan: () => void;
  onOpenExport: () => void;
  onOpenFirmware: () => void;
}

export const GameHeaderOrganism: React.FC<GameHeaderOrganismProps> = ({
  isScanning,
  pointsCount,
  onToggleScan,
  onOpenExport,
  onOpenFirmware,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a href="/" className="text-lg font-bold tracking-tight text-neutral-100 hover:text-white transition-colors flex items-center gap-2">
          <span>Terra·Scan</span>
          <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500 text-neutral-950 rounded shadow-sm">
            v2.0.0
          </span>
        </a>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
          <span>Emulador de Código ESP32</span>
          <span aria-hidden="true">·</span>
          <span>Navegación A➔B & Esquive de Obstáculos</span>
        </div>
      </div>

      {/* Zone 2: 4 Clean Nav Links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-400">
        <a href="#mapa" className="hover:text-neutral-100 transition-colors">
          Simulador 3D & Trayecto
        </a>
        <a href="#rover" className="hover:text-neutral-100 transition-colors">
          Conducción & Barrido 180°
        </a>
        <button
          onClick={onOpenFirmware}
          className="hover:text-neutral-100 transition-colors cursor-pointer"
        >
          Firmware ESP32
        </button>
        <button
          onClick={onOpenExport}
          className="hover:text-neutral-100 transition-colors cursor-pointer"
        >
          Exportar Mapa ({pointsCount})
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenExport}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-neutral-400" />
          <span>Exportar</span>
        </button>

        <button
          onClick={onOpenFirmware}
          className="sm:hidden p-1.5 text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg"
          title="Ver Firmware"
        >
          <FileCode className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleScan}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
            isScanning
              ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20'
              : 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400 shadow-sm shadow-emerald-500/20'
          }`}
        >
          {isScanning ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>Pausar Sondeo</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar Exploración</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
