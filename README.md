# Drift Handling Reset V2.6

Changes:
- Normal steering behavior from V2.5 is retained.
- Added a combined longitudinal/lateral tire-force limit.
- Front tires no longer convert full-lock scrub into heavy braking.
- Powered rear tires lose lateral grip under throttle and steering demand.
- Rear tires have a smaller combined force budget than the front tires.
- Power oversteer begins above approximately 6.5 m/s.
- Drift yaw damping was reduced slightly.
- Engine power was not reduced.

Testing:
1. Confirm normal low- and medium-speed steering still works.
2. Build speed while holding gas.
3. Apply hard steering.
4. The car should retain momentum and begin rotating the rear outward rather than stopping.
