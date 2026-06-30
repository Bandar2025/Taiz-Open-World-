import * as THREE from 'three';

export interface VehicleUpdateParams {
  keysPressed: { [key: string]: boolean };
  currentPos: THREE.Vector3;
  currentAngle: number;
  currentVelocity: number;
  steerAngle: number;
  delta: number;
  solidBounds: { box: THREE.Box3; type: string }[];
  modelType: 'shas' | 'hilux' | 'hiace' | 'motorcycle' | 'aircraft';
}

export interface VehicleState {
  position: THREE.Vector3;
  angle: number;
  velocity: number;
  steerAngle: number;
  bodyRoll: number;   // Roll in radians (due to centrifugal force & terrain slope)
  bodyPitch: number;  // Pitch in radians (due to acceleration, braking & terrain incline)
  suspensionOffsets: number[]; // 4 offsets (FL, FR, RL, RR) for bumpy ride over terrain
  isDrifting: boolean;
  enginePitchFactor: number;
}

export class VehicleController {
  // Physical parameters of Toyota Land Cruiser
  private readonly mass = 1950; // kg
  private readonly gravity = 9.81; // m/s^2
  private readonly wheelbase = 2.8; // meters
  private readonly trackWidth = 1.6; // meters
  
  // Spring suspension constants for Hooke's Law
  private readonly springK = 18000; // N/m
  private readonly dampC = 1500;    // Ns/m
  private suspensionVelocity = [0, 0, 0, 0];
  private suspensionCompression = [0, 0, 0, 0];

  // Dynamic state history
  private prevVelocity = 0;
  private driftFactor = 0.0;

  // Pre-allocated collision objects to eliminate GC pressure (v0.5 Polish)
  private readonly carBoxTmp = new THREE.Box3();
  private readonly carMinTmp = new THREE.Vector3();
  private readonly carMaxTmp = new THREE.Vector3();

  /**
   * Calculates continuous procedurally detailed elevation profile of Jebel Saber slopes.
   * Flat asphalt valley streets are at 0.0, and slopes rise naturally up Jebel Saber foothills.
   */
  public getTerrainHeight(x: number, z: number): number {
    // Keep coordinates within map bounds
    const clampX = Math.max(-250, Math.min(250, x));
    const clampZ = Math.max(-250, Math.min(250, z));

    // 1. Check if we are on any of the paved road systems.
    // Paved roads are flat or rise at a smooth gradual slope.
    
    // Road A: Central Main Street (X from -6 to 6, Z from -250 to 250)
    if (Math.abs(clampX) < 6.0) {
      // Smoothly slope up as it enters the mountain area in the south
      if (clampZ < -160) {
        return Math.max(0, (-160 - clampZ) * 0.12);
      }
      return 0;
    }

    // Road B: Al-Mudhaffar Avenue (Z from -26 to -14, X from -250 to 250)
    if (Math.abs(clampZ + 20) < 6.0) {
      return 0;
    }

    // Road C: Al Hawban Highway (Z from 142 to 158, X from -250 to 250)
    if (Math.abs(clampZ - 150) < 8.0) {
      return 0.1;
    }

    // Road D: Bab Musa Secondary Road (X from -125 to -115, Z from -250 to 250)
    if (Math.abs(clampX + 120) < 5.0) {
      return 0;
    }

    // Road E: Souq Al Qahira Road (X from 115 to 125, Z from -250 to 250)
    if (Math.abs(clampX - 120) < 5.0) {
      return 0;
    }

    // Road F: Mountain Saber Winding Road (Z is between -240 and -160)
    // S-curve winding up the southern mountains: x = sin(z * 0.05) * 60
    const windingCenter = Math.sin(clampZ * 0.05) * 60;
    if (Math.abs(clampX - windingCenter) < 7.0 && clampZ < -150) {
      // Altitude increases as we go deeper south (negative Z)
      return Math.max(0, (-150 - clampZ) * 0.18);
    }

    // 2. Sidewalk curb bump (elevated slabs at height 0.2 when near sidewalks)
    let curbHeight = 0;
    const absX = Math.abs(clampX);
    if (absX >= 6.0 && absX <= 10.0 && Math.abs(clampZ) < 130) {
      curbHeight = 0.18;
    }

    // 3. Al-Mudhaffar Mountain terrace/mountain steps (elevated level plateau)
    // Coordinates: X from -47 to -25, Z from -50 to -30
    if (clampX >= -47 && clampX <= -25 && clampZ >= -50 && clampZ <= -30) {
      return 2.5; // Flat terrace level
    }

    // 4. Mount Saber foothills slope profile
    // Foothills begin climbing exponentially as we get further from the central streets.
    let slopeHeight = 0;

    // West mountain slope (climbing as X goes negative)
    if (clampX < -25) {
      const slopeFactor = Math.abs(clampX + 25) * 0.09;
      slopeHeight += Math.pow(slopeFactor, 1.4);
    }
    // East mountain slope (climbing as X goes positive)
    if (clampX > 25) {
      const slopeFactor = (clampX - 25) * 0.08;
      slopeHeight += Math.pow(slopeFactor, 1.3);
    }
    // South mountain ridge (Z < -150 or Z > 40)
    if (clampZ > 40) {
      slopeHeight += Math.pow((clampZ - 40) * 0.06, 1.5);
    }
    if (clampZ < -120) {
      slopeHeight += Math.pow(Math.abs(clampZ + 120) * 0.08, 1.6);
    }

    // Cap the maximum height climb to prevent flyaway anomalies
    return Math.min(26.0, slopeHeight + curbHeight);
  }

