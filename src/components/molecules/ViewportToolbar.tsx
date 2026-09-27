import React from 'react';
import {
  Eye,
  Grid,
  Layers,
  Palette,
  Maximize2,
  Trash2,
  Camera,
  Disc,
  Radio,
} from 'lucide-react';
import { IconButton } from '../atoms/IconButton';
import { VisualRenderMode, ColorMapMode } from '../../types/scanner';

export interface ViewportToolbarProps {
  renderMode: VisualRenderMode;
  colorMap: ColorMapMode;
  showGrid: boolean;
  showSensorBeam: boolean;
  showTurntable: boolean;
  pointSize: number;
  onRenderModeChange: (mode: VisualRenderMode) => void;
  onColorMapChange: (map: ColorMapMode) => void;
  onToggleGrid: () => void;
  onToggleSensorBeam: () => void;
  onToggleTurntable: () => void;
  onPointSizeChange: (size: number) => void;
  onResetCamera: () => void;
  onSetCameraView: (view: 'iso' | 'top' | 'front') => void;
  onClearPoints: () => void;
  pointCount: number;
}

export const ViewportToolbar: React.FC<ViewportToolbarProps> = ({
  renderMode,
  colorMap,
  showGrid,
  showSensorBeam,
  showTurntable,
  pointSize,
  onRenderModeChange,
  onColorMapChange,
  onToggleGrid,
  onToggleSensorBeam,
  onToggleTurntable,
  onPointSizeChange,
  onResetCamera,
  onSetCameraView,
  onClearPoints,
  pointCount,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl text-xs">
      {/* Left: Render mode & Color map */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
          <button
            type="button"
            onClick={() => onRenderModeChange('points')}
            className={`px-2 py-1 rounded transition-colors font-medium cursor-pointer ${
              renderMode === 'points'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Puntos
          </button>
          <button
            type="button"
            onClick={() => onRenderModeChange('surface')}
            className={`px-2 py-1 rounded transition-colors font-medium cursor-pointer ${
              renderMode === 'surface'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Malla Sólida
          </button>
          <button
            type="button"
            onClick={() => onRenderModeChange('wireframe')}
            className={`px-2 py-1 rounded transition-colors font-medium cursor-pointer ${
              renderMode === 'wireframe'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Estructura
          </button>
          <button
            type="button"
            onClick={() => onRenderModeChange('points_and_mesh')}
            className={`px-2 py-1 rounded transition-colors font-medium cursor-pointer ${
              renderMode === 'points_and_mesh'
                ? 'bg-neutral-800 text-amber-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Ambos
          </button>
        </div>

        {/* Colormap selector */}
        <div className="flex items-center gap-1.5 pl-1">
          <Palette className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={colorMap}
            onChange={(e) => onColorMapChange(e.target.value as ColorMapMode)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80 cursor-pointer"
          >
            <option value="height">Color por Altura (Z)</option>
            <option value="distance">Color por Distancia</option>
            <option value="angle">Color por Ángulo (360°)</option>
            <option value="cyber">Cíber Ámbar Neón</option>
            <option value="monochrome">Monocromático Blanco</option>
          </select>
        </div>

        {/* Point Size slider */}
        {renderMode !== 'surface' && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800">
            <span className="text-[11px] text-neutral-400">Tamaño:</span>
            <input
              type="range"
              min={1}
              max={8}
              value={pointSize}
              onChange={(e) => onPointSizeChange(Number(e.target.value))}
              className="w-16 h-1 bg-neutral-800 accent-amber-500 rounded cursor-pointer"
            />
            <span className="font-mono text-[10px] text-neutral-400 w-3">{pointSize}</span>
          </div>
        )}
      </div>

      {/* Right: Camera views & Toggles */}
      <div className="flex items-center gap-1.5">
        <IconButton
          icon={<Grid className="w-3.5 h-3.5" />}
          label="Alternar Rejilla"
          variant={showGrid ? 'active' : 'default'}
          size="sm"
          onClick={onToggleGrid}
        />

        <IconButton
          icon={<Disc className="w-3.5 h-3.5" />}
          label="Plataforma Giratoria 3D"
          variant={showTurntable ? 'active' : 'default'}
          size="sm"
          onClick={onToggleTurntable}
        />

        <IconButton
          icon={<Radio className="w-3.5 h-3.5" />}
          label="Haz de Eco Ultrasónico"
          variant={showSensorBeam ? 'active' : 'default'}
          size="sm"
          onClick={onToggleSensorBeam}
        />

        {/* View presets */}
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 ml-1">
          <button
            type="button"
            onClick={() => onSetCameraView('iso')}
            className="px-1.5 py-0.5 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
            title="Vista Isométrica 3D"
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => onSetCameraView('top')}
            className="px-1.5 py-0.5 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
            title="Vista Superior Planta"
          >
            Planta
          </button>
          <button
            type="button"
            onClick={() => onSetCameraView('front')}
            className="px-1.5 py-0.5 text-[11px] text-neutral-400 hover:text-neutral-200 cursor-pointer"
            title="Vista Frontal Alzado"
          >
            Frente
          </button>
        </div>

        <IconButton
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          label="Centrar Cámara"
          size="sm"
          onClick={onResetCamera}
        />

        {pointCount > 0 && (
          <IconButton
            icon={<Trash2 className="w-3.5 h-3.5" />}
            label="Limpiar Nube de Puntos"
            variant="danger"
            size="sm"
            onClick={onClearPoints}
          />
        )}
      </div>
    </div>
  );
};
