# Drift Third Person Test V3.8.1

Bug fix for V3.8 black screen.

Cause:
- rearSlipAngle was referenced before it was calculated.
- That caused a JavaScript ReferenceError on the first physics frame.

Fix:
- Front and rear axle slip angles are now calculated before rear tire memory and force calculations.
- Duplicate later declarations removed.
- V3.8 separate front/rear axle force and yaw model retained.
- Bottom-center version: V3.8.1 3D TEST.

Upload all five files together.