  /**
   * Resolves vehicle physics step including lateral tire slide, spring suspension, and slope gravity.
   */
  public update(params: VehicleUpdateParams): VehicleState {
    const { keysPressed, currentPos, currentAngle, currentVelocity, steerAngle, delta, solidBounds, modelType } = params;

    // Adjust variables based on vehicle model
    let maxSpeed = 16.5; 
    let maxReverseSpeed = -6.0;
    let enginePower = 16.5; 
    let brakeForce = 32.0;
    let baseFriction = 1.9;

    if (modelType === 'hilux') {
      maxSpeed = 18.0; // Sporty and fast
      enginePower = 18.0;
      baseFriction = 2.0;
    } else if (modelType === 'hiace') {
      maxSpeed = 13.0; // Bulky commuter bus
      enginePower = 13.5;
      baseFriction = 1.7;
    } else if (modelType === 'motorcycle') {
      maxSpeed = 23.0; // Super agile and fast motorcycle
      enginePower = 21.0;
      baseFriction = 2.3;
    } else if (modelType === 'aircraft') {
      maxSpeed = 34.0; // Fast aircraft flying over Taiz
      enginePower = 28.0;
      baseFriction = 0.5; // Very low drag once in air
    }

    // 1. Heading vectors
    const forwardVec = new THREE.Vector3(Math.sin(currentAngle), 0, Math.cos(currentAngle)).normalize();
    const rightVec = new THREE.Vector3(forwardVec.z, 0, -forwardVec.x).normalize();

    // 2. Incline Slope Calculations (sampling heights at front & rear of wheelbase)
    const frontSamplePos = currentPos.clone().addScaledVector(forwardVec, this.wheelbase * 0.5);
    const rearSamplePos = currentPos.clone().addScaledVector(forwardVec, -this.wheelbase * 0.5);
    
    const heightFront = this.getTerrainHeight(frontSamplePos.x, frontSamplePos.z);
    const heightRear = this.getTerrainHeight(rearSamplePos.x, rearSamplePos.z);
    
    const heightDelta = heightFront - heightRear;
    const slopeAngle = Math.atan2(heightDelta, this.wheelbase); // pitch of terrain slope

    // 3. Side Slope / Lateral Tilt Calculations (sampling left & right of track width)
    const leftSamplePos = currentPos.clone().addScaledVector(rightVec, this.trackWidth * 0.5);
    const rightSamplePos = currentPos.clone().addScaledVector(rightVec, -this.trackWidth * 0.5);

    const heightLeft = this.getTerrainHeight(leftSamplePos.x, leftSamplePos.z);
    const heightRight = this.getTerrainHeight(rightSamplePos.x, rightSamplePos.z);

    const tiltDelta = heightLeft - heightRight;
    const bankAngle = Math.atan2(tiltDelta, this.trackWidth); // roll of terrain bank

    // 4. Resolve Gravity resistance force (F = m * g * sin(theta))
    // If going uphill, gravity decelerates the car. If going downhill, it accelerates.
    const gravityForce = -this.mass * this.gravity * Math.sin(slopeAngle);
    const slopeAccelResistance = (gravityForce / this.mass) * 1.5; // amplified for gamified challenge on Jebel Saber

    // 5. Apply Inputs for Velocity
    let targetVelocity = currentVelocity;
    let acceleration = 0;
    const isHandbraking = keysPressed['handbrake'] || keysPressed[' '];

    if (isHandbraking) {
      // Powerful rear wheel lock handbrake
      acceleration = -brakeForce * 1.8;
      if (currentVelocity > 0.05) {
        targetVelocity = Math.max(0, currentVelocity + acceleration * delta);
      } else if (currentVelocity < -0.05) {
        targetVelocity = Math.min(0, currentVelocity - acceleration * delta);
      } else {
        targetVelocity = 0;
      }
    } else if (keysPressed['w']) {
      // Accelerating
      acceleration = enginePower + slopeAccelResistance;
      targetVelocity += acceleration * delta;
      targetVelocity = Math.min(maxSpeed, targetVelocity);
    } else if (keysPressed['s']) {
      if (currentVelocity > 0.3) {
        // Active Braking
        acceleration = -brakeForce;
        targetVelocity += acceleration * delta;
        targetVelocity = Math.max(0, targetVelocity);
      } else {
        // Reverse
        acceleration = -enginePower * 0.7 + slopeAccelResistance;
        targetVelocity += acceleration * delta;
        targetVelocity = Math.max(maxReverseSpeed, targetVelocity);
      }
    } else {
      // Natural Deceleration & Friction Roll
      const rollDecel = baseFriction + Math.abs(slopeAccelResistance * 0.2);
      if (currentVelocity > 0.05) {
        targetVelocity = Math.max(0, currentVelocity - rollDecel * delta);
      } else if (currentVelocity < -0.05) {
        targetVelocity = Math.min(0, currentVelocity + rollDecel * delta);
      } else {
        targetVelocity = 0;
      }
    }

    // 6. Realistic Lateral Tire Slip & Drift Model
    // High speeds and turning triggers centrifugal slide
    const turnIntensity = Math.abs(steerAngle);
    const speedRatio = Math.abs(targetVelocity) / maxSpeed;
    // Hand brake amplifies sliding drift potential!
    const centrifugalForce = speedRatio * speedRatio * turnIntensity * 12.0 + (isHandbraking ? 6.0 : 0.0);

    const driftThreshold = isHandbraking ? 1.5 : 3.5;
    const isDrifting = centrifugalForce > driftThreshold && Math.abs(targetVelocity) > 2.0;
    
    if (isDrifting) {
      this.driftFactor = THREE.MathUtils.lerp(this.driftFactor, 0.65, 3.0 * delta);
    } else {
      this.driftFactor = THREE.MathUtils.lerp(this.driftFactor, 0.0, 5.0 * delta);
    }

    // Adjust steering response at high speed to prevent twitchiness (speed-sensitive steering)
    const speedSteerScaling = 1.0 - (speedRatio * 0.45);
    const effectiveSteerAngle = steerAngle * speedSteerScaling;

    // Angle update influenced by lateral drift slip
    const steeringFactor = targetVelocity * (0.13 - this.driftFactor * 0.05);
    let updatedAngle = currentAngle + effectiveSteerAngle * steeringFactor * delta;

    // Keep angle wrapped cleanly
    updatedAngle = (updatedAngle + Math.PI * 2) % (Math.PI * 2);

    // 7. Dynamic Translation & Collision Checks
    const slideAngleOffset = effectiveSteerAngle * this.driftFactor * 0.7;
    const movementAngle = updatedAngle + slideAngleOffset;

    const nextX = currentPos.x + Math.sin(movementAngle) * targetVelocity * delta;
    const nextZ = currentPos.z + Math.cos(movementAngle) * targetVelocity * delta;
    let nextY = this.getTerrainHeight(nextX, nextZ);

    if (modelType === 'aircraft') {
      let flightAlt = currentPos.y;
      // Allow player to fly up using 'q' / 'Shift' / ' ' (Space) and down using 'e' / 'Control' / 'c'
      if (keysPressed['Shift'] || keysPressed['q'] || keysPressed[' '] || keysPressed['space']) {
        flightAlt += 15.0 * delta; // Rise
      }
      if (keysPressed['Control'] || keysPressed['e'] || keysPressed['c']) {
        flightAlt -= 15.0 * delta; // Descend
      }
      // Ensure aircraft stays above ground plus minimal clearance
      const minAltitude = this.getTerrainHeight(nextX, nextZ) + 0.35;
      nextY = Math.max(minAltitude, flightAlt);
    }

    let collisionDetected = false;
    const carRadius = 1.35;

    for (const solid of solidBounds) {
      // Set values of pre-allocated reusable vector/box objects
      this.carMinTmp.set(nextX - carRadius, nextY, nextZ - carRadius);
      this.carMaxTmp.set(nextX + carRadius, nextY + 2.3, nextZ + carRadius);
      this.carBoxTmp.set(this.carMinTmp, this.carMaxTmp);

      if (this.carBoxTmp.intersectsBox(solid.box)) {
        collisionDetected = true;
        break;
      }
    }

    // Map outer boundaries (500x500m world has a radius/extent of 250m)
    const distanceFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
    if (distanceFromCenter > 250) {
      collisionDetected = true;
    }

    const finalPos = new THREE.Vector3();
    let finalVelocity = targetVelocity;

    if (!collisionDetected) {
      finalPos.set(nextX, nextY, nextZ);
    } else {
      // Hard impact bounce & slide deceleration
      finalPos.copy(currentPos);
      finalVelocity = -currentVelocity * 0.35;
    }

    // 8. Body Suspension Spring Dynamics (Centrifugal roll, acceleration nose-dip)
    // Spring calculations for the 4 wheel shock absorbers
    const offsets = [0, 0, 0, 0];
    const wheelPositions = [
      { x: 0.8, z: 1.4 },  // FL
      { x: -0.8, z: 1.4 }, // FR
      { x: 0.8, z: -1.4 }, // RL
      { x: -0.8, z: -1.4 } // RR
    ];

    // Longitudinal pitch roll (due to braking / acceleration)
    const longAccel = (finalVelocity - this.prevVelocity) / (delta || 0.016);
    this.prevVelocity = finalVelocity;
    const rawPitchOffset = -longAccel * 0.006; // Braking nose dips, accelerating squats
    const dynamicBodyPitch = THREE.MathUtils.clamp(rawPitchOffset + slopeAngle, -0.35, 0.35);

    // Centrifugal body roll (due to high speed turns)
    const rawRollOffset = -finalVelocity * effectiveSteerAngle * 0.012;
    const dynamicBodyRoll = THREE.MathUtils.clamp(rawRollOffset + bankAngle, -0.32, 0.32);

    // Bumpy ride simulations over cobblestones/market tiles (Hooke's Law spring simulation)
    for (let i = 0; i < 4; i++) {
      const wp = wheelPositions[i];
      // Sample local height at individual wheel positions to calculate true bump offset
      const wheelWorldPos = finalPos.clone()
        .addScaledVector(forwardVec, wp.z)
        .addScaledVector(rightVec, wp.x);
      
      const groundAtWheel = this.getTerrainHeight(wheelWorldPos.x, wheelWorldPos.z);
      const relativeBump = groundAtWheel - finalPos.y; // positive if wheel is over sidewalk or terrace ridge

      // Solve spring: F = -k * x - c * v
      const springForce = -this.springK * (this.suspensionCompression[i] - relativeBump);
      const dampingForce = -this.dampC * this.suspensionVelocity[i];
      const suspensionAccel = (springForce + dampingForce) / (this.mass * 0.25);

      this.suspensionVelocity[i] += suspensionAccel * delta;
      this.suspensionCompression[i] += this.suspensionVelocity[i] * delta;
      
      // Keep offsets locked in safe boundaries
      offsets[i] = THREE.MathUtils.clamp(this.suspensionCompression[i], -0.25, 0.25);
    }

    // 9. Sound pitch synthesis factor
    const pitchFactor = 1.0 + (Math.abs(finalVelocity) / maxSpeed) * 1.5 + (isDrifting ? 0.3 : 0);

    return {
      position: finalPos,
      angle: updatedAngle,
      velocity: finalVelocity,
      steerAngle: steerAngle,
      bodyRoll: dynamicBodyRoll,
      bodyPitch: dynamicBodyPitch,
      suspensionOffsets: offsets,
      isDrifting: isDrifting,
      enginePitchFactor: pitchFactor
    };
  }
}
