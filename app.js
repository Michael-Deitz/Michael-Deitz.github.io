(()=>{'use strict';
const C=window.CAR_CONFIG;
const host=document.getElementById('game');
const loading=document.getElementById('loading');
const rotate=document.getElementById('rotateScreen');
const speedEl=document.getElementById('speed');
const angleEl=document.getElementById('angle');
const stateEl=document.getElementById('state');
const gripEl=document.getElementById('grip');
const wheelspinEl=document.getElementById('wheelspin');
const latGEl=document.getElementById('latG');
const rearLoadEl=document.getElementById('rearLoad');
const rearPressureEl=document.getElementById('rearPressure');
const axleSlipEl=document.getElementById('axleSlip');

if(!window.THREE){
  loading.textContent='3D LIBRARY DID NOT LOAD';
  return;
}

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91b6d6);
scene.fog=new THREE.Fog(0x91b6d6,35,95);

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
host.appendChild(renderer.domElement);

const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);

scene.add(new THREE.HemisphereLight(0xffffff,0x4a563f,2.0));
const sun=new THREE.DirectionalLight(0xffffff,2.1);
sun.position.set(-12,20,8);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
scene.add(sun);

const ground=new THREE.Mesh(
  new THREE.PlaneGeometry(85,85),
  new THREE.MeshStandardMaterial({color:0x3b3d40,roughness:.95})
);
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

const grass=new THREE.Mesh(
  new THREE.PlaneGeometry(140,140),
  new THREE.MeshStandardMaterial({color:0x496f42,roughness:1})
);
grass.rotation.x=-Math.PI/2;grass.position.y=-.035;scene.add(grass);

const grid=new THREE.GridHelper(80,40,0x777777,0x555555);
grid.position.y=.012;scene.add(grid);

const ring=new THREE.Mesh(
  new THREE.RingGeometry(5.5,7.2,64),
  new THREE.MeshBasicMaterial({color:0xd84a3e,side:THREE.DoubleSide})
);
ring.rotation.x=-Math.PI/2;ring.position.set(0,.018,-10);scene.add(ring);

const carGroup=new THREE.Group();
const visualGroup=new THREE.Group();
visualGroup.rotation.y=Math.PI;
carGroup.add(visualGroup);
scene.add(carGroup);

const body=new THREE.Mesh(
  new THREE.BoxGeometry(1.65,.48,3.55),
  new THREE.MeshStandardMaterial({color:C.visuals.bodyColor,metalness:.2,roughness:.55})
);
body.position.y=.58;body.castShadow=true;visualGroup.add(body);

const cabin=new THREE.Mesh(
  new THREE.BoxGeometry(1.35,.48,1.55),
  new THREE.MeshStandardMaterial({color:0x17212a,metalness:.05,roughness:.3})
);
cabin.position.set(0,1.0,-.1);cabin.castShadow=true;visualGroup.add(cabin);

const wheelGeometry=new THREE.CylinderGeometry(.36,.36,.30,12);
const wheelMaterial=new THREE.MeshStandardMaterial({color:0x151515,roughness:.9});
const wheelData=[
  {x:-.88,z:-1.12,front:true,driven:false},
  {x: .88,z:-1.12,front:true,driven:false},
  {x:-.88,z: 1.12,front:false,driven:true},
  {x: .88,z: 1.12,front:false,driven:true}
];
const wheels=[];
wheelData.forEach(w=>{
  // Steering pivot rotates around vertical Y.
  const steerPivot=new THREE.Group();
  steerPivot.position.set(w.x,.42,w.z);

  // Rolling pivot rotates around the tire axle (local X).
  const rollPivot=new THREE.Group();

  const mesh=new THREE.Mesh(wheelGeometry,wheelMaterial);
  // CylinderGeometry is built along Y. Rotate it so its axle lies across the car.
  mesh.rotation.z=Math.PI/2;
  mesh.castShadow=true;

  rollPivot.add(mesh);
  steerPivot.add(rollPivot);
  visualGroup.add(steerPivot);

  wheels.push({
    steerPivot,
    rollPivot,
    mesh,
    front:w.front,
    driven:w.driven,
    x:w.x,
    z:w.z
  });
});

