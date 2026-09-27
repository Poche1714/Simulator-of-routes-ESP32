import React, { useState } from 'react';
import { X, Copy, Check, Cpu, Terminal, BookOpen, Sliders, AlertTriangle } from 'lucide-react';
import { Button } from '../atoms/Button';
import { generateEsp32Firmware, DEFAULT_FIRMWARE_CONFIG, FirmwareConfig } from '../../utils/esp32Firmware';

export interface FirmwareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirmwareModal: React.FC<FirmwareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<FirmwareConfig>(DEFAULT_FIRMWARE_CONFIG);
  const [activeTab, setActiveTab] = useState<'code' | 'wiring' | 'guide'>('code');

  if (!isOpen) return null;

  const code = generateEsp32Firmware(config);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-neutral-100">
                Firmware ESP32 (Arduino IDE / PlatformIO)
              </h2>
              <p className="text-xs text-neutral-400">
                Control de sensor ultrasónico HC-SR04 y servomotor por Serial
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

        {/* Tab navigation */}
        <div className="flex items-center gap-4 px-6 border-b border-neutral-800 bg-neutral-950/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('code')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Código C++ (.ino)
          </button>
          <button
            onClick={() => setActiveTab('wiring')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'wiring'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Diagrama de Conexiones (Pines)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Instrucciones de Carga
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'code' && (
            <div className="flex flex-col gap-3">
              {/* Important notice about serial port lock */}
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">
                    Evita el error &quot;Failed to open serial port&quot;:
                  </span>{' '}
                  Una vez que subas el sketch al ESP32, <strong>CIERRA el Monitor Serie en Arduino IDE</strong>. Si el Monitor Serie de Arduino permanece abierto, toma posesión exclusiva del puerto COM y el navegador no podrá conectarse.
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Librería requerida: <code>ESP32Servo</code> (disponible en el Gestor de Bibliotecas de Arduino)</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopy}
                  leftIcon={copied ? <Check className="w-3.5 h-3.5 text-neutral-950" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? '¡Copiado al Portapapeles!' : 'Copiar Código'}
                </Button>
              </div>

              <div className="relative bg-neutral-950 rounded-xl border border-neutral-800 p-4 overflow-x-auto max-h-[50vh]">
                <pre className="text-xs font-mono text-neutral-300 leading-relaxed">
                  <code>{code}</code>
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'wiring' && (
            <div className="flex flex-col gap-4 text-xs text-neutral-300">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <h4 className="font-semibold text-neutral-200 mb-2 text-sm">
                  1. Sensor Ultrasónico HC-SR04 a ESP32
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">PIN VCC</span>
                    <span className="text-amber-400 font-bold">5V / VIN</span>
                  </div>
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">PIN GND</span>
                    <span className="text-neutral-300 font-bold">GND</span>
                  </div>
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">PIN TRIG</span>
                    <span className="text-cyan-400 font-bold">GPIO 5</span>
                  </div>
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">PIN ECHO</span>
                    <span className="text-cyan-400 font-bold">GPIO 18</span>
                  </div>
                </div>
                <p className="mt-2 text-neutral-400 text-[11px]">
                  * Nota de seguridad: El pin ECHO entrega 5V. Aunque muchos ESP32 son tolerantes a 5V en entradas digitales breves, se recomienda conectar un divisor resistivo simple (1kΩ en serie y 2kΩ a tierra) para obtener 3.3V.
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <h4 className="font-semibold text-neutral-200 mb-2 text-sm">
                  2. Servomotor de Plataforma (SG90 / MG996R)
                </h4>
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">Cable Rojo (VCC)</span>
                    <span className="text-amber-400 font-bold">5V (Fuente externa)</span>
                  </div>
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">Cable Marrón/Negro (GND)</span>
                    <span className="text-neutral-300 font-bold">GND (Común con ESP32)</span>
                  </div>
                  <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
                    <span className="text-neutral-500 block text-[10px]">Cable Amarillo/Naranja (PWM)</span>
                    <span className="text-amber-400 font-bold">GPIO 19</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="flex flex-col gap-3 text-xs text-neutral-300 leading-relaxed">
              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col gap-2">
                <h4 className="font-semibold text-neutral-100 text-sm">
                  Paso 1: Instalar ESP32 en Arduino IDE
                </h4>
                <p className="text-neutral-400">
                  En Arduino IDE, ve a <em>Preferencias</em> y añade el URL del gestor de tarjetas ESP32: <code>https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json</code>. Luego instala <em>esp32</em> desde el Gestor de Placas.
                </p>
              </div>

              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col gap-2">
                <h4 className="font-semibold text-neutral-100 text-sm">
                  Paso 2: Instalar la librería ESP32Servo
                </h4>
                <p className="text-neutral-400">
                  Abre <em>Herramientas → Administrador de bibliotecas...</em>, busca <strong>ESP32Servo</strong> de Kevin Harrington y haz clic en Instalar.
                </p>
              </div>

              <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col gap-2">
                <h4 className="font-semibold text-neutral-100 text-sm">
                  Paso 3: Subir código y conectar
                </h4>
                <p className="text-neutral-400">
                  Pega el código, selecciona tu puerto COM (p. ej. COM3 o /dev/ttyUSB0) a 115200 baudios y presiona Subir. Una vez subido, cierra el monitor serie de Arduino y en esta web presiona <strong>"Conectar ESP32"</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-neutral-950 border-t border-neutral-800">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
