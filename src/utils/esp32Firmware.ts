export interface FirmwareConfig {
  trigPin: number;
  echoPin: number;
  servoPin: number;
  zServoPin?: number;
  baudRate: number;
  defaultDelayMs: number;
}

export const DEFAULT_FIRMWARE_CONFIG: FirmwareConfig = {
  trigPin: 5,
  echoPin: 18,
  servoPin: 19,
  zServoPin: 23,
  baudRate: 115200,
  defaultDelayMs: 30,
};

export function generateEsp32Firmware(config: FirmwareConfig = DEFAULT_FIRMWARE_CONFIG): string {
  return `/*
 * ====================================================================
 *   SCANNER 3D ULTRASONICO ESP32 + SERVOMOTOR DE PLATAFORMA GIRATORIA
 *   Generado para: ScanESP32 3D Studio
 * ====================================================================
 * 
 * CONEXIONES DE HARDWARE ESP32:
 * ---------------------------------------------------------
 * Sensor Ultrasonico HC-SR04:
 *   - VCC  -> 5V (o VIN del ESP32 con alimentacion USB)
 *   - GND  -> GND
 *   - TRIG -> GPIO ${config.trigPin}
 *   - ECHO -> GPIO ${config.echoPin} (Recomendado: divisor resistivo 1k/2k a 3.3V)
 * 
 * Servomotor de Plataforma (SG90 / MG995 / MG996R):
 *   - VCC (Rojo)    -> 5V externo con GND comun
 *   - GND (Marron)  -> GND
 *   - SIGNAL(Naranja)-> GPIO ${config.servoPin}
 * 
 * Servomotor de Altura Eje Z (Opcional):
 *   - SIGNAL        -> GPIO ${config.zServoPin ?? 23}
 * ---------------------------------------------------------
 */

#include <ESP32Servo.h>

// Definicion de Pines
const int PIN_TRIG = ${config.trigPin};
const int PIN_ECHO = ${config.echoPin};
const int PIN_SERVO_TURNTABLE = ${config.servoPin};
const int PIN_SERVO_Z = ${config.zServoPin ?? 23};

Servo servoTurntable;
Servo servoZ;

int currentAngle = 0;       // Angulo actual de la plataforma (0 - 180 o 360)
int currentZLayer = 0;      // Nivel vertical
int servoStepDelay = ${config.defaultDelayMs}; // Retardo en ms para estabilidad mecanica
bool isScanning = false;
int scanStep = 2;           // Grados por paso
int scanEndAngle = 180;     // Para servos estandar de 180 o 360

// Funcion para medir distancia con el HC-SR04 (promedio de 3 lecturas rapidas)
float getUltrasonicDistanceCm() {
  float sumDist = 0;
  int validSamples = 0;

  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(3);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    // Timeout de 25ms (~4.2 metros max)
    long duration = pulseIn(PIN_ECHO, HIGH, 25000);

    if (duration > 0) {
      // Velocidad del sonido = 343 m/s = 0.0343 cm/microsegundo
      float dist = (duration * 0.0343) / 2.0;
      if (dist >= 1.5 && dist <= 40.0) {
        sumDist += dist;
        validSamples++;
      }
    }
    delay(4);
  }

  if (validSamples == 0) return -1.0;
  return sumDist / validSamples;
}

// Enviar medicion por Serial en formato JSON
void sendDataPoint(int angle, float dist, int z = 0) {
  Serial.print("{\\"angle\\":");
  Serial.print(angle);
  Serial.print(",\\"dist\\":");
  Serial.print(dist, 2);
  Serial.print(",\\"z\\":");
  Serial.print(z);
  Serial.println("}");
}

void setup() {
  Serial.begin(${config.baudRate});
  
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);

  // Configuracion de temporizadores para servos ESP32
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoTurntable.setPeriodHertz(50); // Servo estandar 50Hz
  servoTurntable.attach(PIN_SERVO_TURNTABLE, 500, 2400); // Rango de pulsos US

  servoZ.setPeriodHertz(50);
  servoZ.attach(PIN_SERVO_Z, 500, 2400);

  // Mover a posicion inicial HOME (0 grados)
  currentAngle = 0;
  servoTurntable.write(currentAngle);
  servoZ.write(0);
  delay(500);

  Serial.println("STATUS:READY - ESP32 3D Scanner Online");
}

void loop() {
  // Procesar comandos recibidos por el puerto Serial
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    processCommand(cmd);
  }

  // Si esta en modo escaneo automatico
  if (isScanning) {
    float dist = getUltrasonicDistanceCm();
    sendDataPoint(currentAngle, dist, currentZLayer);

    currentAngle += scanStep;

    if (currentAngle > scanEndAngle) {
      isScanning = false;
      Serial.println("STATUS:SCAN_COMPLETE");
    } else {
      servoTurntable.write(currentAngle);
      delay(servoStepDelay);
    }
  }
}

void processCommand(String cmd) {
  cmd.toUpperCase();

  // COMANDO: GIRO A LA IZQUIERDA (LEFT:<grados>)
  if (cmd.startsWith("LEFT") || cmd.startsWith("TL")) {
    int deg = 5;
    int idx = cmd.indexOf(':');
    if (idx != -1) deg = cmd.substring(idx + 1).toInt();
    currentAngle = max(0, currentAngle - deg);
    servoTurntable.write(currentAngle);
    float dist = getUltrasonicDistanceCm();
    Serial.print("STATUS:POS:");
    Serial.println(currentAngle);
    sendDataPoint(currentAngle, dist, currentZLayer);
  }
  // COMANDO: GIRO A LA DERECHA (RIGHT:<grados>)
  else if (cmd.startsWith("RIGHT") || cmd.startsWith("TR")) {
    int deg = 5;
    int idx = cmd.indexOf(':');
    if (idx != -1) deg = cmd.substring(idx + 1).toInt();
    currentAngle = min(180, currentAngle + deg);
    servoTurntable.write(currentAngle);
    float dist = getUltrasonicDistanceCm();
    Serial.print("STATUS:POS:");
    Serial.println(currentAngle);
    sendDataPoint(currentAngle, dist, currentZLayer);
  }
  // COMANDO: IR A UN ANGULO ESPECIFICO (GOTO:<grados>)
  else if (cmd.startsWith("GOTO")) {
    int idx = cmd.indexOf(':');
    if (idx != -1) {
      int target = cmd.substring(idx + 1).toInt();
      currentAngle = constrain(target, 0, 180);
      servoTurntable.write(currentAngle);
      delay(50);
      float dist = getUltrasonicDistanceCm();
      Serial.print("STATUS:POS:");
      Serial.println(currentAngle);
      sendDataPoint(currentAngle, dist, currentZLayer);
    }
  }
  // COMANDO: INICIAR ESCANEO (SCAN:START o SCAN:<step>)
  else if (cmd.startsWith("SCAN:START") || cmd.startsWith("SCAN")) {
    int idx = cmd.lastIndexOf(':');
    if (idx != -1 && cmd.substring(idx + 1).toInt() > 0) {
      scanStep = cmd.substring(idx + 1).toInt();
    } else {
      scanStep = 2; // paso default 2 grados
    }
    currentAngle = 0;
    servoTurntable.write(currentAngle);
    delay(400);
    isScanning = true;
    Serial.println("STATUS:SCANNING_STARTED");
  }
  // COMANDO: DETENER ESCANEO
  else if (cmd == "SCAN:STOP" || cmd == "STOP") {
    isScanning = false;
    Serial.println("STATUS:STOPPED");
  }
  // COMANDO: HOME (Volver a 0 grados)
  else if (cmd == "HOME") {
    isScanning = false;
    currentAngle = 0;
    servoTurntable.write(0);
    Serial.println("STATUS:HOMED");
  }
  // COMANDO: PING (Medir distancia ultrasonica puntual)
  else if (cmd == "PING") {
    float dist = getUltrasonicDistanceCm();
    sendDataPoint(currentAngle, dist, currentZLayer);
  }
}
`;
}
