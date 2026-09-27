import * as THREE from 'three';

export interface Rover3DInstance {
  rootGroup: THREE.Group;
  chassisGroup: THREE.Group;
  wheels: {
    frontLeft: THREE.Group;
    frontRight: THREE.Group;
    rearLeft: THREE.Group;
    rearRight: THREE.Group;
  };
  turretServo: THREE.Group;
  sensorHead: THREE.Group;
  beamGroup: THREE.Group;
  beamCone: THREE.Mesh;
  beamRing: THREE.Mesh;
  beamPulse: THREE.Mesh;
  headlights: THREE.SpotLight[];
  headlightHelpers: THREE.Mesh[];
  wheelRotationAngle: number;
}

/**
 * Creates a high-fidelity 4x4 Off-Road Rover (Leo Rover / Husky Gazebo style)
 * with yellow body, 4 rugged tires, differential suspension, and rotating HC-SR04 sonar turret.
 * Dimensions are in meters (Gazebo / ROS standard scale: ~0.45m length, 0.38m width, 0.25m height).
 */
export function createRover3DModel(): Rover3DInstance {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'RoverRoot';

  // Materials
  const yellowPaint = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Industrial Safety Yellow
    roughness: 0.35,
    metalness: 0.15,
  });

  const yellowAccent = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
    metalness: 0.2,
  });

  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1f242d, // Matte Charcoal Black
    roughness: 0.7,
    metalness: 0.3,
  });

  const metalHardware = new THREE.MeshStandardMaterial({
    color: 0x71717a,
    roughness: 0.3,
    metalness: 0.8,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.9,
    metalness: 0.05,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.5,
    metalness: 0.6,
  });

  const headlightLens = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
  });

  const taillightLens = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
  });

  const sensorPcb = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Classic HC-SR04 blue PCB
    roughness: 0.5,
    metalness: 0.2,
  });

  const transducerCan = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8, // Metallic aluminum can
    roughness: 0.2,
    metalness: 0.85,
  });

  const transducerMesh = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    roughness: 0.8,
    metalness: 0.3,
  });

  // 1. Chassis Group
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'Chassis';
  chassisGroup.position.y = 0.13; // Elevated above ground to match wheel radius
  rootGroup.add(chassisGroup);

  // Lower chassis belly pan
  const bellyGeo = new THREE.BoxGeometry(0.32, 0.08, 0.42);
  const bellyMesh = new THREE.Mesh(bellyGeo, darkChassis);
  bellyMesh.castShadow = true;
  bellyMesh.receiveShadow = true;
  chassisGroup.add(bellyMesh);

  // Upper yellow payload body
  const bodyGeo = new THREE.BoxGeometry(0.28, 0.07, 0.36);
  const bodyMesh = new THREE.Mesh(bodyGeo, yellowPaint);
  bodyMesh.position.y = 0.07;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  chassisGroup.add(bodyMesh);

  // Top aluminum deck mounting plate (with equipment grid pattern)
  const deckGeo = new THREE.BoxGeometry(0.29, 0.015, 0.37);
  const deckMesh = new THREE.Mesh(deckGeo, darkChassis);
  deckMesh.position.y = 0.11;
  deckMesh.castShadow = true;
  deckMesh.receiveShadow = true;
  chassisGroup.add(deckMesh);

  // Yellow side accent protection bars
  const barGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.38, 8);
  const leftBar = new THREE.Mesh(barGeo, yellowAccent);
  leftBar.rotation.x = Math.PI / 2;
  leftBar.position.set(-0.145, 0.08, 0);
  leftBar.castShadow = true;
  chassisGroup.add(leftBar);

  const rightBar = new THREE.Mesh(barGeo, yellowAccent);
  rightBar.rotation.x = Math.PI / 2;
  rightBar.position.set(0.145, 0.08, 0);
  rightBar.castShadow = true;
  chassisGroup.add(rightBar);

  // Front bumper / bullbar (in -Z direction, which is forward in Gazebo/ThreeJS)
  const bumperGeo = new THREE.BoxGeometry(0.34, 0.04, 0.03);
  const bumperMesh = new THREE.Mesh(bumperGeo, darkChassis);
  bumperMesh.position.set(0, 0.02, -0.23);
  bumperMesh.castShadow = true;
  chassisGroup.add(bumperMesh);

  // Rear telemetry antenna mast
  const mastGeo = new THREE.CylinderGeometry(0.004, 0.005, 0.22, 8);
  const mastMesh = new THREE.Mesh(mastGeo, metalHardware);
  mastMesh.position.set(0.1, 0.22, 0.14);
  chassisGroup.add(mastMesh);

  const antennaTipGeo = new THREE.SphereGeometry(0.01, 8, 8);
  const antennaTip = new THREE.Mesh(
    antennaTipGeo,
    new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.9 })
  );
  antennaTip.position.set(0.1, 0.33, 0.14);
  chassisGroup.add(antennaTip);

  // Front Headlights
  const headlightGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.02, 16);
  headlightGeo.rotateX(Math.PI / 2);

  const leftHeadlight = new THREE.Mesh(headlightGeo, headlightLens);
  leftHeadlight.position.set(-0.1, 0.06, -0.21);
  chassisGroup.add(leftHeadlight);

  const rightHeadlight = new THREE.Mesh(headlightGeo, headlightLens);
  rightHeadlight.position.set(0.1, 0.06, -0.21);
  chassisGroup.add(rightHeadlight);

  // Rear red taillights
  const taillightGeo = new THREE.BoxGeometry(0.04, 0.018, 0.015);
  const leftTaillight = new THREE.Mesh(taillightGeo, taillightLens);
  leftTaillight.position.set(-0.1, 0.06, 0.21);
  chassisGroup.add(leftTaillight);

  const rightTaillight = new THREE.Mesh(taillightGeo, taillightLens);
  rightTaillight.position.set(0.1, 0.06, 0.21);
  chassisGroup.add(rightTaillight);

  // Spotlights for realistic night/gazebo headlight cones
  const spotLeft = new THREE.SpotLight(0xfff7ed, 1.2, 8, Math.PI / 6, 0.4, 1.5);
  spotLeft.position.set(-0.1, 0.06, -0.22);
  const targetLeft = new THREE.Object3D();
  targetLeft.position.set(-0.1, 0, -2.5);
  chassisGroup.add(targetLeft);
  spotLeft.target = targetLeft;
  chassisGroup.add(spotLeft);

  const spotRight = new THREE.SpotLight(0xfff7ed, 1.2, 8, Math.PI / 6, 0.4, 1.5);
  spotRight.position.set(0.1, 0.06, -0.22);
  const targetRight = new THREE.Object3D();
  targetRight.position.set(0.1, 0, -2.5);
  chassisGroup.add(targetRight);
  spotRight.target = targetRight;
  chassisGroup.add(spotRight);

  // 2. Off-Road Rugged Wheels (4x4)
  // Wheel helper constructor
  const wheelRadius = 0.095;
  const wheelWidth = 0.065;

  const createWheel = (isLeft: boolean): THREE.Group => {
    const wheelGroup = new THREE.Group();

    // Tire tread cylinder (oriented along X axis)
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMesh = new THREE.Mesh(tireGeo, tireRubber);
    tireMesh.castShadow = true;
    tireMesh.receiveShadow = true;
    wheelGroup.add(tireMesh);

    // Tread grip ribs (lug patterns like off-road rover tires)
    const lugGeo = new THREE.BoxGeometry(wheelWidth * 0.95, 0.014, 0.016);
    const lugsCount = 14;
    for (let i = 0; i < lugsCount; i++) {
      const angle = (i / lugsCount) * Math.PI * 2;
      const lug = new THREE.Mesh(lugGeo, tireRubber);
      lug.position.set(0, Math.cos(angle) * wheelRadius, Math.sin(angle) * wheelRadius);
      lug.rotation.x = -angle;
      wheelGroup.add(lug);
    }

    // Outer rim & center hub cap
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, wheelWidth * 0.7, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rimMesh = new THREE.Mesh(rimGeo, rimMaterial);
    wheelGroup.add(rimMesh);

    // Yellow rim accent ring
    const ringGeo = new THREE.TorusGeometry(wheelRadius * 0.52, 0.005, 8, 20);
    ringGeo.rotateY(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, yellowAccent);
    ringMesh.position.x = isLeft ? -wheelWidth * 0.45 : wheelWidth * 0.45;
    wheelGroup.add(ringMesh);

    // Hex Hub Nut
    const hubGeo = new THREE.CylinderGeometry(0.018, 0.018, wheelWidth * 1.05, 6);
    hubGeo.rotateZ(Math.PI / 2);
    const hubMesh = new THREE.Mesh(hubGeo, metalHardware);
    wheelGroup.add(hubMesh);

    return wheelGroup;
  };

  const wheelOffsetX = 0.20;
  const wheelOffsetZ = 0.16;
  const wheelY = 0.095; // Resting on ground plane (Y=0)

  // Wheel groups placed at rover root for spinning
  const frontLeftWheel = createWheel(true);
  frontLeftWheel.position.set(-wheelOffsetX, wheelY, -wheelOffsetZ);
  rootGroup.add(frontLeftWheel);

  const frontRightWheel = createWheel(false);
  frontRightWheel.position.set(wheelOffsetX, wheelY, -wheelOffsetZ);
  rootGroup.add(frontRightWheel);

  const rearLeftWheel = createWheel(true);
  rearLeftWheel.position.set(-wheelOffsetX, wheelY, wheelOffsetZ);
  rootGroup.add(rearLeftWheel);

  const rearRightWheel = createWheel(false);
  rearRightWheel.position.set(wheelOffsetX, wheelY, wheelOffsetZ);
  rootGroup.add(rearRightWheel);

  // Rocker Bogie suspension rods connecting chassis to wheel axles
  const rockerGeo = new THREE.BoxGeometry(0.016, 0.02, 0.34);
  const leftRocker = new THREE.Mesh(rockerGeo, darkChassis);
  leftRocker.position.set(-0.165, wheelY + 0.02, 0);
  leftRocker.castShadow = true;
  rootGroup.add(leftRocker);

  const rightRocker = new THREE.Mesh(rockerGeo, darkChassis);
  rightRocker.position.set(0.165, wheelY + 0.02, 0);
  rightRocker.castShadow = true;
  rootGroup.add(rightRocker);

  // 3. Rotating Turret with Ultrasonic Sensor HC-SR04
  // Servo turntable mast mounted on front deck
  const mastBaseGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.03, 16);
  const mastBase = new THREE.Mesh(mastBaseGeo, darkChassis);
  mastBase.position.set(0, 0.125, -0.12);
  mastBase.castShadow = true;
  chassisGroup.add(mastBase);

  // Rotating servo group (swivels 180° around local Y)
  const turretServo = new THREE.Group();
  turretServo.name = 'TurretServo';
  turretServo.position.set(0, 0.145, -0.12);
  chassisGroup.add(turretServo);

  // Micro-servo body (SG90 style blue micro casing)
  const servoCaseGeo = new THREE.BoxGeometry(0.032, 0.036, 0.024);
  const servoCase = new THREE.Mesh(
    servoCaseGeo,
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })
  );
  turretServo.add(servoCase);

  // Sensor mounting bracket
  const bracketGeo = new THREE.BoxGeometry(0.045, 0.01, 0.03);
  const bracket = new THREE.Mesh(bracketGeo, darkChassis);
  bracket.position.y = 0.022;
  turretServo.add(bracket);

  // Sensor Head Group (HC-SR04)
  const sensorHead = new THREE.Group();
  sensorHead.name = 'SensorHeadHCSR04';
  sensorHead.position.set(0, 0.038, -0.01);
  turretServo.add(sensorHead);

  // Blue PCB board
  const pcbGeo = new THREE.BoxGeometry(0.05, 0.024, 0.004);
  const pcbMesh = new THREE.Mesh(pcbGeo, sensorPcb);
  pcbMesh.castShadow = true;
  sensorHead.add(pcbMesh);

  // Ultrasonic Transducer Cylinders (the two silver "eyes")
  // Both face forward in local -Z direction
  const eyeRadius = 0.009;
  const eyeLength = 0.015;
  const eyeGeo = new THREE.CylinderGeometry(eyeRadius, eyeRadius, eyeLength, 16);
  eyeGeo.rotateX(Math.PI / 2);

  // Left transducer eye (Trigger)
  const leftEye = new THREE.Mesh(eyeGeo, transducerCan);
  leftEye.position.set(-0.015, 0, -0.008);
  leftEye.castShadow = true;
  sensorHead.add(leftEye);

  const leftMeshScreen = new THREE.Mesh(
    new THREE.CircleGeometry(eyeRadius * 0.85, 16),
    transducerMesh
  );
  leftMeshScreen.position.set(-0.015, 0, -0.0156);
  sensorHead.add(leftMeshScreen);

  // Right transducer eye (Echo)
  const rightEye = new THREE.Mesh(eyeGeo, transducerCan);
  rightEye.position.set(0.015, 0, -0.008);
  rightEye.castShadow = true;
  sensorHead.add(rightEye);

  const rightMeshScreen = new THREE.Mesh(
    new THREE.CircleGeometry(eyeRadius * 0.85, 16),
    transducerMesh
  );
  rightMeshScreen.position.set(0.015, 0, -0.0156);
  sensorHead.add(rightMeshScreen);

  // 4. Dynamic 3D Sonar Beam / Cone (pointing in -Z)
  const beamGroup = new THREE.Group();
  beamGroup.name = 'SonarBeamGroup';
  sensorHead.add(beamGroup);

  // Translucent volumetric cone representing the ultrasonic sound wave spread (~15° cone)
  const coneLength = 2.0; // default 2 meters
  const coneRadius = Math.tan((15 * Math.PI) / 180) * coneLength;
  const coneGeo = new THREE.ConeGeometry(coneRadius, coneLength, 16, 1, true);
  coneGeo.rotateX(-Math.PI / 2); // Point apex at origin, base along -Z
  coneGeo.translate(0, 0, -coneLength / 2);

  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const beamCone = new THREE.Mesh(coneGeo, coneMat);
  beamGroup.add(beamCone);

  // Contact distance ring at the end of the beam
  const ringGeo = new THREE.RingGeometry(0.08, 0.12, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const beamRing = new THREE.Mesh(ringGeo, ringMat);
  beamRing.position.z = -coneLength;
  beamGroup.add(beamRing);

  // Ripple ping wave
  const pulseGeo = new THREE.RingGeometry(0.02, 0.05, 16);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const beamPulse = new THREE.Mesh(pulseGeo, pulseMat);
  beamPulse.position.z = -coneLength * 0.5;
  beamGroup.add(beamPulse);

  return {
    rootGroup,
    chassisGroup,
    wheels: {
      frontLeft: frontLeftWheel,
      frontRight: frontRightWheel,
      rearLeft: rearLeftWheel,
      rearRight: rearRightWheel,
    },
    turretServo,
    sensorHead,
    beamGroup,
    beamCone,
    beamRing,
    beamPulse,
    headlights: [spotLeft, spotRight],
    headlightHelpers: [leftHeadlight, rightHeadlight],
    wheelRotationAngle: 0,
  };
}

