import React, { useState } from 'react';
import { ESP32_WORLD_DISCOVERER_CODE } from '../../utils/esp32WorldFirmware';
import { X, Copy, Check, AlertTriangle, Cpu, Terminal, Bot } from 'lucide-react';

interface FirmwareEsp32ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirmwareEsp32Modal: React.FC<FirmwareEsp32ModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(ESP32_WORLD_DISCOVERER_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-neutral-100">
                Firmware ESP32 — Sonar Cero Desfase, Sondeo Enfocado & Motores PWM (175 a 198)
              </h2>
              <p className="text-[11px] text-neutral-400">
                Arduino C++ con sincronización eco-servo, sondeo de objeto (+25°/-10°) y PWM hardware
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Critical Port-Lock Warning */}
          <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-neutral-200">
              <span className="font-semibold text-amber-300">
                ¡Evitar el error "Failed to open serial port"!
              </span>
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                Después de cargar este código desde Arduino IDE o PlatformIO, recuerda{' '}
                <strong>CERRAR la ventana del Monitor Serie en Arduino IDE</strong> antes de conectar
                el ESP32 en esta aplicación web. El sistema operativo sólo permite un acceso concurrente al puerto COM.
              </p>
            </div>
          </div>

          {/* Pin Connections Table */}
          <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 flex flex-col gap-2">
            <span className="font-semibold text-neutral-200">Diagrama de Pines ESP32:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">SERVOMOTOR RADAR</span>
                <span className="font-mono text-cyan-400 font-medium">PWM ➔ GPIO 18</span>
                <span className="text-neutral-500 block text-[10px] mt-0.5">Alim: 5V (VIN) + GND</span>
              </div>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">HC-SR04 TRIG</span>
                <span className="font-mono text-emerald-400 font-medium">Disparo ➔ GPIO 5</span>
                <span className="text-neutral-500 block text-[10px] mt-0.5">Pulso 10µs</span>
              </div>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">HC-SR04 ECHO</span>
                <span className="font-mono text-amber-400 font-medium">Eco ➔ GPIO 19</span>
                <span className="text-neutral-500 block text-[10px] mt-0.5">Lectura microsegundos</span>
              </div>
              <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-500 block text-[10px]">MOTORES PWM (175-198)</span>
                <span className="font-mono text-purple-400 font-medium">L: 25,26 | R: 32,33</span>
                <span className="text-neutral-500 block text-[10px] mt-0.5">LEDC Hardware PWM</span>
              </div>
            </div>
          </div>

          {/* Sweep & Motion Specs */}
          <div className="bg-neutral-950/80 rounded-xl border border-neutral-800 p-3.5 flex flex-wrap items-center justify-between gap-2 text-neutral-300">
            <div>
              <span className="font-semibold text-emerald-400">Algoritmo de Sondeo & Control de Tracción:</span>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                • <strong>Sincronización Cero Desfase:</strong> Retardo de estabilización mecánica antes de emitir el pulso TRIG, asociando la distancia al ángulo exacto estacionario.<br />
                • <strong>Punto de Inicio:</strong> 90° (0° relativo / Frente). Sondeo normal de 0 a 15° y de 0 a -15° (75° a 105°).<br />
                • <strong>Detección de Obstáculo (&le; 40 cm):</strong> Límite de seguridad delimitado a <strong>-55° a +55°</strong> (no -90° a 90°).<br />
                • <strong>Sondeo Enfocado del Objeto:</strong> Registra los siguientes <strong>+25° más</strong> y los <strong>-10° menos</strong> del obstáculo detectado, y regresa automáticamente al estado normal.<br />
                • <strong>Control Motores PWM:</strong> Canales LEDC con valores de <strong>175 a 198</strong> para un control de tracción y velocidad preciso.
              </p>
            </div>
            <div className="font-mono text-neutral-400 text-[11px] bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800 self-start">
              115200 Baudios
            </div>
          </div>

          {/* Code Viewer with Copy Button */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-neutral-400" />
                <span>Código C++ Completo:</span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-[260px] leading-relaxed selection:bg-emerald-500/30">
              {ESP32_WORLD_DISCOVERER_CODE}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-4 border-t border-neutral-800 bg-neutral-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
