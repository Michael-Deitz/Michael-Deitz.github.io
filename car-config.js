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
    inputSpeedDegPerSec: 150,
    returnSpeedDegPerSec: 210,
    speedReductionStartMps: 4,
    speedReductionFullMps: 18,
    speedReductionAmount: 0.66,
    driftFullLockRearSlipRad: 0.16,
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
    lowSpeedAssist: 0.35
  },

  assists: {
    countersteerAssist: 0.32,
    yawDampingGrip: 0.88,
    yawDampingDrift: 0.965,
    transitionAssist: 0.18,
    driftAngleLimitDeg: 68
  },

  visuals: {
    bodyColor: "#a92331"
  }
};
