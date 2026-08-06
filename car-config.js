window.CAR_CONFIG = {
  id: "base-coupe-01",
  name: "Base Coupe",

  chassis: {
    mass: 1180,
    wheelbase: 2.52,
    trackWidth: 1.52,
    cgToFrontAxle: 1.12,
    cgToRearAxle: 1.40,
    yawInertia: 1750
  },

  steering: {
    maxAngleDeg: 55,
    inputSpeedDegPerSec: 150,
    returnSpeedDegPerSec: 210,
    speedReductionStartMps: 18,
    speedReductionAmount: 0.22
  },

  engine: {
    driveForce: 9600,
    reverseForce: 3600,
    topSpeedMps: 33,
    rollingResistance: 0.992
  },

  brakes: {
    footBrakeForce: 12500,
    handbrakeRearGripMultiplier: 0.15
  },

  tires: {
    frontCorneringStiffness: 9800,
    rearCorneringStiffness: 6500,
    frontMaxLateralForce: 10500,
    rearMaxLateralForce: 6600,
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
