(()=>{'use strict';

const CFG=window.CAR_CONFIG;
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const speedText=document.getElementById('speed');
const angleText=document.getElementById('angle');
const stateText=document.getElementById('state');
const rotate=document.getElementById('rotateScreen');

let W=0,H=0,D=1,last=performance.now(),raf=0;
let cameraX=0,cameraY=0;

const input={left:false,right:false,gas:false,brake:false,hand:false};

const car={
  x:0,y:0,heading:-Math.PI/2,
  vx:0,vy:0,yawRate:0,
  steerAngle:0
};

let smoke=[],skids=[];

const tires=[
  {name:'FL',x:-CFG.chassis.trackWidth/2,y:-CFG.chassis.cgToFrontAxle,steer:true,drive:false},
  {name:'FR',x: CFG.chassis.trackWidth/2,y:-CFG.chassis.cgToFrontAxle,steer:true,drive:false},
  {name:'RL',x:-CFG.chassis.trackWidth/2,y: CFG.chassis.cgToRearAxle,steer:false,drive:true},
  {name:'RR',x: CFG.chassis.trackWidth/2,y: CFG.chassis.cgToRearAxle,steer:false,drive:true}
];

function isLandscape(){return innerWidth>innerHeight}

function resetCar(){
  car.x=0;car.y=0;car.heading=-Math.PI/2;
  car.vx=0;car.vy=0;car.yawRate=0;car.steerAngle=0;
  cameraX=car.x;cameraY=car.y;
  smoke=[];skids=[];
}

function syncOrientation(){
  const landscape=isLandscape();
  document.body.classList.toggle('portrait',!landscape);
  rotate.classList.toggle('hidden',landscape);
  if(landscape){last=performance.now();startLoop()}
}

function resize(){
  D=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  canvas.width=Math.floor(W*D);canvas.height=Math.floor(H*D);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(D,0,0,D,0,0);
  syncOrientation();draw();
}

addEventListener('resize',resize);
addEventListener('orientationchange',()=>{setTimeout(resize,100);setTimeout(resize,450)});
document.addEventListener('contextmenu',e=>e.preventDefault(),{passive:false});
document.addEventListener('selectstart',e=>e.preventDefault(),{passive:false});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});

function worldToScreen(x,y){return{x:x-cameraX+W/2,y:y-cameraY+H/2}}