const smoke=[];
const smokeGeo=new THREE.SphereGeometry(.16,8,8);
const smokeMat=new THREE.MeshBasicMaterial({color:0xd7d7d7,transparent:true,opacity:.48,depthWrite:false});

const input={left:false,right:false,gas:false,brake:false,hand:false};
const car={
  x:0,z:8,heading:Math.PI,
  vx:0,vz:0,yaw:0,steer:0,
  rearMemory:0,
  rearWheelOmega:0,
  prevVx:0,
  prevVz:0,
  lateralG:0,
  longitudinalG:0,
  transferLoad:0,
  rearLoadState:1
};
const drift={state:'GRIP',timer:0,buffer:0,previousInput:0,transfer:0,lastSteerInput:0};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function speed(){return Math.hypot(car.vx,car.vz)}
function landscape(){return innerWidth>innerHeight}

function reset(){
  car.x=0;car.z=8;car.heading=Math.PI;
  car.vx=car.vz=car.yaw=car.steer=car.rearMemory=car.rearWheelOmega=0;
  car.prevVx=car.prevVz=car.lateralG=car.longitudinalG=car.transferLoad=0;car.rearLoadState=1;
  drift.state='GRIP';drift.timer=drift.buffer=drift.transfer=0;drift.previousInput=0;drift.lastSteerInput=0;
  smoke.forEach(s=>scene.remove(s.mesh));smoke.length=0;
}

function syncOrientation(){
  const land=landscape();
  document.body.classList.toggle('portrait',!land);
  rotate.classList.toggle('hidden',land);
}
function resize(){
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);syncOrientation();
}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>setTimeout(resize,250));
resize();

function setState(next,time=0){
  drift.state=next;drift.timer=time;
}

function updateState(dt,forwardSpeed,slipAngle){
  const direction=(input.right?1:0)-(input.left?1:0);
  const reversed=direction&&drift.previousInput&&direction!==drift.previousInput;
  if(direction)drift.previousInput=direction;

  if(reversed&&Math.abs(forwardSpeed)>5&&Math.abs(slipAngle)>.08){
    setState('TRANSITION',C.states.transitionDuration);
    drift.buffer=C.states.transitionBuffer;drift.transfer=1;
  }

  if(drift.state==='GRIP'){
    drift.transfer=Math.max(0,drift.transfer-dt*2);
    if(
      Math.abs(forwardSpeed)>5 &&
      (
        input.hand ||
        (input.gas && Math.abs(car.steer)>.20 && Math.abs(slipAngle)>.06) ||
        Math.abs(slipAngle)>.12
      )
    ){
      setState('ENTRY',C.states.entryDuration);
    }
  }else if(drift.state==='ENTRY'){
    drift.timer-=dt;drift.transfer=Math.min(1,drift.transfer+dt*3);
    if(Math.abs(slipAngle)>.16)setState('HOLD');
    else if(drift.timer<=0)setState(Math.abs(slipAngle)>.1?'HOLD':'GRIP');
  }else if(drift.state==='HOLD'){
    drift.transfer=Math.max(.25,drift.transfer-dt*.4);
    if(!input.gas&&Math.abs(slipAngle)<.1)setState('EXIT',.32);
  }else if(drift.state==='TRANSITION'){
    drift.timer-=dt;drift.buffer=Math.max(0,drift.buffer-dt);drift.transfer=Math.max(.65,drift.transfer-dt*.3);
    if(drift.timer<=0)setState(Math.abs(slipAngle)>.1?'HOLD':'EXIT',.32);
  }else if(drift.state==='EXIT'){
    drift.timer-=dt;drift.transfer=Math.max(0,drift.transfer-dt*1.7);
    if(Math.abs(slipAngle)>.16&&input.gas)setState('HOLD');
    else if(drift.timer<=0||Math.abs(slipAngle)<.05)setState('GRIP');
  }
}


