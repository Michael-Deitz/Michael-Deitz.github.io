# Drift Handling Reset V2.5

Root-cause fixes:
- Removed excessive yaw damping that was deleting roughly 12% of chassis rotation per frame.
- Grip-mode steering is limited to 28 degrees.
- Full 60-degree steering lock becomes available when rear slip reaches drift range.
- Existing speed-sensitive steering still applies during grip driving.
- Front tires only smoke under severe high-speed scrub.
- Rear tires create smoke individually from rear slip and wheelspin.
- Added steering-angle HUD: S = current steering angle.

Power was not reduced.

Upload all five files together:
- index.html
- style.css
- car-config.js
- app.js
- manifest.json