function roundedRect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawTrack(){
  ctx.fillStyle='#456d3f';ctx.fillRect(0,0,W,H);
  const p=worldToScreen(0,0);
  ctx.save();ctx.translate(p.x,p.y);

  ctx.fillStyle='#34383d';
  roundedRect(-1250,-850,2500,1700,95);ctx.fill();

  ctx.strokeStyle='#b2b7bb';ctx.lineWidth=10;
  roundedRect(-1245,-845,2490,1690,90);ctx.stroke();

  ctx.fillStyle='#426d40';
  ctx.beginPath();ctx.ellipse(0,-320,185,128,0,0,Math.PI*2);ctx.fill();

  ctx.strokeStyle='#d94b3e';ctx.lineWidth=14;ctx.setLineDash([32,24]);
  ctx.beginPath();ctx.ellipse(0,-320,205,148,0,0,Math.PI*2);ctx.stroke();

  ctx.strokeStyle='#ffffff3b';ctx.lineWidth=4;ctx.setLineDash([25,20]);
  ctx.beginPath();ctx.ellipse(-455,110,330,225,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(455,110,330,225,0,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawEffects(){
  ctx.strokeStyle='#111a';ctx.lineWidth=3;
  for(const mark of skids){
    const a=worldToScreen(mark.x1,mark.y1),b=worldToScreen(mark.x2,mark.y2);
    ctx.globalAlpha=Math.min(1,mark.life/2);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.globalAlpha=1;

  for(const puff of smoke){
    const p=worldToScreen(puff.x,puff.y);
    ctx.globalAlpha=Math.max(0,puff.life);
    ctx.fillStyle='#ddd';
    ctx.beginPath();ctx.arc(p.x,p.y,puff.radius,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawCar(){
  const p=worldToScreen(car.x,car.y);
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(car.heading+Math.PI/2);

  const scale=26;
  const bodyW=CFG.chassis.trackWidth*scale;
  const bodyL=CFG.chassis.wheelbase*scale+16;

  ctx.fillStyle='rgba(0,0,0,.28)';
  roundedRect(-bodyW/2+5,-bodyL/2+6,bodyW,bodyL,7);ctx.fill();

  ctx.fillStyle=CFG.visuals.bodyColor;
  roundedRect(-bodyW/2,-bodyL/2,bodyW,bodyL,7);ctx.fill();

  ctx.fillStyle='#101820';
  roundedRect(-bodyW*.34,-bodyL*.17,bodyW*.68,bodyL*.30,4);ctx.fill();

  ctx.fillStyle='#151515';
  for(const tire of tires){
    const tx=tire.x*scale;
    const ty=tire.y*scale;
    ctx.save();
    ctx.translate(tx,ty);
    if(tire.steer)ctx.rotate(car.steerAngle);
    ctx.fillRect(-4,-9,8,18);
    ctx.restore();
  }

  ctx.restore();
}

function rotateVector(x,y,a){
  return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function magnitude(x,y){return Math.hypot(x,y)}

function updateSteering(dt,forwardSpeed){
  const targetInput=(input.right?1:0)-(input.left?1:0);
  const maxBase=CFG.steering.maxAngleDeg*Math.PI/180;

  const reduction=forwardSpeed>CFG.steering.speedReductionStartMps
    ? CFG.steering.speedReductionAmount
    : 0;

  const maxAngle=maxBase*(1-reduction);
  const target=targetInput*maxAngle;

  const movingTowardCenter=Math.abs(target)<Math.abs(car.steerAngle);
  const rate=(movingTowardCenter?CFG.steering.returnSpeedDegPerSec:CFG.steering.inputSpeedDegPerSec)*Math.PI/180;

  if(car.steerAngle<target)car.steerAngle=Math.min(target,car.steerAngle+rate*dt);
  else if(car.steerAngle>target)car.steerAngle=Math.max(target,car.steerAngle-rate*dt);
}

function update(dt){
  const heading=car.heading;
  const forward={x:Math.cos(heading),y:Math.sin(heading)};
  const right={x:Math.cos(heading+Math.PI/2),y:Math.sin(heading+Math.PI/2)};

  const bodyForwardSpeed=car.vx*forward.x+car.vy*forward.y;
  const bodyLateralSpeed=car.vx*right.x+car.vy*right.y;

  updateSteering(dt,Math.abs(bodyForwardSpeed));

  let totalFx=0,totalFy=0,totalTorque=0;
  let averageRearSlip=0;
  let frontSlipTotal=0;
  let rearSlipTotal=0;

  for(const tire of tires){
    const tireWorldOffset=rotateVector(tire.x*26,tire.y*26,heading);
    const rx=tireWorldOffset.x/26;
    const ry=tireWorldOffset.y/26;

    const pointVx=car.vx-car.yawRate*ry;
    const pointVy=car.vy+car.yawRate*rx;

    const tireHeading=heading+(tire.steer?car.steerAngle:0);
    const tireForward={x:Math.cos(tireHeading),y:Math.sin(tireHeading)};
    const tireRight={x:Math.cos(tireHeading+Math.PI/2),y:Math.sin(tireHeading+Math.PI/2)};

    const longSpeed=pointVx*tireForward.x+pointVy*tireForward.y;
    const latSpeed=pointVx*tireRight.x+pointVy*tireRight.y;
    const slipAngle=Math.atan2(latSpeed,Math.abs(longSpeed)+0.75);

    let stiffness=tire.steer?CFG.tires.frontCorneringStiffness:CFG.tires.rearCorneringStiffness;
    let maxLateral=tire.steer?CFG.tires.frontMaxLateralForce:CFG.tires.rearMaxLateralForce;

    let driveForce=0;
    if(tire.drive && input.gas){
      driveForce=CFG.engine.driveForce/2;

      const driveSlip=Math.abs(driveForce)/(CFG.engine.driveForce*.5);
      if(driveSlip>CFG.tires.rearDriveSlipStart){
        maxLateral*=CFG.tires.rearDriveGripMultiplier;
      }
    }

    if(tire.drive && input.hand){
      maxLateral*=CFG.brakes.handbrakeRearGripMultiplier;
    }

    let lateralForce=clamp(-slipAngle*stiffness,-maxLateral,maxLateral);

    if(Math.abs(longSpeed)<2){
      lateralForce*=CFG.tires.lowSpeedAssist;
    }

    let brakeForce=0;
    if(input.brake){
      const sign=Math.sign(longSpeed||1);
      brakeForce=-sign*CFG.brakes.footBrakeForce/4;
    }

    if(tire.drive && input.brake && bodyForwardSpeed<1){
      brakeForce=-CFG.engine.reverseForce/2;
    }

    const fx=tireForward.x*(driveForce+brakeForce)+tireRight.x*lateralForce;
    const fy=tireForward.y*(driveForce+brakeForce)+tireRight.y*lateralForce;

    totalFx+=fx;
    totalFy+=fy;
    totalTorque+=rx*fy-ry*fx;

    if(tire.steer)frontSlipTotal+=Math.abs(slipAngle);
    else{
      rearSlipTotal+=Math.abs(slipAngle);
      averageRearSlip+=Math.abs(slipAngle)/2;
    }
  }

  car.vx+=(totalFx/CFG.chassis.mass)*dt;
  car.vy+=(totalFy/CFG.chassis.mass)*dt;
  car.yawRate+=(totalTorque/CFG.chassis.yawInertia)*dt;

  const drifting=averageRearSlip>0.18&&Math.abs(bodyForwardSpeed)>5;
  const yawDamping=drifting?CFG.assists.yawDampingDrift:CFG.assists.yawDampingGrip;
  car.yawRate*=Math.pow(yawDamping,dt*60);

  const slipSign=Math.sign(bodyLateralSpeed);
  const steerSign=Math.sign(car.steerAngle);

  if(drifting && slipSign!==0 && steerSign===-slipSign){
    car.yawRate*=1-CFG.assists.countersteerAssist*dt;
  }

  const maxYaw=CFG.assists.driftAngleLimitDeg*Math.PI/180;
  car.yawRate=clamp(car.yawRate,-maxYaw,maxYaw);

  car.heading+=car.yawRate*dt;

  const roll=CFG.engine.rollingResistance;
  car.vx*=Math.pow(roll,dt*60);
  car.vy*=Math.pow(roll,dt*60);

  car.x+=car.vx*26*dt;
  car.y+=car.vy*26*dt;

  if(Math.abs(car.x)>1190){car.x=Math.sign(car.x)*1190;car.vx*=-.18}
  if(Math.abs(car.y)>800){car.y=Math.sign(car.y)*800;car.vy*=-.18}

  cameraX+=(car.x-cameraX)*Math.min(1,dt*4.2);
  cameraY+=(car.y-cameraY)*Math.min(1,dt*4.2);

  const speed=magnitude(car.vx,car.vy);
  const driftAngle=Math.atan2(bodyLateralSpeed,Math.abs(bodyForwardSpeed)+.01);

  if(drifting){
    const rear=rotateVector(0,CFG.chassis.cgToRearAxle*26,heading);
    const rearX=car.x+rear.x;
    const rearY=car.y+rear.y;

    if(Math.random()<dt*55){
      smoke.push({
        x:rearX+(Math.random()-.5)*16,
        y:rearY+(Math.random()-.5)*16,
        radius:6+Math.random()*8,
        life:.9
      });
    }

    skids.push({
      x1:rearX-10*right.x,
      y1:rearY-10*right.y,
      x2:rearX+10*right.x,
      y2:rearY+10*right.y,
      life:12
    });
  }

  smoke.forEach(p=>{p.life-=dt;p.radius+=dt*8});
  smoke=smoke.filter(p=>p.life>0);

  skids.forEach(mark=>mark.life-=dt);
  skids=skids.filter(mark=>mark.life>0);

  speedText.textContent=Math.round(speed*2.237)+' MPH';
  angleText.textContent=Math.round(Math.abs(driftAngle*180/Math.PI))+'°';
  stateText.textContent=drifting?'DRIFT':'GRIP';
}

function draw(){drawTrack();drawEffects();drawCar()}

function loop(time){
  raf=0;
  if(!isLandscape())return;

  const dt=Math.min((time-last)/1000,.025);
  last=time;

  update(dt);
  draw();

  raf=requestAnimationFrame(loop);
}

function startLoop(){if(!raf)raf=requestAnimationFrame(loop)}

function bind(id,key){
  const button=document.getElementById(id);

  const down=e=>{
    e.preventDefault();
    e.stopPropagation();
    input[key]=true;
    if(button.setPointerCapture&&e.pointerId!==undefined){
      try{button.setPointerCapture(e.pointerId)}catch(_){}
    }
  };

  const up=e=>{
    e.preventDefault();
    e.stopPropagation();
    input[key]=false;
    if(button.releasePointerCapture&&e.pointerId!==undefined){
      try{button.releasePointerCapture(e.pointerId)}catch(_){}
    }
  };

  button.addEventListener('pointerdown',down,{passive:false});
  button.addEventListener('pointerup',up,{passive:false});
  button.addEventListener('pointercancel',up,{passive:false});
  button.addEventListener('lostpointercapture',up,{passive:false});
}

bind('left','left');
bind('right','right');
bind('gas','gas');
bind('brake','brake');
bind('hand','hand');

document.getElementById('resetBtn').addEventListener('pointerdown',e=>{
  e.preventDefault();
  resetCar();
  draw();
},{passive:false});

resetCar();
resize();
startLoop();
})();