function rearSlipCurveMultiplier(slipAngleRad){
  const deg=Math.abs(slipAngleRad)*180/Math.PI;
  const peak=C.tires.rearPeakSlipDeg;
  const plateauStart=C.tires.rearPlateauStartDeg;
  const plateauEnd=C.tires.rearPlateauEndDeg;
  const falloffEnd=C.tires.rearFalloffEndDeg;

  if(deg<=peak){
    // Grip builds toward peak.
    return 0.55+0.45*(deg/Math.max(1,peak));
  }

  if(deg<=plateauStart){
    const t=(deg-peak)/Math.max(1,plateauStart-peak);
    return 1-(1-C.tires.rearPlateauGrip)*t;
  }

  if(deg<=plateauEnd){
    return C.tires.rearPlateauGrip;
  }

  if(deg<=falloffEnd){
    const t=(deg-plateauEnd)/Math.max(1,falloffEnd-plateauEnd);
    return C.tires.rearPlateauGrip+
      (C.tires.rearFalloffGrip-C.tires.rearPlateauGrip)*t;
  }

  return C.tires.rearFalloffGrip;
}

function rearPressureMultiplier(){
  const delta=C.tires.rearPressureOptimalPsi-C.tires.rearPressurePsi;
  const mult=1+delta*C.tires.rearPressureGripPerPsi;
  return clamp(
    mult,
    C.tires.rearPressureMinMultiplier,
    C.tires.rearPressureMaxMultiplier
  );
}

