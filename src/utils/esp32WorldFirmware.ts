// ESP32 Arduino C++ Firmware Code - v2.0.0
// Point A to Point B Autonomous Navigation, Zero-Lag Smart Sonar, Tangent Obstacle Avoidance & Calibrated PWM Motors

export const ESP32_WORLD_DISCOVERER_CODE = `/*
 * ==============================================================================
 * PROYECTO: ESP32 ROVER DE NAVEGACIÓN A -> B, SONAR INTELIGENTE & ESQUIVE DE OBSTÁCULOS
 * VERSIÓN: 2.0.0
 * ==============================================================================
 * Especificaciones de Funcionamiento v2.0.0:
 *   1. Navegación Autónoma de Punto A a Punto B:
 *      - Coordenadas de inicio A(x, y) y destino B(x, y).
 *      - Cálculo de rumbo relativo hacia la meta mediante arcotangente (atan2).
 *      - Odometría continua estimada en cm y grados (90° = Norte/+Y).
 *
 *   2. Detección y Esquive Inteligente de Obstáculos (Algoritmo Tangente / Bug):
 *      - Barrido continuo con servomotor y sensor HC-SR04.
 *      - Rango normal: 0 a 30° y 0 a -30° (60° a 120° servo).
 *      - Rango con obstáculo (<= 40 cm): 0 a 10° y 0 a -10° (80° a 100° servo).
 *      - Al detectar bloqueo frontal, evalúa sectores laterales (izq 115° vs der 65°),
 *        toma la tangente más despejada y esquiva sin detener el muestreo.
 *      - Al despejar el obstáculo (> 45 cm), restablece el senso a 30° y realinea el
 *        rumbo hacia el Punto B optimizando la ruta.
 *      - Detención y telemetría de éxito al alcanzar el radio de meta (<= 15 cm).
 *
 *   3. Tracción Calibrada por PWM (175 a 198):
 *      - Rango seguro y potente para motores DC con puente H L298N o TB6612.
 *
 * Conexión de Pines ESP32:
 *   - Servomotor (PWM):      GPIO 18
 *   - HC-SR04 TRIG:          GPIO 5
 *   - HC-SR04 ECHO:          GPIO 19 (divisor de voltaje 5V a 3.3V)
 *   - Motor Izquierdo (IN1): GPIO 25
 *   - Motor Izquierdo (IN2): GPIO 26
 *   - Motor Derecho   (IN3): GPIO 32
 *   - Motor Derecho   (IN4): GPIO 33
 *   - Baudrate Serial:       115200 bps
 * ==============================================================================
 */

#include <ESP32Servo.h>

// --- Definición de Pines ---
const int SERVO_PIN   = 18;    // Pin PWM servomotor radar
const int TRIG_PIN    = 5;     // Pin TRIG HC-SR04
const int ECHO_PIN    = 19;    // Pin ECHO HC-SR04

// Pines de tracción puente H
const int MOTOR_L_IN1 = 25;
const int MOTOR_L_IN2 = 26;
const int MOTOR_R_IN1 = 32;
const int MOTOR_R_IN2 = 33;

// Rango PWM calibrado (175 a 198)
const int MIN_MOTOR_PWM = 175;
const int MAX_MOTOR_PWM = 198;
int currentMotorPwm     = 185;

// --- Sonar Inteligente & Servomotor ---
Servo radarServo;
const int CENTER_ANGLE          = 90;   // 0° relativo (Frente)
const int NORMAL_SPAN           = 30;   // Estado normal: 60° a 120°
const int OBSTACLE_SPAN         = 10;   // Con obstáculo: 80° a 100°
const float OBSTACLE_TRIGGER_CM = 40.0; // Umbral de detección (40 cm)
const unsigned long SERVO_SETTLE_MS = 40; // Retardo estabilización mecánica

enum ScanMode {
  NORMAL_SWEEP,
  OBSTACLE_REDUCED_SWEEP
};

ScanMode currentScanMode = NORMAL_SWEEP;
int currentAngle         = CENTER_ANGLE;
int sweepDirection       = 1;
bool isScanningActive    = true;
unsigned long lastStepTime = 0;
float lastMeasuredDistCm = 150.0;

// Odometría global del bot
float posX_cm       = 0.0;
float posY_cm       = 30.0;
float botHeadingDeg = 90.0; // 90° es Norte (+Y)

// --- Estado de Navegación Punto A -> Punto B (v2.0.0) ---
enum NavState {
  NAV_IDLE,
  NAV_ORIENTING,
  NAV_CRUISING,
  NAV_PROBING_WIDE,
  NAV_AVOIDING_LEFT,
  NAV_AVOIDING_RIGHT,
  NAV_REVERSING_ESCAPE,
  NAV_REJOINING_GOAL,
  NAV_GOAL_REACHED
};

NavState navState     = NAV_IDLE;
bool isNavActive      = false;
float pointAx_cm      = 0.0;
float pointAy_cm      = 30.0;
float pointBx_cm      = 100.0;
float pointBy_cm      = 250.0;
float distToGoalCm    = 0.0;
float totalDetourCm   = 0.0;
int avoidanceTicks    = 0;
int reversingTicks    = 0;
int escapePivotDeg    = 0;

int clampPwm(int value) {
  if (value < MIN_MOTOR_PWM) return MIN_MOTOR_PWM;
  if (value > MAX_MOTOR_PWM) return MAX_MOTOR_PWM;
  return value;
}

// Control de Motores
void stopMotors() {
  analogWrite(MOTOR_L_IN1, 0);
  analogWrite(MOTOR_L_IN2, 0);
  analogWrite(MOTOR_R_IN1, 0);
  analogWrite(MOTOR_R_IN2, 0);
}

void driveForward(int pwm = -1, int durationMs = 450) {
  int speed = (pwm > 0) ? clampPwm(pwm) : currentMotorPwm;
  analogWrite(MOTOR_L_IN1, speed);
  analogWrite(MOTOR_L_IN2, 0);
  analogWrite(MOTOR_R_IN1, speed);
  analogWrite(MOTOR_R_IN2, 0);

  int dur = (durationMs > 0) ? durationMs : 450;
  delay(dur);
  stopMotors();

  float rad = botHeadingDeg * 0.0174533;
  float step = (dur / 450.0) * 16.0;
  posX_cm += step * cos(rad);
  posY_cm += step * sin(rad);
  totalDetourCm += step;
  Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);
}

void driveBackward(int pwm = -1, int durationMs = 450) {
  int speed = (pwm > 0) ? clampPwm(pwm) : currentMotorPwm;
  analogWrite(MOTOR_L_IN1, 0);
  analogWrite(MOTOR_L_IN2, speed);
  analogWrite(MOTOR_R_IN1, 0);
  analogWrite(MOTOR_R_IN2, speed);

  int dur = (durationMs > 0) ? durationMs : 450;
  delay(dur);
  stopMotors();

  float rad = botHeadingDeg * 0.0174533;
  float step = (dur / 450.0) * 14.0;
  posX_cm -= step * cos(rad);
  posY_cm -= step * sin(rad);
  Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);
}

void turnLeft(int pwm = -1, int deg = 15) {
  int speed = (pwm > 0) ? clampPwm(pwm) : currentMotorPwm;
  analogWrite(MOTOR_L_IN1, 0);
  analogWrite(MOTOR_L_IN2, speed);
  analogWrite(MOTOR_R_IN1, speed);
  analogWrite(MOTOR_R_IN2, 0);
  delay(120);
  stopMotors();

  botHeadingDeg += deg;
  if (botHeadingDeg >= 360.0) botHeadingDeg -= 360.0;
  Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);

  currentScanMode = NORMAL_SWEEP;
  isScanningActive = true;
  Serial.println("SYS:SCAN_NORMAL_RESET_30");
}

void turnRight(int pwm = -1, int deg = 15) {
  int speed = (pwm > 0) ? clampPwm(pwm) : currentMotorPwm;
  analogWrite(MOTOR_L_IN1, speed);
  analogWrite(MOTOR_L_IN2, 0);
  analogWrite(MOTOR_R_IN1, 0);
  analogWrite(MOTOR_R_IN2, speed);
  delay(120);
  stopMotors();

  botHeadingDeg -= deg;
  if (botHeadingDeg < 0.0) botHeadingDeg += 360.0;
  Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);

  currentScanMode = NORMAL_SWEEP;
  isScanningActive = true;
  Serial.println("SYS:SCAN_NORMAL_RESET_30");
}

// Lectura de ultrasonido HC-SR04
float readUltrasonicDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 26000);
  if (duration == 0) return 400.0;

  float distance = (duration * 0.0343) / 2.0;
  if (distance < 2.0) distance = 2.0;
  if (distance > 400.0) distance = 400.0;
  return distance;
}

// Helper para muestrear ángulo específico
float sampleAtAngle(int angleDeg) {
  radarServo.write(constrain(angleDeg, 0, 180));
  delay(SERVO_SETTLE_MS);
  return readUltrasonicDistanceCm();
}

// --- Rutina Autónoma A -> B con Esquive de Obstáculos (v2.0.0) ---
void updateAutonomousNavigation() {
  if (!isNavActive || navState == NAV_GOAL_REACHED) return;

  float dx = pointBx_cm - posX_cm;
  float dy = pointBy_cm - posY_cm;
  distToGoalCm = sqrt(dx * dx + dy * dy);

  // Meta alcanzada (radio de 14 cm)
  if (distToGoalCm <= 14.0) {
    stopMotors();
    isNavActive = false;
    navState = NAV_GOAL_REACHED;
    Serial.printf("NAV:GOAL_REACHED,DIST=%.1f,DETOUR=%.1f\\n", distToGoalCm, totalDetourCm);
    return;
  }

  // Rumbo deseado hacia el Punto B
  float targetHeading = atan2(dy, dx) * 57.2957795;
  if (targetHeading < 0) targetHeading += 360.0;

  float headingError = targetHeading - botHeadingDeg;
  while (headingError > 180.0) headingError -= 360.0;
  while (headingError < -180.0) headingError += 360.0;

  bool isObstacleAhead = (lastMeasuredDistCm <= OBSTACLE_TRIGGER_CM);

  switch (navState) {
    case NAV_ORIENTING:
      if (abs(headingError) > 8.0) {
        if (headingError > 0) turnLeft(currentMotorPwm, 10);
        else turnRight(currentMotorPwm, 10);
      } else {
        navState = NAV_CRUISING;
        Serial.printf("NAV:STATUS,CRUISING,HEAD=%.0f\\n", botHeadingDeg);
      }
      break;

    case NAV_CRUISING:
      if (isObstacleAhead) {
        // Obstáculo detectado antes de llegar a él: detenerse y ampliar rango de sonda
        stopMotors();
        navState = NAV_PROBING_WIDE;
        Serial.printf("SONDA:AMPLIANDO_RANGO,SPAN=140DEG,FRONT=%.1f\\n", lastMeasuredDistCm);
      } else {
        // Corrección suave de rumbo hacia B mientras avanza
        if (abs(headingError) > 12.0) {
          if (headingError > 0) turnLeft(currentMotorPwm, 6);
          else turnRight(currentMotorPwm, 6);
        }
        driveForward(currentMotorPwm, 300);
      }
      break;

    case NAV_PROBING_WIDE: {
      // Sonda ampliada en grados para evaluar campo de visión completo (derecha, frente, izquierda)
      float clearRight = min(sampleAtAngle(40), sampleAtAngle(65));
      float clearLeft  = min(sampleAtAngle(115), sampleAtAngle(140));
      const float SAFE_CLEARANCE_CM = 42.0;

      Serial.printf("SONDA:EVALUACION,R=%.1f,L=%.1f,MIN=%.1f\\n", clearRight, clearLeft, SAFE_CLEARANCE_CM);

      // Regla: Esquiva siempre por derecha si es posible; si no, por izquierda.
      // En caso de estar encerrado, da marcha atrás para validar nueva ruta.
      if (clearRight >= SAFE_CLEARANCE_CM) {
        navState = NAV_AVOIDING_RIGHT;
        avoidanceTicks = 4;
        Serial.printf("NAV:DECISION,ESQUIVE_POR_DERECHA_PREFERENTE,CLEAR_R=%.1f\\n", clearRight);
      } else if (clearLeft >= SAFE_CLEARANCE_CM) {
        navState = NAV_AVOIDING_LEFT;
        avoidanceTicks = 4;
        Serial.printf("NAV:DECISION,ESQUIVE_POR_IZQUIERDA_ALTERNATIVO,CLEAR_L=%.1f\\n", clearLeft);
      } else {
        navState = NAV_REVERSING_ESCAPE;
        reversingTicks = 5;
        escapePivotDeg = (clearRight >= clearLeft) ? -45 : 45;
        Serial.println("ALERTA:ENCERRADO_SIN_SALIDA,INICIANDO_MARCHA_ATRAS");
      }
      break;
    }

    case NAV_REVERSING_ESCAPE:
      // Marcha atrás para salir del encierro
      driveBackward(currentMotorPwm, 320);
      reversingTicks--;
      Serial.printf("NAV:MARCHA_ATRAS,REMANENTE=%d\\n", reversingTicks);
      if (reversingTicks <= 0) {
        if (escapePivotDeg < 0) turnRight(currentMotorPwm, abs(escapePivotDeg));
        else turnLeft(currentMotorPwm, escapePivotDeg);
        navState = NAV_ORIENTING;
        currentScanMode = NORMAL_SWEEP;
        Serial.println("NAV:RETROCESO_COMPLETO,VALIDANDO_NUEVA_RUTA");
      }
      break;

    case NAV_AVOIDING_LEFT:
      turnLeft(currentMotorPwm, 14);
      driveForward(currentMotorPwm, 280);
      avoidanceTicks--;
      if (avoidanceTicks <= 0) {
        float frontDist = sampleAtAngle(90);
        if (frontDist > 45.0) {
          navState = NAV_REJOINING_GOAL;
          Serial.println("NAV:REJOIN_GOAL");
        } else {
          avoidanceTicks = 2;
        }
      }
      break;

    case NAV_AVOIDING_RIGHT:
      turnRight(currentMotorPwm, 14);
      driveForward(currentMotorPwm, 280);
      avoidanceTicks--;
      if (avoidanceTicks <= 0) {
        float frontDist = sampleAtAngle(90);
        if (frontDist > 45.0) {
          navState = NAV_REJOINING_GOAL;
          Serial.println("NAV:REJOIN_GOAL");
        } else {
          avoidanceTicks = 2;
        }
      }
      break;

    case NAV_REJOINING_GOAL:
      if (abs(headingError) > 8.0) {
        if (headingError > 0) turnLeft(currentMotorPwm, 8);
        else turnRight(currentMotorPwm, 8);
      }
      driveForward(currentMotorPwm, 300);
      if (abs(headingError) <= 12.0) {
        navState = NAV_CRUISING;
        currentScanMode = NORMAL_SWEEP;
        Serial.println("NAV:REALIGNED_WITH_B");
      }
      break;

    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  pinMode(MOTOR_L_IN1, OUTPUT);
  pinMode(MOTOR_L_IN2, OUTPUT);
  pinMode(MOTOR_R_IN1, OUTPUT);
  pinMode(MOTOR_R_IN2, OUTPUT);
  stopMotors();

  ESP32PWM::allocateTimer(0);
  radarServo.setPeriodHertz(50);
  radarServo.attach(SERVO_PIN, 500, 2400);

  currentAngle = CENTER_ANGLE;
  radarServo.write(currentAngle);
  delay(500);

  Serial.println("SYS:READY,ESP32_V2_NAV_FIRMWARE");
  Serial.printf("SYS:START_ANGLE,%d\\n", CENTER_ANGLE);
  Serial.printf("SYS:PWM_RANGE,%d,%d\\n", MIN_MOTOR_PWM, MAX_MOTOR_PWM);
  Serial.printf("PWM:%d\\n", currentMotorPwm);
  Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);
}

void loop() {
  // 1. Recepción y Procesamiento de Comandos Seriales (Web App <-> ESP32)
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\\n');
    cmd.trim();
    cmd.toUpperCase();

    if (cmd == "START") {
      isScanningActive = true;
      Serial.println("SYS:SCAN_RESUMED");
    } else if (cmd == "STOP" || cmd == "PAUSE") {
      isScanningActive = false;
      isNavActive = false;
      stopMotors();
      Serial.println("SYS:STOPPED");
    } else if (cmd.startsWith("MOVE:F")) {
      driveForward();
    } else if (cmd.startsWith("MOVE:B")) {
      driveBackward();
    } else if (cmd.startsWith("TURN:L")) {
      turnLeft();
    } else if (cmd.startsWith("TURN:R")) {
      turnRight();
    } else if (cmd.startsWith("PWM:")) {
      currentMotorPwm = clampPwm(cmd.substring(4).toInt());
      Serial.printf("PWM:%d\\n", currentMotorPwm);
    } else if (cmd == "RESET_SCAN") {
      currentScanMode = NORMAL_SWEEP;
      isScanningActive = true;
      Serial.println("SYS:SCAN_NORMAL_RESET_30");
    } else if (cmd.startsWith("GOTO:")) {
      currentAngle = constrain(cmd.substring(5).toInt(), 0, 180);
      radarServo.write(currentAngle);
      delay(SERVO_SETTLE_MS);
      lastMeasuredDistCm = readUltrasonicDistanceCm();
      Serial.printf("PING:%d,%.1f\\n", currentAngle, lastMeasuredDistCm);
      Serial.printf("DIST:%.1f\\n", lastMeasuredDistCm);
    } else if (cmd == "PING") {
      lastMeasuredDistCm = readUltrasonicDistanceCm();
      Serial.printf("PING:%d,%.1f\\n", currentAngle, lastMeasuredDistCm);
      Serial.printf("DIST:%.1f\\n", lastMeasuredDistCm);
    } else if (cmd.startsWith("SET_A:")) {
      int comma = cmd.indexOf(',');
      if (comma > 0) {
        pointAx_cm = cmd.substring(6, comma).toFloat();
        pointAy_cm = cmd.substring(comma + 1).toFloat();
        posX_cm = pointAx_cm;
        posY_cm = pointAy_cm;
        Serial.printf("NAV:SET_A,%.1f,%.1f\\n", pointAx_cm, pointAy_cm);
        Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);
      }
    } else if (cmd.startsWith("SET_B:")) {
      int comma = cmd.indexOf(',');
      if (comma > 0) {
        pointBx_cm = cmd.substring(6, comma).toFloat();
        pointBy_cm = cmd.substring(comma + 1).toFloat();
        Serial.printf("NAV:SET_B,%.1f,%.1f\\n", pointBx_cm, pointBy_cm);
      }
    } else if (cmd == "NAV_TO_B" || cmd == "NAV:START") {
      isNavActive = true;
      navState = NAV_ORIENTING;
      totalDetourCm = 0.0;
      Serial.printf("NAV:START,A(%.0f,%.0f)->B(%.0f,%.0f)\\n", pointAx_cm, pointAy_cm, pointBx_cm, pointBy_cm);
    } else if (cmd == "NAV:STOP" || cmd == "NAV:PAUSE") {
      isNavActive = false;
      navState = NAV_IDLE;
      stopMotors();
      Serial.println("NAV:PAUSED");
    } else if (cmd == "NAV:RESET") {
      isNavActive = false;
      navState = NAV_IDLE;
      posX_cm = pointAx_cm;
      posY_cm = pointAy_cm;
      botHeadingDeg = 90.0;
      stopMotors();
      Serial.printf("POS:%.1f,%.1f,%.1f\\n", posX_cm, posY_cm, botHeadingDeg);
    }
  }

  // 2. Sonar Inteligente SIN Desfase Mecánico
  if (isScanningActive) {
    unsigned long now = millis();
    if (now - lastStepTime >= 65) {
      lastStepTime = now;

      radarServo.write(currentAngle);
      delay(SERVO_SETTLE_MS);

      lastMeasuredDistCm = readUltrasonicDistanceCm();
      Serial.printf("PING:%d,%.1f\\n", currentAngle, lastMeasuredDistCm);
      Serial.printf("DIST:%.1f\\n", lastMeasuredDistCm);

      if (lastMeasuredDistCm <= OBSTACLE_TRIGGER_CM) {
        if (currentScanMode != OBSTACLE_REDUCED_SWEEP) {
          currentScanMode = OBSTACLE_REDUCED_SWEEP;
          Serial.printf("ALERT:OBSTACLE_REDUCED_SPAN,%.1f\\n", lastMeasuredDistCm);
        }
      }

      int activeSpan = (currentScanMode == OBSTACLE_REDUCED_SWEEP) ? OBSTACLE_SPAN : NORMAL_SPAN;
      int minAngle = CENTER_ANGLE - activeSpan;
      int maxAngle = CENTER_ANGLE + activeSpan;

      if (currentAngle > maxAngle) {
        currentAngle = maxAngle;
        sweepDirection = -1;
      } else if (currentAngle < minAngle) {
        currentAngle = minAngle;
        sweepDirection = 1;
      } else {
        currentAngle += (sweepDirection * 2);
        if (currentAngle >= maxAngle) {
          currentAngle = maxAngle;
          sweepDirection = -1;
        } else if (currentAngle <= minAngle) {
          currentAngle = minAngle;
          sweepDirection = 1;
        }
      }
    }
  }

  // 3. Algoritmo Autónomo A -> B
  updateAutonomousNavigation();
}
`;

