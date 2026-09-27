import React from 'react';
import {
  DiscoveredPoint2D,
  TrajectoryPoint,
  Waypoint,
  BotPose,
  ExplorationStats,
} from '../../types/worldDiscoverer';
import {
  exportRouteAndMapAsJSON,
  exportRouteAsGeoJSON,
  exportRouteAsCSV,
  exportMapAndRouteAsSVG,
} from '../../utils/export2DMap';
import { X, Download, FileJson, Image, Compass, Footprints, FileSpreadsheet, MapPin } from 'lucide-react';

interface MapExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: DiscoveredPoint2D[];
  trajectory: TrajectoryPoint[];
  waypoints: Waypoint[];
  botPose: BotPose;
  stats: ExplorationStats;
  maxRangeCm: number;
}

export const MapExportModal: React.FC<MapExportModalProps> = ({
  isOpen,
  onClose,
  points,
  trajectory,
  waypoints,
  botPose,
  stats,
  maxRangeCm,
}) => {
  if (!isOpen) return null;

  const handleDownloadJSON = () => {
    exportRouteAndMapAsJSON(trajectory, points, waypoints, stats, botPose, stats.currentSectorName);
  };

  const handleDownloadGeoJSON = () => {
    exportRouteAsGeoJSON(trajectory, waypoints, points, stats.currentSectorName);
  };

  const handleDownloadCSV = () => {
    exportRouteAsCSV(trajectory, stats.currentSectorName);
  };

  const handleDownloadSVG = () => {
    exportMapAndRouteAsSVG(trajectory, waypoints, points, botPose, stats.currentSectorName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-neutral-100">
              Exportar Ruta del Bot y Mapa 2D
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Route & Map Summary */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs text-neutral-300 flex flex-col gap-2 font-mono">
          <div className="flex justify-between">
            <span className="text-neutral-500">Sector:</span>
            <span className="text-neutral-100 font-semibold">{stats.currentSectorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Distancia Recorrida por el Bot:</span>
            <span className="text-emerald-400 font-semibold">
              {stats.totalDistanceTraveledM.toFixed(2)} metros ({trajectory.length} puntos)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Hitos / Waypoints fijados:</span>
            <span className="text-cyan-400 font-semibold">{waypoints.length} hitos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Obstáculos en Coordenadas Globales:</span>
            <span className="text-amber-400">{points.length} puntos mapeados</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Posición Final del Bot:</span>
            <span className="text-neutral-200">
              ({(botPose.x / 100).toFixed(2)}m, {(botPose.y / 100).toFixed(2)}m) @ {Math.round(botPose.heading)}°
            </span>
          </div>
        </div>

        {/* Export Formats */}
        <div className="flex flex-col gap-2.5">
          {/* GeoJSON */}
          <button
            onClick={handleDownloadGeoJSON}
            disabled={trajectory.length === 0}
            className="flex items-center justify-between p-3 rounded-xl border border-neutral-700/80 bg-neutral-800/60 hover:bg-neutral-800 hover:border-emerald-500/50 transition-all text-left cursor-pointer group disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-100">
                  Formato GeoJSON Estándar (.geojson)
                </div>
                <div className="text-[11px] text-neutral-400">
                  LineString con la ruta completa del bot y puntos de obstáculos para GIS / QGIS.
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-neutral-400 group-hover:text-emerald-400" />
          </button>

          {/* SVG Vector */}
          <button
            onClick={handleDownloadSVG}
            disabled={trajectory.length === 0 && points.length === 0}
            className="flex items-center justify-between p-3 rounded-xl border border-neutral-700/80 bg-neutral-800/60 hover:bg-neutral-800 hover:border-emerald-500/50 transition-all text-left cursor-pointer group disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-100">
                  Gráfico Vectorial SVG del Mapa y Ruta (.svg)
                </div>
                <div className="text-[11px] text-neutral-400">
                  Renderiza el camino recorrido, base, hitos y muros mapeados en alta resolución.
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-neutral-400 group-hover:text-cyan-400" />
          </button>

          {/* Complete Mission JSON */}
          <button
            onClick={handleDownloadJSON}
            disabled={trajectory.length === 0}
            className="flex items-center justify-between p-3 rounded-xl border border-neutral-700/80 bg-neutral-800/60 hover:bg-neutral-800 hover:border-amber-500/50 transition-all text-left cursor-pointer group disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-100">
                  Archivo JSON de Misión (.json)
                </div>
                <div className="text-[11px] text-neutral-400">
                  Datos completos: odometría, velocidades, timestamps y nube de obstáculos.
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-neutral-400 group-hover:text-amber-400" />
          </button>

          {/* CSV Telemetry */}
          <button
            onClick={handleDownloadCSV}
            disabled={trajectory.length === 0}
            className="flex items-center justify-between p-3 rounded-xl border border-neutral-700/80 bg-neutral-800/60 hover:bg-neutral-800 hover:border-purple-500/50 transition-all text-left cursor-pointer group disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-100">
                  Telemetría de Ruta en Hoja de Cálculo (.csv)
                </div>
                <div className="text-[11px] text-neutral-400">
                  X, Y, rumbo, timestamp y velocidad paso a paso para Excel o análisis de datos.
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-neutral-400 group-hover:text-purple-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
