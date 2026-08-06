# Drift Handling State Machine V3.0

Clean state-machine layer added above the four-tire physics.

States:
- GRIP
- ENTRY
- HOLD
- TRANSITION
- EXIT

Important behavior:
- Opposite steering input can immediately enter TRANSITION.
- Rear tire slip memory is preserved during TRANSITION.
- Each state has its own front grip, rear grip, yaw torque, damping, and duration.
- Grip steering and drift steering have different maximum angles.
- Debug HUD shows state, front/rear slip, steering angle, transfer, and left/right rear tire memory.

Upload all five files:
- index.html
- style.css
- car-config.js
- app.js
- manifest.json
