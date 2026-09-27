import React from 'react';
import { Sliders, RotateCw, Layers } from 'lucide-react';
import { Slider } from '../atoms/Slider';
import { ScannerSettings } from '../../types/scanner';

export interface ScannerSettingsCardProps {
  settings: ScannerSettings;
  onSettingsChange: (settings: ScannerSettings) => void;
  disabled?: boolean;
}

export const ScannerSettingsCard: React.FC<ScannerSettingsCardProps> = ({
  settings,
  onSettingsChange,
  disabled = false,
}) => {
  const updateSetting = <K extends keyof ScannerSettings>(
    key: K,
    value: ScannerSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="flex flex-col gap-3.5 bg-neutral-900/80 border border-neutral-800 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Sliders className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-neutral-200">
          Calibración del Escáner
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sensor distance calibration */}
        <Slider
          label="Distancia Sensor al Eje (R₀)"
          min={8}
          max={30}
          step={0.5}
          unit=" cm"
          value={settings.turntableRadius}
          onChange={(val) => updateSetting('turntableRadius', val)}
          disabled={disabled}
        />

        {/* Angular resolution */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-neutral-400">Resolución Angular</span>
            <span className="font-mono text-neutral-200 tabular-nums">
              {settings.angularResolution}° por paso
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {[1, 2, 3, 5].map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => updateSetting('angularResolution', res)}
                disabled={disabled}
                className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer ${
                  settings.angularResolution === res
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {res}°
              </button>
            ))}
          </div>
        </div>

        {/* Full sweep range */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-neutral-400">Rango de Barrido</span>
            <span className="font-mono text-neutral-200 tabular-nums">
              {settings.fullSweepAngle}°
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => updateSetting('fullSweepAngle', 180)}
              disabled={disabled}
              className={`py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                settings.fullSweepAngle === 180
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              180° (Servo SG90)
            </button>
            <button
              type="button"
              onClick={() => updateSetting('fullSweepAngle', 360)}
              disabled={disabled}
              className={`py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                settings.fullSweepAngle === 360
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              360° (Continuo)
            </button>
          </div>
        </div>

        {/* Vertical layers */}
        <Slider
          label="Capas Verticales (Eje Z)"
          min={1}
          max={10}
          step={1}
          unit=" capas"
          value={settings.verticalLayers}
          onChange={(val) => updateSetting('verticalLayers', val)}
          disabled={disabled}
        />
      </div>

      {/* Outlier filter toggle */}
      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-300">
        <span>Filtro de Ruido Ultrasónico (Descartar ecos espurios)</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.filterOutliers}
            onChange={(e) => updateSetting('filterOutliers', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>
    </div>
  );
};
