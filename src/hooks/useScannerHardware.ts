import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Point3D,
  TurntableState,
  UltrasonicSensorData,
  ScannerSettings,
  ScanStatus,
  ConnectionMode,
  SerialErrorInfo,
} from '../types/scanner';
import { parseSerialLine, convertToCartesian } from '../utils/serialParser';
import {
  SimulatedModel,
  simulateUltrasonicPing,
} from '../utils/simulatedScanner';

export function useScannerHardware() {
  // Connection state
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('simulator');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [portName, setPortName] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [simulatedModel, setSimulatedModel] = useState<SimulatedModel>('vase');
  const [serialError, setSerialError] = useState<SerialErrorInfo | null>(null);

  // Scanner status
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');

  // Turntable State
  const [turntable, setTurntable] = useState<TurntableState>({
    currentAngle: 0,
    targetAngle: 0,
    direction: 'idle',
    stepSize: 2,
    speed: 30,
    isRotating: false,
  });

  // Sensor reading
  const [sensorData, setSensorData] = useState<UltrasonicSensorData>({
    distanceCm: 11.4,
    rawEchoMicros: 664,
    valid: true,
    lastPingTime: Date.now(),
  });

  // 3D Point Cloud array
  const [points, setPoints] = useState<Point3D[]>([]);

  // Settings
  const [settings, setSettings] = useState<ScannerSettings>({
    turntableRadius: 15.0,
    minDistance: 2.0,
    maxDistance: 14.5,
    angularResolution: 2,
    fullSweepAngle: 360,
    verticalLayers: 1,
    currentLayer: 0,
    layerHeightMm: 5.0,
    filterOutliers: true,
    samplesPerAngle: 3,
  });

  // Serial log history
  const [serialLogs, setSerialLogs] = useState<
    { time: string; text: string; direction: 'in' | 'out' | 'sys' }[]
  >([]);

  // Web Serial refs
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const serialWriterRef = useRef<any>(null);
  const keepReadingRef = useRef(false);

  // Scan simulation interval ref
  const scanIntervalRef = useRef<any>(null);

  // Append serial log helper
  const addLog = useCallback(
    (text: string, direction: 'in' | 'out' | 'sys' = 'sys') => {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      setSerialLogs((prev) => [...prev.slice(-150), { time, text, direction }]);
    },
    []
  );

  // Add a 3D point to cloud (deduplicating or adding)
  const addPoint = useCallback((pt: Point3D) => {
    setPoints((prev) => {
      // If we have an existing point within same angle & layer, update it or append
      return [...prev, pt];
    });
  }, []);

  // Web Serial: Send raw command string
  const sendSerialCommand = useCallback(
    async (cmd: string) => {
      addLog(cmd, 'out');

      if (connectionMode === 'serial') {
        if (serialPortRef.current && serialPortRef.current.writable) {
          let writer: any = null;
          try {
            writer = serialPortRef.current.writable.getWriter();
            const encoder = new TextEncoder();
            const data = encoder.encode(cmd + '\n');
            await writer.write(data);
          } catch (err: any) {
            console.error('Serial write error:', err);
            addLog(`Error al enviar comando: ${err.message || err}`, 'sys');
          } finally {
            if (writer) {
              try {
                writer.releaseLock();
              } catch (e) {
                // Ignore lock release error
              }
            }
          }
        } else {
          addLog('Error: Puerto Serial no conectado o sin canal de escritura disponible', 'sys');
        }
      } else if (connectionMode === 'simulator') {
        // Handle in software simulator
        handleSimulatedCommand(cmd);
      }
    },
    [connectionMode, addLog]
  );

  // Disconnect Web Serial helper (cleans up readers and closes port)
  const disconnectSerial = useCallback(async () => {
    keepReadingRef.current = false;

    if (serialReaderRef.current) {
      try {
        await serialReaderRef.current.cancel();
      } catch (e) {
        console.warn('Reader cancel notice:', e);
      }
    }

    // Brief delay to allow reader loop to finish and call releaseLock()
    await new Promise((r) => setTimeout(r, 60));

    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close();
      } catch (e) {
        console.warn('Port close notice:', e);
      }
      serialPortRef.current = null;
    }

    serialReaderRef.current = null;
    setIsConnected(false);
    setPortName('');
    addLog('Puerto Serial desconectado', 'sys');
  }, [addLog]);

  // Connect Web Serial
  const connectSerial = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      setSerialError({
        code: 'UNSUPPORTED',
        title: 'Navegador no compatible con Web Serial API',
        message: 'Tu navegador no soporta la Web Serial API.',
        reasons: [
          'Navegadores como Firefox o Safari no implementan la Web Serial API.',
        ],
        solutions: [
          'Abre esta aplicación en Google Chrome, Microsoft Edge, Brave u Opera.',
          'O utiliza el Simulador 3D para probar todas las funciones sin hardware.',
        ],
      });
      return;
    }

    // Clear previous error
    setSerialError(null);

    // If an existing port was somehow still held, close it first
    if (serialPortRef.current) {
      await disconnectSerial();
    }

    setIsConnecting(true);
    addLog(`Solicitando puerto serial a ${baudRate} baudios...`, 'sys');

    try {
      const port = await (navigator as any).serial.requestPort();

      // Attempt to open the serial port
      try {
        await port.open({ baudRate });
      } catch (openErr: any) {
        const rawMsg = openErr?.message || String(openErr);
        console.error('Port open error:', openErr);

        if (
          rawMsg.toLowerCase().includes('failed to open serial port') ||
          rawMsg.toLowerCase().includes('open')
        ) {
          setSerialError({
            code: 'LOCKED_OR_IN_USE',
            title: 'El puerto serie está bloqueado o en uso por otra aplicación',
            message: `Error al abrir puerto: ${rawMsg}`,
            reasons: [
              'El Monitor Serie o Serial Plotter de Arduino IDE está actualmente abierto (causa más habitual en el 90% de los casos).',
              'Otra aplicación (VS Code / PlatformIO, PuTTY, Cura, Pronterface, terminal serie) tiene el puerto COM asignado exclusivamente.',
              'Otra pestaña o ventana del navegador ya tiene este puerto COM abierto.',
              'El controlador serie USB del ESP32 quedó en estado bloqueado por una desconexión anterior.',
            ],
            solutions: [
              '1. Ve a Arduino IDE y CIERRA la ventana del Monitor Serie (o Serial Plotter) haciendo clic en la "X" de esa subventana.',
              '2. Desconecta el cable USB del ESP32 de tu computadora, espera 3 segundos y vuelve a conectarlo.',
              '3. Pulsa el botón "Reintentar Conexión" a continuación.',
              '4. En Linux: Verifica permisos de usuario con: sudo usermod -a -G dialout $USER (y reinicia sesión).',
            ],
          });
        } else if (rawMsg.toLowerCase().includes('denied') || rawMsg.toLowerCase().includes('permission')) {
          setSerialError({
            code: 'PERMISSION_DENIED',
            title: 'Permiso denegado por el sistema',
            message: rawMsg,
            reasons: [
              'El sistema operativo denegó el acceso al puerto serie.',
              'En sistemas Linux, el usuario actual no está en el grupo dialout.',
            ],
            solutions: [
              'En Linux ejecuta: sudo usermod -a -G dialout $USER y reinicia tu sesión de usuario.',
              'Si el servicio brltty está interfiriendo, prueba: sudo systemctl stop brltty',
            ],
          });
        } else {
          setSerialError({
            code: 'UNKNOWN',
            title: 'Error de comunicación serie con el ESP32',
            message: rawMsg,
            reasons: [
              'Fallo al inicializar el puerto serie a la velocidad seleccionada (' + baudRate + ' baud).',
            ],
            solutions: [
              'Desconecta y vuelve a conectar el cable USB.',
              'Verifica que el cable USB permita transferencia de datos (algunos cables solo cargan batería).',
              'Prueba seleccionando 115200 baudios.',
            ],
          });
        }

        addLog(`Fallo al conectar puerto serial: ${rawMsg}`, 'sys');
        return;
      }

      serialPortRef.current = port;
      const portInfo = port.getInfo();
      const name = portInfo.usbVendorId
        ? `USB VID:0x${portInfo.usbVendorId.toString(16).padStart(4, '0')}`
        : 'Puerto Serie ESP32';
      setPortName(name);
      setIsConnected(true);
      setSerialError(null);
      addLog(`ESP32 Conectado con éxito (${name}) a ${baudRate} baudios`, 'sys');

      // Setup reader loop using direct getReader() (without permanently locking streams)
      keepReadingRef.current = true;
      (async () => {
        const textDecoder = new TextDecoder();
        let buffer = '';

        while (keepReadingRef.current && port.readable) {
          let reader: any = null;
          try {
            reader = port.readable.getReader();
            serialReaderRef.current = reader;

            while (keepReadingRef.current) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                buffer += textDecoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  addLog(trimmed, 'in');

                  const parsed = parseSerialLine(trimmed);
                  if (parsed) {
                    if (parsed.type === 'data' && parsed.angle !== undefined && parsed.distance !== undefined) {
                      setTurntable((prev) => ({ ...prev, currentAngle: parsed.angle! }));
                      setSensorData({
                        distanceCm: parsed.distance,
                        rawEchoMicros: Math.round((parsed.distance / 0.0343) * 2),
                        valid: parsed.distance > settings.minDistance && parsed.distance < settings.maxDistance,
                        lastPingTime: Date.now(),
                      });

                      const cartesian = convertToCartesian(
                        parsed.angle,
                        parsed.distance,
                        parsed.z ?? 0,
                        settings
                      );
                      if (cartesian) {
                        addPoint(cartesian);
                      }
                    } else if (parsed.type === 'status' && parsed.statusMessage) {
                      if (parsed.statusMessage.includes('SCAN_COMPLETE')) {
                        setScanStatus('completed');
                      } else if (parsed.statusMessage.includes('POS:')) {
                        const pos = parseFloat(parsed.statusMessage.split(':')[2] || '0');
                        setTurntable((prev) => ({ ...prev, currentAngle: pos }));
                      }
                    }
                  }
                }
              }
            }
          } catch (readErr: any) {
            if (keepReadingRef.current) {
              console.error('Serial read loop error:', readErr);
              addLog(`Aviso de lectura serie: ${readErr.message || readErr}`, 'sys');
            }
          } finally {
            if (reader) {
              try {
                reader.releaseLock();
              } catch (e) {
                // Ignore lock release error
              }
            }
            serialReaderRef.current = null;
          }
        }
      })();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (err?.name === 'NotFoundError' || errMsg.includes('No port selected') || errMsg.includes('cancel')) {
        addLog('Selección de puerto cancelada por el usuario', 'sys');
      } else {
        console.error('Serial requestPort error:', err);
        addLog(`Fallo al solicitar puerto serial: ${errMsg}`, 'sys');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [baudRate, addLog, settings, addPoint, disconnectSerial]);

  // Simulator connect/disconnect
  const connectSimulator = useCallback(() => {
    setIsConnected(true);
    setPortName('Simulador Virtual 3D');
    addLog('Simulador de hardware ESP32 y sensor ultrasónico iniciado', 'sys');

    // Run an initial ping
    const result = simulateUltrasonicPing(turntable.currentAngle, 0, simulatedModel, settings);
    setSensorData({
      distanceCm: result.distance,
      rawEchoMicros: Math.round(result.distance / 0.0343 * 2),
      valid: true,
      lastPingTime: Date.now(),
    });
  }, [addLog, turntable.currentAngle, simulatedModel, settings]);

  const disconnectSimulator = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsConnected(false);
    setScanStatus('idle');
    addLog('Simulador de hardware detenido', 'sys');
  }, [addLog]);

  // Handle command when in simulator mode
  const handleSimulatedCommand = useCallback(
    (cmd: string) => {
      const upper = cmd.trim().toUpperCase();

      if (upper.startsWith('LEFT') || upper.startsWith('TL')) {
        let deg = turntable.stepSize;
        const parts = upper.split(':');
        if (parts[1]) deg = parseFloat(parts[1]) || turntable.stepSize;

        setTurntable((prev) => {
          const nextAngle = Math.max(0, prev.currentAngle - deg);
          const result = simulateUltrasonicPing(nextAngle, 0, simulatedModel, settings);
          setSensorData({
            distanceCm: result.distance,
            rawEchoMicros: Math.round(result.distance / 0.0343 * 2),
            valid: true,
            lastPingTime: Date.now(),
          });
          if (result.point) addPoint(result.point);
          addLog(`STATUS:POS:${nextAngle.toFixed(1)}`, 'in');
          addLog(`{"angle":${nextAngle.toFixed(1)},"dist":${result.distance.toFixed(2)},"z":0}`, 'in');
          return { ...prev, currentAngle: nextAngle };
        });
      } else if (upper.startsWith('RIGHT') || upper.startsWith('TR')) {
        let deg = turntable.stepSize;
        const parts = upper.split(':');
        if (parts[1]) deg = parseFloat(parts[1]) || turntable.stepSize;

        setTurntable((prev) => {
          const nextAngle = Math.min(settings.fullSweepAngle, prev.currentAngle + deg);
          const result = simulateUltrasonicPing(nextAngle, 0, simulatedModel, settings);
          setSensorData({
            distanceCm: result.distance,
            rawEchoMicros: Math.round(result.distance / 0.0343 * 2),
            valid: true,
            lastPingTime: Date.now(),
          });
          if (result.point) addPoint(result.point);
          addLog(`STATUS:POS:${nextAngle.toFixed(1)}`, 'in');
          addLog(`{"angle":${nextAngle.toFixed(1)},"dist":${result.distance.toFixed(2)},"z":0}`, 'in');
          return { ...prev, currentAngle: nextAngle };
        });
      } else if (upper.startsWith('GOTO')) {
        const parts = upper.split(':');
        const target = parseFloat(parts[1] || '0');
        const nextAngle = Math.max(0, Math.min(settings.fullSweepAngle, target));
        setTurntable((prev) => {
          const result = simulateUltrasonicPing(nextAngle, 0, simulatedModel, settings);
          setSensorData({
            distanceCm: result.distance,
            rawEchoMicros: Math.round(result.distance / 0.0343 * 2),
            valid: true,
            lastPingTime: Date.now(),
          });
          if (result.point) addPoint(result.point);
          addLog(`STATUS:POS:${nextAngle.toFixed(1)}`, 'in');
          addLog(`{"angle":${nextAngle.toFixed(1)},"dist":${result.distance.toFixed(2)},"z":0}`, 'in');
          return { ...prev, currentAngle: nextAngle };
        });
      } else if (upper === 'HOME') {
        setTurntable((prev) => ({ ...prev, currentAngle: 0 }));
        addLog('STATUS:HOMED (0°)', 'in');
      } else if (upper === 'PING') {
        const result = simulateUltrasonicPing(turntable.currentAngle, 0, simulatedModel, settings);
        setSensorData({
          distanceCm: result.distance,
          rawEchoMicros: Math.round(result.distance / 0.0343 * 2),
          valid: true,
          lastPingTime: Date.now(),
        });
        if (result.point) addPoint(result.point);
        addLog(`{"angle":${turntable.currentAngle.toFixed(1)},"dist":${result.distance.toFixed(2)},"z":0}`, 'in');
      } else if (upper.startsWith('SCAN:START') || upper === 'SCAN') {
        startAutomatedScan();
      } else if (upper === 'SCAN:STOP' || upper === 'STOP') {
        stopAutomatedScan();
      }
    },
    [turntable.stepSize, turntable.currentAngle, simulatedModel, settings, addPoint, addLog]
  );

  // Start Automated 3D scan
  const startAutomatedScan = useCallback(() => {
    setScanStatus('scanning');
    addLog('Iniciando escaneo 3D automático...', 'sys');

    if (connectionMode === 'serial') {
      sendSerialCommand(`SCAN:${settings.angularResolution}`);
    } else if (connectionMode === 'simulator') {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      let currentDeg = 0;
      let currentZLayer = 0;
      const totalLayers = settings.verticalLayers || 1;
      const step = settings.angularResolution || 2;
      const sweepLimit = settings.fullSweepAngle || 360;

      scanIntervalRef.current = setInterval(() => {
        const zHeight = currentZLayer * 1.5; // cm height per slice
        const result = simulateUltrasonicPing(currentDeg, zHeight, simulatedModel, settings);

        setTurntable((prev) => ({ ...prev, currentAngle: currentDeg }));
        setSensorData({
          distanceCm: result.distance,
          rawEchoMicros: Math.round(result.distance / 0.0343 * 2),
          valid: true,
          lastPingTime: Date.now(),
        });

        if (result.point) {
          addPoint(result.point);
        }

        addLog(`{"angle":${currentDeg},"dist":${result.distance.toFixed(2)},"z":${zHeight.toFixed(1)}}`, 'in');

        currentDeg += step;

        if (currentDeg > sweepLimit) {
          currentZLayer++;
          if (currentZLayer < totalLayers) {
            currentDeg = 0;
            addLog(`Capa vertical ${currentZLayer + 1}/${totalLayers} iniciada`, 'sys');
          } else {
            // Completed scan
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
            setScanStatus('completed');
            addLog('STATUS:SCAN_COMPLETE - Nube de puntos 3D generada', 'sys');
          }
        }
      }, 45); // ~22 points per second
    }
  }, [connectionMode, settings, simulatedModel, sendSerialCommand, addPoint, addLog]);

  // Stop scan
  const stopAutomatedScan = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanStatus('idle');
    addLog('Escaneo 3D detenido', 'sys');

    if (connectionMode === 'serial') {
      sendSerialCommand('STOP');
    }
  }, [connectionMode, sendSerialCommand, addLog]);

  // Turn left handler
  const handleTurnLeft = useCallback(
    (degrees: number) => {
      sendSerialCommand(`LEFT:${degrees}`);
    },
    [sendSerialCommand]
  );

  // Turn right handler
  const handleTurnRight = useCallback(
    (degrees: number) => {
      sendSerialCommand(`RIGHT:${degrees}`);
    },
    [sendSerialCommand]
  );

  // Goto angle handler
  const handleGotoAngle = useCallback(
    (angle: number) => {
      sendSerialCommand(`GOTO:${angle}`);
    },
    [sendSerialCommand]
  );

  // Home handler
  const handleHome = useCallback(() => {
    sendSerialCommand('HOME');
  }, [sendSerialCommand]);

  // Step size change
  const handleStepChange = useCallback((step: number) => {
    setTurntable((prev) => ({ ...prev, stepSize: step }));
  }, []);

  // Ping sensor handler
  const handlePingSensor = useCallback(() => {
    sendSerialCommand('PING');
  }, [sendSerialCommand]);

  // Clear points
  const handleClearPoints = useCallback(() => {
    setPoints([]);
    addLog('Nube de puntos reiniciada', 'sys');
  }, [addLog]);

  // Connect toggle
  const handleConnect = useCallback(() => {
    if (connectionMode === 'serial') {
      connectSerial();
    } else {
      connectSimulator();
    }
  }, [connectionMode, connectSerial, connectSimulator]);

  const handleDisconnect = useCallback(() => {
    if (connectionMode === 'serial') {
      disconnectSerial();
    } else {
      disconnectSimulator();
    }
  }, [connectionMode, disconnectSerial, disconnectSimulator]);

  // Switch to simulator helper
  const switchToSimulator = useCallback(() => {
    setConnectionMode('simulator');
    setSerialError(null);
    connectSimulator();
  }, [connectSimulator]);

  const dismissSerialError = useCallback(() => {
    setSerialError(null);
  }, []);

  // Listen to physical USB disconnect events
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) return;

    const onSerialDisconnect = (event: any) => {
      console.warn('Physical Serial port disconnected:', event);
      addLog('Dispositivo USB desconectado físicamente', 'sys');
      disconnectSerial();
    };

    (navigator as any).serial.addEventListener('disconnect', onSerialDisconnect);
    return () => {
      (navigator as any).serial.removeEventListener('disconnect', onSerialDisconnect);
    };
  }, [addLog, disconnectSerial]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  return {
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
    clearSerialLogs: () => setSerialLogs([]),
  };
}