export interface GenerateFirmwareParams {
  pointAx: number;
  pointAy: number;
  pointBx: number;
  pointBy: number;
  motorPwm: number;
  minClearanceCm?: number;
}

export function generateEsp32WorldFirmwareCode(params: GenerateFirmwareParams): string {
  const {
    pointAx,
    pointAy,
    pointBx,
    pointBy,
    motorPwm = 185,
    minClearanceCm = 42.0,
  } = params;

  return ESP32_WORLD_DISCOVERER_CODE
    .replace('float pointAx_cm      = 0.0;', `float pointAx_cm      = ${pointAx.toFixed(1)};`)
    .replace('float pointAy_cm      = 30.0;', `float pointAy_cm      = ${pointAy.toFixed(1)};`)
    .replace('float pointBx_cm      = 100.0;', `float pointBx_cm      = ${pointBx.toFixed(1)};`)
    .replace('float pointBy_cm      = 250.0;', `float pointBy_cm      = ${pointBy.toFixed(1)};`)
    .replace('int currentMotorPwm     = 185;', `int currentMotorPwm     = ${motorPwm};`)
    .replace('const float SAFE_CLEARANCE_CM = 42.0;', `const float SAFE_CLEARANCE_CM = ${minClearanceCm.toFixed(1)};`);
}