function update(dt){
  const f={x:Math.sin(car.heading),z:Math.cos(car.heading)};
  const r={x:Math.cos(car.heading),z:-Math.sin(car.heading)};
  const forwardSpeed=car.vx*f.x+car.vz*f.z;
  const lateralSpeed=car.vx*r.x+car.vz*r.z;
  const slipAngle=Math.atan2(lateralSpeed,Math.abs(forwardSpeed)+.1);

  // Measure chassis acceleration from actual velocity change.
  const ax=(car.vx-car.prevVx)/Math.max(dt,.001);
  const az=(car.vz-car.prevVz)/Math.max(dt,.001);
  car.prevVx=car.vx;
  car.prevVz=car.vz;

  const lateralAccel=ax*r.x+az*r.z;
  const longitudinalAccel=ax*f.x+az*f.z;

  // V3.9 baseline test: no artificial steering-flick load.
  car.transferLoad=0;

  // Smooth displayed/used G values to avoid frame noise.
  const rawLatG=lateralAccel/C.tires.gravity;
  const rawLongG=longitudinalAccel/C.tires.gravity;
  const gBlend=1-Math.exp(-9*dt);
  car.lateralG+=(rawLatG-car.lateralG)*gBlend;
  car.longitudinalG+=(rawLongG-car.longitudinalG)*gBlend;

  // Rear wheel speed is now separate from road speed.
  // A locked diff means both rear tires share the same wheel speed.
  const roadOmega=Math.abs(forwardSpeed)/C.tires.rearWheelRadius;

  if(input.gas){
    car.rearWheelOmega+=C.tires.rearWheelSpinBuild*dt;
  }else{
    car.rearWheelOmega+=(
      roadOmega-car.rearWheelOmega
    )*Math.min(1,C.tires.rearWheelSpinDecay*dt);
  }

  // Handbrake rapidly forces the rear wheels toward lock.
  if(input.hand){
    car.rearWheelOmega+=(
      0-car.rearWheelOmega
    )*Math.min(1,10*dt);
  }

  // Keep wheel speed from going negative in this simple locked-diff model.
  car.rearWheelOmega=Math.max(0,car.rearWheelOmega);

  const wheelSurfaceSpeed=
    car.rearWheelOmega*C.tires.rearWheelRadius;

  const wheelspinRatio=
    Math.max(
      0,
      (wheelSurfaceSpeed-Math.abs(forwardSpeed))/
      Math.max(2,Math.abs(forwardSpeed))
    );

  updateState(dt,forwardSpeed,slipAngle);

  const steerInput=(input.left?1:0)-(input.right?1:0);
  const drifting=drift.state==='ENTRY'||drift.state==='HOLD'||drift.state==='TRANSITION';
  const maxSteer=(drifting?C.steering.driftMaxAngleDeg:C.steering.gripMaxAngleDeg)*Math.PI/180;
  const target=steerInput*maxSteer;
  const rate=(Math.abs(target)<Math.abs(car.steer)?C.steering.returnSpeedDegPerSec:C.steering.inputSpeedDegPerSec)*Math.PI/180;
  car.steer += clamp(target-car.steer,-rate*dt,rate*dt);

  // Calculate front and rear axle slip angles before any rear tire logic uses them.
  const frontLatSpeed =
    lateralSpeed +
    car.yaw*C.chassis.cgToFrontAxle;

  const rearLatSpeed =
    lateralSpeed -
    car.yaw*C.chassis.cgToRearAxle;

  const frontSlipAngle =
    Math.atan2(
      frontLatSpeed,
      Math.abs(forwardSpeed)+.75
    ) +
    car.steer;

  const rearSlipAngle =
    Math.atan2(
      rearLatSpeed,
      Math.abs(forwardSpeed)+.75
    );

  if(input.gas&&forwardSpeed<C.engine.topSpeedMps){
    car.vx+=f.x*(C.engine.driveForce/C.chassis.mass)*dt;
    car.vz+=f.z*(C.engine.driveForce/C.chassis.mass)*dt;
  }

  if(input.brake){
    if(forwardSpeed>.7){
      const m=speed()||1;
      car.vx-=car.vx/m*(C.brakes.footBrakeForce/C.chassis.mass)*dt;
      car.vz-=car.vz/m*(C.brakes.footBrakeForce/C.chassis.mass)*dt;
    }else if(forwardSpeed>-C.engine.topSpeedMps){
      car.vx-=f.x*(C.engine.reverseForce/C.chassis.mass)*dt;
      car.vz-=f.z*(C.engine.reverseForce/C.chassis.mass)*dt;
    }
  }

  let slipDemand=Math.min(
    1,
    Math.abs(rearSlipAngle)/.42 +
    (input.gas?.18:0) +
    (input.hand?.55:0) +
    wheelspinRatio*.95
  );

  if(slipDemand>.18){
    car.rearMemory=Math.min(
      1,
      car.rearMemory+
      C.tires.rearSlipBuildRate*slipDemand*dt
    );
  }
  else if(drift.state==='TRANSITION')car.rearMemory=Math.max(.82,car.rearMemory);
  else car.rearMemory=Math.max(0,car.rearMemory-C.tires.rearSlipRecoveryRate*(input.gas?.18:1)*dt);

  // ----- REAR TIRE MODEL -----
  // 1) Vertical load state from chassis G + suspension response.
  const lateralTransfer =
    Math.abs(car.lateralG)*C.tires.lateralTransferGain +
    car.transferLoad;

  const longitudinalTransfer =
    car.longitudinalG*C.tires.longitudinalTransferGain;

  const targetRearLoad=clamp(
    C.tires.rearStaticLoadBias +
    longitudinalTransfer -
    lateralTransfer*C.tires.rearLoadSensitivity,
    C.tires.rearLoadStateMin,
    C.tires.rearLoadStateMax
  );

  const loadBlend=1-Math.exp(-C.tires.rearDampingRate*dt);
  car.rearLoadState+=(
    targetRearLoad-car.rearLoadState
  )*loadBlend*C.tires.rearSpringRate;

  // 3) Tire pressure shifts available grip.
  const pressureMult=rearPressureMultiplier();

  // 4) Wheelspin reduces available friction capacity, but does not command yaw.
  const spinT=clamp(
    (wheelspinRatio-C.tires.rearWheelSpinGripStart)/
    Math.max(.01,C.tires.rearWheelSpinGripFull-C.tires.rearWheelSpinGripStart),
    0,
    1
  );

  const spinGripMultiplier=
    1-spinT*(1-C.tires.rearWheelSpinMinGrip);

  // 5) Existing rear slip memory smooths transitions.
  const memoryMultiplier=
    1-(1-C.tires.rearMinimumGrip)*car.rearMemory;

  // ----- AXLE FORCE / YAW MODEL -----
  // Front/rear slip angles were calculated above so rear memory and axle forces
  // use the same values for this frame.

  // Simple front tire: linear build, then capped lateral acceleration.
  const frontSlipRatio=clamp(
    Math.abs(frontSlipAngle)/
    Math.max(.01,C.tires.frontPeakSlipDeg*Math.PI/180),
    0,
    1
  );

  let frontLatAccel=
    -frontSlipAngle*
    C.tires.frontCorneringGain*
    C.tires.frontContactPatch;

  frontLatAccel=clamp(
    frontLatAccel,
    -C.tires.frontMaxLatAccel,
    C.tires.frontMaxLatAccel
  );

  // Rear tire: continuous slip curve + load + pressure + wheelspin.
  const rearCurve=rearSlipCurveMultiplier(rearSlipAngle);

  const rearCapacity=
    C.tires.rearMaxLatAccel *
    rearCurve *
    pressureMult *
    spinGripMultiplier *
    memoryMultiplier *
    car.rearLoadState *
    (input.hand?C.brakes.handbrakeGripMultiplier:1);

  let rearLatAccel=
    -rearSlipAngle*
    C.tires.rearCorneringGain;

  rearLatAccel=clamp(
    rearLatAccel,
    -rearCapacity,
    rearCapacity
  );

  // Static axle load shares convert axle acceleration capability to force.
  const rearLoadShare=C.tires.rearStaticLoadBias;
  const frontLoadShare=1-rearLoadShare;

  const frontLatForce=
    frontLatAccel*
    C.chassis.mass*
    frontLoadShare;

  const rearLatForce=
    rearLatAccel*
    C.chassis.mass*
    rearLoadShare;

  // Total sideways acceleration redirects the car.
  const totalLatAccel=
    (frontLatForce+rearLatForce)/
    C.chassis.mass;

  car.vx+=r.x*totalLatAccel*dt;
  car.vz+=r.z*totalLatAccel*dt;

  // Forces ahead/behind the CG naturally create chassis rotation.
  // Front left force rotates left; rear left force resists that rotation.
  const yawTorque=
    -frontLatForce*C.chassis.cgToFrontAxle +
     rearLatForce*C.chassis.cgToRearAxle;

  car.yaw+=
    (yawTorque/C.chassis.yawInertia)*
    dt;

  const damping=drifting?.9965:.972;
  car.yaw*=Math.pow(damping,dt*60);
  car.heading+=car.yaw*dt;

  const before=speed();
  car.vx*=Math.pow(C.engine.rollingResistance,dt*60);
  car.vz*=Math.pow(C.engine.rollingResistance,dt*60);

  if(input.gas&&drift.state==='TRANSITION'&&drift.buffer>0){
    const after=speed();
    if(after<before&&after>.001){const k=before/after;car.vx*=k;car.vz*=k;}
  }

  car.x+=car.vx*dt;
  car.z+=car.vz*dt;

  if(Math.abs(car.x)>39){car.x=clamp(car.x,-39,39);car.vx*=-.2}
  if(Math.abs(car.z)>39){car.z=clamp(car.z,-39,39);car.vz*=-.2}

  carGroup.position.set(car.x,0,car.z);
  carGroup.rotation.y=car.heading;
  wheels.forEach(w=>{
    if(w.front)w.steerPivot.rotation.y=car.steer;

    if(w.driven){
      // Driven rear wheels use actual wheel speed and can visibly spin faster.
      w.rollPivot.rotation.x+=car.rearWheelOmega*dt;
    }else{
      // Front wheels roll at road speed.
      const frontOmega=forwardSpeed/C.tires.rearWheelRadius;
      w.rollPivot.rotation.x+=frontOmega*dt;
    }
  });

  if((drifting||input.hand||wheelspinRatio>.12)&&speed()>4&&Math.random()<dt*(30+wheelspinRatio*45)){
    wheels.filter(w=>w.driven).forEach(w=>{
      const local=new THREE.Vector3(w.x,.28,w.z);
      visualGroup.localToWorld(local);
      const puff=new THREE.Mesh(smokeGeo,smokeMat.clone());
      puff.position.copy(local);scene.add(puff);
      smoke.push({mesh:puff,life:.8});
    });
  }
  for(let n=smoke.length-1;n>=0;n--){
    const p=smoke[n];p.life-=dt;p.mesh.position.y+=dt*.45;p.mesh.scale.addScalar(dt*1.4);p.mesh.material.opacity=Math.max(0,p.life*.55);
    if(p.life<=0){scene.remove(p.mesh);smoke.splice(n,1)}
  }

  const carPos=new THREE.Vector3(car.x,1.0,car.z);
  const behind=new THREE.Vector3(-f.x*C.camera.distance,C.camera.height,-f.z*C.camera.distance);
  const desired=carPos.clone().add(behind);
  const smooth=1-Math.exp(-C.camera.smoothing*dt);
  camera.position.lerp(desired,smooth);
  const look=carPos.clone().add(new THREE.Vector3(f.x*C.camera.lookAhead,.35,f.z*C.camera.lookAhead));
  camera.lookAt(look);

  speedEl.textContent=Math.round(speed()*2.237)+' MPH';
  angleEl.textContent=Math.round(Math.abs(slipAngle)*180/Math.PI)+'°';
  stateEl.textContent=drift.state;
  gripEl.textContent='G '+Math.round((1-(1-C.tires.rearMinimumGrip)*car.rearMemory)*100)+'%';
  wheelspinEl.textContent='WS '+Math.round(wheelspinRatio*100)+'%';
  latGEl.textContent='LG '+Math.abs(car.lateralG).toFixed(2);
  rearLoadEl.textContent='RL '+Math.round(car.rearLoadState*100)+'%';
  rearPressureEl.textContent='RP '+C.tires.rearPressurePsi;
  axleSlipEl.textContent='F/R '+Math.round(Math.abs(frontSlipAngle)*180/Math.PI)+'/'+Math.round(Math.abs(rearSlipAngle)*180/Math.PI);
}

