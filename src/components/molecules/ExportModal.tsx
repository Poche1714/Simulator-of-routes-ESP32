import React, { useState } from 'react';
import { Download, X, Box, Layers, FileCode, CheckCircle2, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Point3D, ExportFormat } from '../../types/scanner';
import { trigger3DDownload } from '../../utils/export3D';

export interface ExportModalProps {
  isOpen: boolean;
  points: Point3D[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  points,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('stl_mesh');
  const [filename, setFilename] = useState('escaner_3d_esp32');
  const [scale, setScale] = useState(10.0); // 10x cm -> mm
  const [closeBase, setCloseBase] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    try {
      trigger3DDownload(points, selectedFormat, {
        filename,
        scale,
        closeBase,
      });

      // Confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f59e0b', '#06b6d4', '#10b981'],
      });

      setExportedSuccess(true);
      setTimeout(() => {
        setExportedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formats: {
    id: ExportFormat;
    name: string;
    ext: string;
    desc: string;
    badge?: string;
  }[] = [
    {
      id: 'stl_mesh',
      name: 'STL Malla Sólida 3D',
      ext: '.stl',
      desc: 'Superficie triangular cerrada, lista para imprimir en Cura/Bambu/PrusaSlicer.',
      badge: 'Recomendado',
    },
    {
      id: 'obj_mesh',
      name: 'Wavefront OBJ Malla',
      ext: '.obj',
      desc: 'Malla 3D estándar con caras poligonales y normales para Blender o CAD.',
    },
    {
      id: 'obj_cloud',
      name: 'OBJ Nube de Puntos',
      ext: '.obj',
      desc: 'Vértices crudos individuales (v x y z) sin caras conectadas.',
    },
    {
      id: 'stl_cloud',
      name: 'STL Malla Abierta',
      ext: '.stl',
      desc: 'Estructura triangular sin tapa de base inferior.',
    },
    {
      id: 'ply',
      name: 'Stanford PLY',
      ext: '.ply',
      desc: 'Formato estándar de escáneres 3D compatible con MeshLab y CloudCompare.',
    },
    {
      id: 'xyz',
      name: 'Coordenadas XYZ (CSV)',
      ext: '.csv',
      desc: 'Tabla cruda con X, Y, Z, ángulo de servo y distancia del sensor.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Exportar Modelo 3D
              </h2>
              <p className="text-xs text-neutral-400">
                {points.length} puntos capturados en el escaneo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Format selection */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-neutral-400">
              Formato de Archivo:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFormat(f.id)}
                  className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFormat === f.id
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-xs'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-200">
                        {f.name}
                      </span>
                      <span className="font-mono text-xs text-neutral-500">
                        {f.ext}
                      </span>
                      {f.badge && (
                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30">
                          {f.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">{f.desc}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedFormat === f.id
                        ? 'border-amber-400 bg-amber-400 text-neutral-950'
                        : 'border-neutral-700'
                    }`}
                  >
                    {selectedFormat === f.id && <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Input
              label="Nombre del archivo"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="escaner_3d_esp32"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-400">
                Escala de unidades
              </label>
              <select
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-amber-500/80 cursor-pointer"
              >
                <option value={10.0}>10x (cm a mm, estándar Impresión 3D)</option>
                <option value={1.0}>1x (cm directos)</option>
                <option value={100.0}>100x (cm a m)</option>
              </select>
            </div>
          </div>

          {/* Checkbox for watertight base */}
          {(selectedFormat === 'stl_mesh' || selectedFormat === 'obj_mesh') && (
            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={closeBase}
                onChange={(e) => setCloseBase(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-950 accent-amber-500 w-4 h-4"
              />
              <span>Cerrar base inferior para crear sólido estanco (Watertight manifold)</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-950 border-t border-neutral-800">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleExport}
            isLoading={isExporting}
            disabled={points.length === 0}
            leftIcon={exportedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
          >
            {exportedSuccess ? '¡Descargado!' : `Descargar ${selectedFormat.startsWith('stl') ? 'STL' : selectedFormat.startsWith('obj') ? 'OBJ' : 'Archivo'}`}
          </Button>
        </div>
      </div>
    </div>
  );
};
