(()=>{'use strict';
const C=window.CAR_CONFIG;
const host=document.getElementById('game');
const loading=document.getElementById('loading');
const rotate=document.getElementById('rotateScreen');
const speedEl=document.getElementById('speed');
const angleEl=document.getElementById('angle');
const stateEl=document.getElementById('state');
const gripEl=document.getElementById('grip');

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
const car={x:0,z:8,heading:Math.PI,vx:0,vz:0,yaw:0,steer:0,rearMemory:0};
const drift={state:'GRIP',timer:0,buffer:0,previousInput:0,transfer:0};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function speed(){return Math.hypot(car.vx,car.vz)}
function landscape(){return innerWidth>innerHeight}

function reset(){
  car.x=0;car.z=8;car.heading=Math.PI;car.vx=car.vz=car.yaw=car.steer=car.rearMemory=0;
  drift.state='GRIP';drift.timer=drift.buffer=drift.transfer=0;drift.previousInput=0;
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
    if(Math.abs(forwardSpeed)>5&&(input.hand||(input.gas&&Math.abs(car.steer)>.12)||Math.abs(slipAngle)>.1)){
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

function update(dt){
  const f={x:Math.sin(car.heading),z:Math.cos(car.heading)};
  const r={x:Math.cos(car.heading),z:-Math.sin(car.heading)};
  const forwardSpeed=car.vx*f.x+car.vz*f.z;
  const lateralSpeed=car.vx*r.x+car.vz*r.z;
  const slipAngle=Math.atan2(lateralSpeed,Math.abs(forwardSpeed)+.1);

  updateState(dt,forwardSpeed,slipAngle);

  const steerInput=(input.left?1:0)-(input.right?1:0);
  const drifting=drift.state==='ENTRY'||drift.state==='HOLD'||drift.state==='TRANSITION';
  const maxSteer=(drifting?C.steering.driftMaxAngleDeg:C.steering.gripMaxAngleDeg)*Math.PI/180;
  const target=steerInput*maxSteer;
  const rate=(Math.abs(target)<Math.abs(car.steer)?C.steering.returnSpeedDegPerSec:C.steering.inputSpeedDegPerSec)*Math.PI/180;
  car.steer += clamp(target-car.steer,-rate*dt,rate*dt);

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

  let slipDemand=Math.min(1,Math.abs(slipAngle)/.42+(input.gas?.24:0)+(input.hand?.55:0));
  if(slipDemand>.22)car.rearMemory=Math.min(1,car.rearMemory+C.tires.rearSlipBuildRate*slipDemand*dt);
  else if(drift.state==='TRANSITION')car.rearMemory=Math.max(.82,car.rearMemory);
  else car.rearMemory=Math.max(0,car.rearMemory-C.tires.rearSlipRecoveryRate*(input.gas?.18:1)*dt);

  let rearGrip=C.tires.rearGrip*(1-(1-C.tires.rearMinimumGrip)*car.rearMemory);
  if(drifting)rearGrip=Math.min(rearGrip,C.tires.driftRearGrip);
  if(input.hand)rearGrip*=C.brakes.handbrakeGripMultiplier;

  const frontCorrection=lateralSpeed*C.tires.frontGrip;
  const rearCorrection=lateralSpeed*rearGrip;
  const correction=(frontCorrection*.38+rearCorrection*.62)*dt;
  car.vx-=r.x*correction;
  car.vz-=r.z*correction;

  const authority=clamp(Math.abs(forwardSpeed)/5,0,1);
  const steeringYawGain=drifting ? 1.15 : 1.95;
  car.yaw+=car.steer*authority*steeringYawGain*dt;

  // Once sideways, chassis rotation follows the direction of the slide.
  // Countersteer now catches/controls yaw instead of directly steering
  // the entire car into the opposite direction.
  const slideDir=Math.sign(slipAngle||car.yaw||car.steer||1);

  if(drift.state==='ENTRY'){
    car.yaw+=slideDir*1.05*drift.transfer*dt;
  }

  if(drift.state==='HOLD'&&input.gas){
    car.yaw+=slideDir*C.states.holdYaw*dt;
  }

  if(drift.state==='TRANSITION'){
    const transitionDir=Math.sign(car.yaw||slipAngle||steerInput||1);
    car.yaw+=transitionDir*C.states.transitionYaw*drift.transfer*dt;
  }

  // Countersteer should catch the car once meaningful angle develops.
  if(drifting && Math.abs(slipAngle)>.18){
    const steerDir=Math.sign(car.steer);
    const slideDirection=Math.sign(slipAngle);

    if(steerDir!==0 && steerDir===-slideDirection){
      car.yaw*=Math.pow(.975,dt*60);
    }
  }

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
    // Front wheels follow the corrected physical steering direction.
    if(w.front)w.steerPivot.rotation.y=car.steer;

    // Tire rolls around its left-to-right axle.
    w.rollPivot.rotation.x+=forwardSpeed*dt*1.6;
  });

  if((drifting||input.hand)&&speed()>4&&Math.random()<dt*35){
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