/**
 * Updates rover transformation, wheel spinning, and sonar turret angle in 3D.
 * World coordinates are mapped so:
 * x cm -> X meters (x / 100)
 * y cm -> Z meters (-y / 100)
 * heading (0°=East, 90°=North) -> Three.js Y rotation
 * sensorAngle (0°=Right, 90°=Front, 180°=Left) -> Turret local Y rotation
 */
export function updateRover3D(
  rover: Rover3DInstance,
  worldXCm: number,
  worldYCm: number,
  headingDeg: number,
  sensorAngleDeg: number,
  distanceCm: number,
  maxRangeCm: number,
  speedCmS: number,
  isMoving: boolean,
  deltaSec: number
) {
  // 1. Position in meters (Gazebo / ROS coordinate convention)
  const targetX = worldXCm / 100;
  const targetZ = -worldYCm / 100; // In Three.js, -Z is forward / North

  const dx = targetX - rover.rootGroup.position.x;
  const dz = targetZ - rover.rootGroup.position.z;
  const distToTargetM = Math.hypot(dx, dz);

  // If first render or large jump (> 3m), snap position
  if (distToTargetM > 3.0 || isNaN(rover.rootGroup.position.x)) {
    rover.rootGroup.position.x = targetX;
    rover.rootGroup.position.z = targetZ;
  } else if (distToTargetM > 0.001) {
    const lerpFactor = Math.min(1.0, deltaSec * 14);
    rover.rootGroup.position.x += dx * lerpFactor;
    rover.rootGroup.position.z += dz * lerpFactor;

    // Roll wheels smoothly according to actual movement
    const wheelRadiusM = 0.095;
    const rotDelta = (distToTargetM * lerpFactor) / wheelRadiusM;
    rover.wheelRotationAngle += rotDelta;
    rover.wheels.frontLeft.rotation.x = rover.wheelRotationAngle;
    rover.wheels.frontRight.rotation.x = rover.wheelRotationAngle;
    rover.wheels.rearLeft.rotation.x = rover.wheelRotationAngle;
    rover.wheels.rearRight.rotation.x = rover.wheelRotationAngle;
  } else {
    rover.rootGroup.position.x = targetX;
    rover.rootGroup.position.z = targetZ;
  }

  // 2. Heading rotation around global Y axis
  // 90° heading (North) maps to 0 rotation (facing -Z)
  // 0° heading (East) maps to -90° rotation (facing +X)
  const headingRad = ((headingDeg - 90) * Math.PI) / 180;
  rover.rootGroup.rotation.y = -headingRad;

  // 3. Servo turret rotation (HC-SR04 sweep)
  // Sensor angle 90° is straight ahead (0° local offset)
  // 0° is 90° to the right (+π/2 or -π/2 depending on coordinate frame)
  // 180° is 90° to the left
  const servoOffsetDeg = 90 - sensorAngleDeg; // 0° -> +90°, 90° -> 0°, 180° -> -90°
  const servoOffsetRad = (servoOffsetDeg * Math.PI) / 180;
  rover.turretServo.rotation.y = servoOffsetRad;

  // 4. Wheels spinning fallback when actively moving continuously
  if (isMoving && speedCmS !== 0 && distToTargetM <= 0.001) {
    const wheelRadiusM = 0.095;
    const distanceMovedM = (speedCmS / 100) * deltaSec;
    const rotDelta = distanceMovedM / wheelRadiusM;
    rover.wheelRotationAngle += rotDelta;

    rover.wheels.frontLeft.rotation.x = rover.wheelRotationAngle;
    rover.wheels.frontRight.rotation.x = rover.wheelRotationAngle;
    rover.wheels.rearLeft.rotation.x = rover.wheelRotationAngle;
    rover.wheels.rearRight.rotation.x = rover.wheelRotationAngle;
  }

  // 5. Dynamic Sonar Beam Length according to distance
  // Clamp distance to range between 0.15m and maxRange
  const validDistCm = Math.max(15, Math.min(distanceCm, maxRangeCm));
  const beamLengthM = validDistCm / 100;

  // Scale cone to hit distance
  const defaultConeLen = 2.0;
  const scaleZ = beamLengthM / defaultConeLen;
  rover.beamCone.scale.set(scaleZ, scaleZ, scaleZ);
  rover.beamRing.position.z = -beamLengthM;

  // Contact ring color: Amber/Red if obstacle is close (<60cm), Emerald/Cyan if clear
  const ringMat = rover.beamRing.material as THREE.MeshBasicMaterial;
  if (validDistCm < 50) {
    ringMat.color.setHex(0xf43f5e); // Rose alert
  } else if (validDistCm < 100) {
    ringMat.color.setHex(0xf59e0b); // Amber caution
  } else {
    ringMat.color.setHex(0x38bdf8); // Sky blue clear
  }
}
