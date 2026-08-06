# Drift Handling Reset V2.0

This is a clean handling restart.

Files:
- index.html
- style.css
- car-config.js
- app.js
- manifest.json

Important changes:
- One editable per-car configuration file
- Four individual tire contact points
- Individual tire slip-angle calculation
- Front steering tires
- Rear driven tires
- Rear-only handbrake grip reduction
- Chassis mass, wheelbase, track width, and yaw inertia
- No previous drift-level or fake yaw-boost system

Testing target:
- Easy initiation
- Stable 30–60 degree drift
- Natural countersteer
- No endless 360s
- Smooth left/right transitions

Upload all five files together.
