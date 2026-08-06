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
    driftMaxAngleDeg: 60,
    gripMaxAngleDeg: 28,
    inputSpeedDegPerSec: 150,
    returnSpeedDegPerSec: 210,
    speedReductionStartMps: 4,
    speedReductionFullMps: 18,
    speedReductionAmount: 0.66,
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
    frontCombinedGrip: 1.00,
    rearCombinedGrip: 0.88,
    lowSpeedAssist: 0.35,

    rearSlipBuildRate: 3.4,
    rearSlipRecoveryRate: 0.42,
    rearSlipThrottleHold: 0.82,
    rearSlipMinimumGripMultiplier: 0.34,

    maxCoastScrubDecelMps2: 1.10,
    minimumThrottleSpeedRetention: 0.993,
    transitionSpeedRetention: 0.999
  },

  states: {
    grip: {
      enterRearSlipRad: 0.10
    },
    entry: {
      minimumSpeedMps: 5.0,
      durationSec: 0.34,
      rearGripMultiplier: 0.70,
      frontGripMultiplier: 1.08,
      yawTorque: 850
    },
    hold: {
      rearSlipRad: 0.16,
      rearGripMultiplier: 0.63,
      throttleYawTorque: 520,
      countersteerDamping: 0.38
    },
    transition: {
      durationSec: 0.48,
      rearGripMultiplier: 0.52,
      frontGripMultiplier: 1.06,
      yawTorque: 1650,
      rearMemoryFloor: 0.68,
      speedRetention: 0.9994
    },
    exit: {
      durationSec: 0.32,
      rearGripRecoveryMultiplier: 0.46,
      yawDamping: 0.955
    }
  },

  assists: {
    gripYawDamping: 0.9975,
    driftYawDamping: 0.9995,
    driftAngleLimitDeg: 72
  },

  visuals: {
    bodyColor: "#a92331"
  }
};
