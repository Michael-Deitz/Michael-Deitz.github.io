# Drift Third Person Test V4.2

Neutral-drift yaw fix.

Changes:
- Releasing steering during a drift can no longer force an opposite transition.
- With neutral steering, front lateral force decays instead of immediately rebuilding in the opposite direction.
- Neutral axle torque may reduce existing yaw, but cannot reverse its sign.
- A left drift should keep carrying left until physics naturally settles it or the player commands right steering.
- A right drift behaves the same in the opposite direction.
- Intentional transitions still require opposite steering input.
- All V4.1 tire, ground-friction, wheelspin, suspension/load, pressure, locked-diff, and 3D behavior retained.
- Bottom-center version: V4.2 3D TEST.
