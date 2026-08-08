# Drift Third Person Test V4.0

Physics cleanup focused on ground friction and front tire response.

Changes:
- Steering at 0 mph can no longer rotate the chassis.
- Front lateral force fades in only once the car is moving.
- Front lateral force builds/releases over time instead of appearing instantly.
- Increased chassis yaw inertia.
- Added rolling ground drag.
- Added lateral ground drag.
- Added near-stop velocity/yaw settling to eliminate numerical spinning.
- Axle yaw torque is speed-scaled and vanishes near zero speed.
- Existing front/rear axle slip model, locked diff, rear pressure, suspension/load, wheelspin, 3D camera, reverse, e-brake, round tires, and zoom blocking retained.
- Bottom-center version: V4.0 3D TEST.

Upload all five files together.
