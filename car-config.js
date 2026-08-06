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
    inputSpeedDegPerSec: 220,
    returnSpeedDegPerSec: 260,
    speedReductionStartMps: 18,
    speedReductionAmount: 0.22
  },

  engine: {
    driveForce: 8600,
    reverseForce: 3600,
    topSpeedMps: 31,
    rollingResistance: 0.992
  },

  brakes: {
    footBrakeForce: 12500,
    handbrakeRearGripMultiplier: 0.15
  },

  tires: {
    frontCorneringStiffness: 7300,
    rearCorneringStiffness: 6200,
    frontMaxLateralForce: 7800,
    rearMaxLateralForce: 6200,
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
