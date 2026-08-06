window.CAR_CONFIG = {
  id: "base-coupe-01",
  name: "Base Coupe",

  chassis: {
    mass: 1180,
    wheelbase: 2.52,
    trackWidth: 1.52,
    cgToFrontAxle: 1.12,
    cgToRearAxle: 1.40,
    yawInertia: 1280
  },

  steering: {
    maxAngleDeg: 60,
    gripMaxAngleDeg: 28,
    inputSpeedDegPerSec: 150,
    returnSpeedDegPerSec: 210,
    speedReductionStartMps: 4,
    speedReductionFullMps: 18,
    speedReductionAmount: 0.66,
    driftFullLockRearSlipRad: 0.12,
    ackermannStrength: 0.72
  },

  engine: {
    driveForce: 9600,
    reverseForce: 6800,
    topSpeedMps: 33,
    rollingResistance: 0.992
  },

  brakes: {
    footBrakeForce: 19000,
    handbrakeRearGripMultiplier: 0.15,
    handbrakeRearLongitudinalForce: 7000
  },

  tires: {
    frontCorneringStiffness: 14500,
    rearCorneringStiffness: 6800,
    frontMaxLateralForce: 16500,
    rearMaxLateralForce: 7000,
    rearDriveSlipStart: 0.55,
    rearDriveGripMultiplier: 0.48,
    frontCombinedGrip: 1.00,
    rearCombinedGrip: 0.88,
    powerOversteerStartMps: 6.5,
    powerOversteerSteerRad: 0.16,
    powerOversteerRearGripMultiplier: 0.52,
    frontScrubDragMultiplier: 0.015,
    rearThrottleLongitudinalPriority: 0.92,
    maxCoastScrubDecelMps2: 1.35,
    minimumThrottleSpeedRetention: 0.992,
    rearSlipBuildRate: 3.2,
    rearSlipRecoveryRate: 0.48,
    rearSlipThrottleHold: 0.78,
    rearSlipMinimumGripMultiplier: 0.34,
    lowSpeedAssist: 0.35
  },

  assists: {
    countersteerAssist: 0.32,
    yawDampingGrip: 0.9975,
    yawDampingDrift: 0.9992,
    transitionAssist: 0.18,
    transitionBuild: 0.95,
    transitionDecayPerSec: 1.35,
    transitionRearGripMultiplier: 0.58,
    transitionFrontGripMultiplier: 1.12,
    transitionYawTorque: 1450,
    driftAngleLimitDeg: 68
  },

  visuals: {
    bodyColor: "#a92331"
  }
};
