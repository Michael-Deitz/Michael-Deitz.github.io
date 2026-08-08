window.CAR_CONFIG={
  id:"base-coupe-01",
  name:"Base Coupe",
  chassis:{mass:1180,wheelbase:2.52,trackWidth:1.52,yawInertia:1780,cgToFrontAxle:1.12,cgToRearAxle:1.40},
  steering:{gripMaxAngleDeg:28,driftMaxAngleDeg:60,inputSpeedDegPerSec:150,returnSpeedDegPerSec:210},
  drivetrain:{type:"locked",diffLock:1},
  engine:{driveForce:9600,reverseForce:9600,topSpeedMps:33,rollingResistance:.992},
  brakes:{footBrakeForce:19000,handbrakeGripMultiplier:.135,handbrakeForce:7700},
  tires:{
    // FRONT: intentionally simple for now.
    frontGrip:11.5,
    frontPeakSlipDeg:9,
    frontContactPatch:1.0,
    frontCorneringGain:10.5,
    frontMaxLatAccel:10.8,
    frontForceBuildRate:5.2,
    frontForceReleaseRate:7.0,
    frontLowSpeedCutoffMps:1.2,
    frontFullEffectMps:5.0,
    rearCorneringGain:8.2,
    rearMaxLatAccel:9.0,

    // REAR BASE
    rearGrip:6.8,
    driftRearGrip:2.5,
    rearMinimumGrip:.30,
    rearWheelRadius:.36,

    // REAR SLIP CURVE
    rearPeakSlipDeg:11,
    rearPlateauStartDeg:14,
    rearPlateauEndDeg:28,
    rearPlateauGrip:.74,
    rearFalloffEndDeg:52,
    rearFalloffGrip:.40,

    // REAR WHEELSPIN / LOCKED DIFF
    rearWheelSpinBuild:8.5,
    rearWheelSpinDecay:3.2,
    rearWheelSpinGripStart:.10,
    rearWheelSpinGripFull:.55,
    rearWheelSpinMinGrip:.72,

    // REAR LOAD / SUSPENSION
    gravity:9.81,
    groundRollingDrag:0.60,
    groundLateralDrag:0.45,
    staticStopSpeedMps:.22,
    staticStopYawRate:.08,
    cgHeight:.50,
    lateralTransferGain:.82,
    longitudinalTransferGain:.36,
    flickTransferBoost:0,
    flickTransferDecay:0,
    rearStaticLoadBias:.52,
    rearSpringRate:1.0,
    rearDampingRate:4.5,
    rearLoadSensitivity:.20,
    rearLoadStateMin:.72,
    rearLoadStateMax:1.20,

    // REAR TIRE PRESSURE
    rearPressurePsi:28,
    rearPressureOptimalPsi:26,
    rearPressureGripPerPsi:.018,
    rearPressureMinMultiplier:.84,
    rearPressureMaxMultiplier:1.10,

    // EXISTING MEMORY / EFFECTS
    rearSlipBuildRate:3.6,
    rearSlipRecoveryRate:.34
  },
  states:{
    entryDuration:.34,
    transitionDuration:.48,
    transitionBuffer:.28,
    transitionYaw:2.20,
    holdYaw:.92
  },
  camera:{distance:7.4,height:3.2,lookAhead:3.2,smoothing:5.2},
  visuals:{bodyColor:0xa92331}
};