function bind(id,key){
  const b=document.getElementById(id);
  const down=e=>{e.preventDefault();input[key]=true;try{b.setPointerCapture(e.pointerId)}catch(_){}};
  const up=e=>{e.preventDefault();input[key]=false};
  b.addEventListener('pointerdown',down,{passive:false});
  b.addEventListener('pointerup',up,{passive:false});
  b.addEventListener('pointercancel',up,{passive:false});
  b.addEventListener('lostpointercapture',up,{passive:false});
}
bind('left','left');bind('right','right');bind('gas','gas');bind('brake','brake');bind('hand','hand');
document.getElementById('resetBtn').addEventListener('pointerdown',e=>{e.preventDefault();reset()},{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault(),{passive:false});
document.addEventListener('selectstart',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
document.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});

let lastTouchEnd=0;
document.addEventListener('touchend',e=>{
  const now=Date.now();
  if(now-lastTouchEnd<350){
    e.preventDefault();
  }
  lastTouchEnd=now;
},{passive:false});

reset();
let last=performance.now();
function loop(now){
  const dt=Math.min((now-last)/1000,.025);last=now;
  if(landscape())update(dt);
  renderer.render(scene,camera);
  requestAnimationFrame(loop);
}
loading.style.display='none';
requestAnimationFrame(loop);
})();