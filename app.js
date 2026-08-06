(()=>{'use strict';

const CFG=window.CAR_CONFIG;
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');

const speedText=document.getElementById('speed');
const angleText=document.getElementById('angle');
const stateText=document.getElementById('state');
const frontSlipText=document.getElementById('frontSlip');
const rearSlipText=document.getElementById('rearSlip');
const steerHudText=document.getElementById('steerHud');
const transferHudText=document.getElementById('transferHud');
const rearMemoryHud=document.getElementById('rearMemoryHud');
const rotate=document.getElementById('rotateScreen');

let W=0,H=0,D=1,last=performance.now(),raf=0;
let cameraX=0,cameraY=0;

const input={left:false,right:false,gas:false,brake:false,hand:false};

const car={
  x:0,y:0,heading:-Math.PI/2,
  vx:0,vy:0,yawRate:0,
  steerAngle:0
};

const tires=[
  {name:'FL',lateral:-CFG.chassis.trackWidth/2,longitudinal: CFG.chassis.cgToFrontAxle,steer:true, drive:false,slipMemory:0},
  {name:'FR',lateral: CFG.chassis.trackWidth/2,longitudinal: CFG.chassis.cgToFrontAxle,steer:true, drive:false,slipMemory:0},
  {name:'RL',lateral:-CFG.chassis.trackWidth/2,longitudinal:-CFG.chassis.cgToRearAxle, steer:false,drive:true,slipMemory:0},
  {name:'RR',lateral: CFG.chassis.trackWidth/2,longitudinal:-CFG.chassis.cgToRearAxle, steer:false,drive:true,slipMemory:0}
];

const drift={
  state:'GRIP',
  timer:0,
  transfer:0,
  previousInputDirection:0,
  currentInputDirection:0
};

let smoke=[];
let skids=[];
let previousRearSlip=0;

function isLandscape(){return innerWidth>innerHeight}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function magnitude(x,y){return Math.hypot(x,y)}

function resetCar(){
  car.x=0;car.y=0;car.heading=-Math.PI/2;
  car.vx=0;car.vy=0;car.yawRate=0;car.steerAngle=0;

  drift.state='GRIP';
  drift.timer=0;
  drift.transfer=0;
  drift.previousInputDirection=0;
  drift.currentInputDirection=0;

  tires.forEach(t=>t.slipMemory=0);
  previousRearSlip=0;
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
    const a=worldToScreen(mark.x1,mark.y1);
    const b=worldToScreen(mark.x2,mark.y2);
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

function getFrontWheelSteerAngle(tire){
  const base=car.steerAngle;
  if(!tire.steer||Math.abs(base)<0.001)return 0;

  const direction=Math.sign(base);
  const absBase=Math.abs(base);
  const wheelbase=CFG.chassis.wheelbase;
  const halfTrack=CFG.chassis.trackWidth/2;

  const centerRadius=wheelbase/Math.max(0.05,Math.tan(absBase));
  const isInner=(direction>0&&tire.lateral>0)||(direction<0&&tire.lateral<0);
  const wheelRadius=Math.max(0.2,centerRadius+(isInner?-halfTrack:halfTrack));
  const ackermannAngle=Math.atan(wheelbase/wheelRadius);
  const blended=absBase+(ackermannAngle-absBase)*CFG.steering.ackermannStrength;
  return direction*blended;
}

function drawCar(){
  const p=worldToScreen(car.x,car.y);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(car.heading+Math.PI/2);

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
    const tx=tire.lateral*scale;
    const ty=-tire.longitudinal*scale;
    ctx.save();ctx.translate(tx,ty);
    if(tire.steer)ctx.rotate(getFrontWheelSteerAngle(tire));
    ctx.fillRect(-4,-9,8,18);
    ctx.restore();
  }

  ctx.restore();
}

function updateStateMachine(dt,speed,rearSlip,frontSlip){
  drift.currentInputDirection=(input.right?1:0)-(input.left?1:0);

  const reversed=
    drift.currentInputDirection!==0 &&
    drift.previousInputDirection!==0 &&
    drift.currentInputDirection!==drift.previousInputDirection;

  if(drift.currentInputDirection!==0){
    drift.previousInputDirection=drift.currentInputDirection;
  }

  if(reversed && speed>CFG.states.entry.minimumSpeedMps && rearSlip>0.08){
    drift.state='TRANSITION';
    drift.timer=CFG.states.transition.durationSec;
    drift.transfer=1;
  }

  switch(drift.state){
    case 'GRIP':
      drift.transfer=Math.max(0,drift.transfer-dt*2.5);
      if(
        speed>CFG.states.entry.minimumSpeedMps &&
        (
          input.hand ||
          (input.gas&&Math.abs(car.steerAngle)>0.10) ||
          rearSlip>CFG.states.grip.enterRearSlipRad
        )
      ){
        drift.state='ENTRY';
        drift.timer=CFG.states.entry.durationSec;
      }
      break;

    case 'ENTRY':
      drift.timer-=dt;
      drift.transfer=Math.min(1,drift.transfer+dt*3.0);
      if(rearSlip>CFG.states.hold.rearSlipRad){
        drift.state='HOLD';
        drift.timer=0;
      }else if(drift.timer<=0){
        drift.state=rearSlip>0.10?'HOLD':'GRIP';
      }
      break;

    case 'HOLD':
      drift.transfer=Math.max(0.25,drift.transfer-dt*.45);
      if(!input.gas && rearSlip<0.11){
        drift.state='EXIT';
        drift.timer=CFG.states.exit.durationSec;
      }
      break;

    case 'TRANSITION':
      drift.timer-=dt;
      drift.transfer=Math.max(0.65,drift.transfer-dt*.35);
      if(drift.timer<=0){
        drift.state=rearSlip>0.11?'HOLD':'EXIT';
        drift.timer=drift.state==='EXIT'?CFG.states.exit.durationSec:0;
      }
      break;

    case 'EXIT':
      drift.timer-=dt;
      drift.transfer=Math.max(0,drift.transfer-dt*1.8);
      if(rearSlip>CFG.states.hold.rearSlipRad&&input.gas){
        drift.state='HOLD';
      }else if(drift.timer<=0||rearSlip<0.05){
        drift.state='GRIP';
      }
      break;
  }
}

function updateSteering(dt,forwardSpeed){
  const targetInput=(input.right?1:0)-(input.left?1:0);
  const drifting=drift.state!=='GRIP'&&drift.state!=='EXIT';

  const fullLock=CFG.steering.driftMaxAngleDeg*Math.PI/180;
  let maxAngle=drifting
    ? fullLock
    : CFG.steering.gripMaxAngleDeg*Math.PI/180;

  if(!drifting && forwardSpeed>CFG.steering.speedReductionStartMps){
    const range=Math.max(
      .1,
      CFG.steering.speedReductionFullMps-CFG.steering.speedReductionStartMps
    );
    const t=clamp(
      (forwardSpeed-CFG.steering.speedReductionStartMps)/range,
      0,
      1
    );
    maxAngle*=1-CFG.steering.speedReductionAmount*t;
  }

  const target=targetInput*maxAngle;
  const returning=Math.abs(target)<Math.abs(car.steerAngle);
  const rate=(returning
    ? CFG.steering.returnSpeedDegPerSec
    : CFG.steering.inputSpeedDegPerSec)*Math.PI/180;

  if(car.steerAngle<target)car.steerAngle=Math.min(target,car.steerAngle+rate*dt);
  else if(car.steerAngle>target)car.steerAngle=Math.max(target,car.steerAngle-rate*dt);
}

function stateMultipliers(){
  switch(drift.state){
    case 'ENTRY':
      return {
        front:CFG.states.entry.frontGripMultiplier,
        rear:CFG.states.entry.rearGripMultiplier,
        yaw:CFG.states.entry.yawTorque
      };
    case 'HOLD':
      return {
        front:1,
        rear:CFG.states.hold.rearGripMultiplier,
        yaw:input.gas?CFG.states.hold.throttleYawTorque:0
      };
    case 'TRANSITION':
      return {
        front:CFG.states.transition.frontGripMultiplier,
        rear:CFG.states.transition.rearGripMultiplier,
        yaw:CFG.states.transition.yawTorque
      };
    case 'EXIT':
      return {front:1,rear:0.82,yaw:0};
    default:
      return {front:1,rear:1,yaw:0};
  }
}

function update(dt){
  const heading=car.heading;
  const forward={x:Math.cos(heading),y:Math.sin(heading)};
  const right={x:Math.cos(heading+Math.PI/2),y:Math.sin(heading+Math.PI/2)};

  const bodyForwardSpeed=car.vx*forward.x+car.vy*forward.y;
  const bodyLateralSpeed=car.vx*right.x+car.vy*right.y;
  const speedBeforeForces=Math.hypot(car.vx,car.vy);

  updateStateMachine(
    dt,
    Math.abs(bodyForwardSpeed),
    previousRearSlip,
    0
  );
  updateSteering(dt,Math.abs(bodyForwardSpeed));

  const stateFx=stateMultipliers();

  let totalFx=0,totalFy=0,totalTorque=0;
  let rearSlipSum=0,rearSlipCount=0;
  let frontSlipSum=0,frontSlipCount=0;

  for(const tire of tires){
    const rx=right.x*tire.lateral+forward.x*tire.longitudinal;
    const ry=right.y*tire.lateral+forward.y*tire.longitudinal;

    const pointVx=car.vx-car.yawRate*ry;
    const pointVy=car.vy+car.yawRate*rx;

    const tireSteer=tire.steer?getFrontWheelSteerAngle(tire):0;
    const tireHeading=heading+tireSteer;
    const tireForward={x:Math.cos(tireHeading),y:Math.sin(tireHeading)};
    const tireRight={x:Math.cos(tireHeading+Math.PI/2),y:Math.sin(tireHeading+Math.PI/2)};

    const longSpeed=pointVx*tireForward.x+pointVy*tireForward.y;
    const latSpeed=pointVx*tireRight.x+pointVy*tireRight.y;
    const slipAngle=Math.atan2(latSpeed,Math.abs(longSpeed)+.75);
    const tireSlip=Math.abs(slipAngle);

    let stiffness=tire.steer
      ? CFG.tires.frontCorneringStiffness
      : CFG.tires.rearCorneringStiffness;

    let maxLateral=tire.steer
      ? CFG.tires.frontMaxLateralForce*stateFx.front
      : CFG.tires.rearMaxLateralForce*stateFx.rear;

    let driveForce=0;
    if(tire.drive&&input.gas&&!input.brake){
      driveForce=CFG.engine.driveForce/2;
    }

    if(tire.drive&&input.hand){
      maxLateral*=CFG.brakes.handbrakeRearGripMultiplier;
    }

    if(tire.drive){
      const slipDemand=Math.min(
        1,
        tireSlip/.42+(input.gas?.24:0)+(input.hand?.55:0)
      );

      if(slipDemand>.22){
        tire.slipMemory=Math.min(
          1,
          tire.slipMemory+CFG.tires.rearSlipBuildRate*slipDemand*dt
        );
      }else if(drift.state==='TRANSITION'){
        tire.slipMemory=Math.max(
          CFG.states.transition.rearMemoryFloor,
          tire.slipMemory
        );
      }else{
        let recovery=CFG.tires.rearSlipRecoveryRate;
        if(input.gas)recovery*=1-CFG.tires.rearSlipThrottleHold;
        if(drift.state==='EXIT')recovery*=CFG.states.exit.rearGripRecoveryMultiplier;

        tire.slipMemory=Math.max(0,tire.slipMemory-recovery*dt);
      }

      const memoryGrip=
        1-(1-CFG.tires.rearSlipMinimumGripMultiplier)*tire.slipMemory;

      maxLateral*=memoryGrip;
    }

    let lateralForce=clamp(
      -slipAngle*stiffness,
      -maxLateral,
      maxLateral
    );

    if(Math.abs(longSpeed)<2){
      lateralForce*=CFG.tires.lowSpeedAssist;
    }

    let brakeForce=0;
    if(input.brake){
      if(Math.abs(bodyForwardSpeed)>.8){
        const sign=Math.sign(longSpeed||bodyForwardSpeed||1);
        brakeForce=-sign*CFG.brakes.footBrakeForce/4;
      }else if(tire.drive){
        brakeForce=-CFG.engine.reverseForce/2;
      }
    }

    if(tire.drive&&input.hand){
      const sign=Math.sign(longSpeed||bodyForwardSpeed||1);
      brakeForce+=-sign*CFG.brakes.handbrakeRearLongitudinalForce/2;
    }

    let longitudinalForce=driveForce+brakeForce;

    const forceBudget=maxLateral*(tire.steer
      ? CFG.tires.frontCombinedGrip
      : CFG.tires.rearCombinedGrip);

    if(tire.drive&&input.gas&&!input.brake){
      const protectedLongitudinal=longitudinalForce*.92;
      const remaining=Math.max(
        0,
        forceBudget*forceBudget-protectedLongitudinal*protectedLongitudinal
      );
      const allowedLateral=Math.sqrt(remaining);
      lateralForce=clamp(lateralForce,-allowedLateral,allowedLateral);
    }else{
      const requested=Math.hypot(longitudinalForce,lateralForce);
      if(requested>forceBudget&&requested>0){
        const scale=forceBudget/requested;
        longitudinalForce*=scale;
        lateralForce*=scale;
      }
    }

    const fx=tireForward.x*longitudinalForce+tireRight.x*lateralForce;
    const fy=tireForward.y*longitudinalForce+tireRight.y*lateralForce;

    totalFx+=fx;
    totalFy+=fy;
    totalTorque+=rx*fy-ry*fx;

    const tireWorldX=car.x+rx*26;
    const tireWorldY=car.y+ry*26;
    const rearSliding=tire.drive&&tireSlip>.13&&Math.abs(longSpeed)>3.5;
    const frontSevere=tire.steer&&tireSlip>.48&&Math.abs(longSpeed)>9;

    if(rearSliding||frontSevere){
      skids.push({
        x1:tireWorldX-right.x*3,
        y1:tireWorldY-right.y*3,
        x2:tireWorldX+right.x*3,
        y2:tireWorldY+right.y*3,
        life:11
      });

      const smokeRate=tire.drive
        ? (input.gas?58:24)*tireSlip
        : 5*tireSlip;

      if(Math.random()<dt*smokeRate){
        smoke.push({
          x:tireWorldX+(Math.random()-.5)*5,
          y:tireWorldY+(Math.random()-.5)*5,
          radius:4+Math.random()*6,
          life:.8
        });
      }
    }

    if(tire.steer){
      frontSlipSum+=tireSlip;
      frontSlipCount++;
    }else{
      rearSlipSum+=tireSlip;
      rearSlipCount++;
    }
  }

  const averageFrontSlip=frontSlipCount?frontSlipSum/frontSlipCount:0;
  const averageRearSlip=rearSlipCount?rearSlipSum/rearSlipCount:0;
  previousRearSlip=averageRearSlip;

  car.vx+=(totalFx/CFG.chassis.mass)*dt;
  car.vy+=(totalFy/CFG.chassis.mass)*dt;

  const stateDirection=Math.sign(
    drift.currentInputDirection||car.steerAngle||bodyLateralSpeed||1
  );

  const stateYawTorque=stateDirection*stateFx.yaw*drift.transfer;
  car.yawRate+=(totalTorque+stateYawTorque)/CFG.chassis.yawInertia*dt;

  if(drift.state==='HOLD'){
    const slipSign=Math.sign(bodyLateralSpeed);
    const steerSign=Math.sign(car.steerAngle);
    if(slipSign!==0&&steerSign===-slipSign){
      car.yawRate*=1-CFG.states.hold.countersteerDamping*dt;
    }
  }

  const damping=(drift.state==='GRIP'||drift.state==='EXIT')
    ? CFG.assists.gripYawDamping
    : CFG.assists.driftYawDamping;

  car.yawRate*=Math.pow(damping,dt*60);

  const maxYaw=CFG.assists.driftAngleLimitDeg*Math.PI/180;
  car.yawRate=clamp(car.yawRate,-maxYaw,maxYaw);
  car.heading+=car.yawRate*dt;

  if(!input.brake&&!input.hand&&speedBeforeForces>.5){
    const after=Math.hypot(car.vx,car.vy);
    const minimum=Math.max(
      0,
      speedBeforeForces-CFG.tires.maxCoastScrubDecelMps2*dt
    );

    if(after<minimum&&after>.001){
      const restore=minimum/after;
      car.vx*=restore;car.vy*=restore;
    }
  }

  if(input.gas&&!input.brake&&speedBeforeForces>2){
    const after=Math.hypot(car.vx,car.vy);

    let retention=CFG.tires.minimumThrottleSpeedRetention;
    if(drift.state==='TRANSITION'){
      retention=CFG.states.transition.speedRetention;
    }

    const floor=speedBeforeForces*retention;
    if(after<floor&&after>.001){
      const restore=floor/after;
      car.vx*=restore;car.vy*=restore;
    }
  }

  car.vx*=Math.pow(CFG.engine.rollingResistance,dt*60);
  car.vy*=Math.pow(CFG.engine.rollingResistance,dt*60);

  car.x+=car.vx*26*dt;
  car.y+=car.vy*26*dt;

  if(Math.abs(car.x)>1190){car.x=Math.sign(car.x)*1190;car.vx*=-.18}
  if(Math.abs(car.y)>800){car.y=Math.sign(car.y)*800;car.vy*=-.18}

  cameraX+=(car.x-cameraX)*Math.min(1,dt*4.2);
  cameraY+=(car.y-cameraY)*Math.min(1,dt*4.2);

  const driftAngle=Math.atan2(
    bodyLateralSpeed,
    Math.abs(bodyForwardSpeed)+.01
  );

  smoke.forEach(p=>{p.life-=dt;p.radius+=dt*7});
  smoke=smoke.filter(p=>p.life>0);

  skids.forEach(mark=>mark.life-=dt);
  skids=skids.filter(mark=>mark.life>0);

  const rearLeft=tires.find(t=>t.name==='RL').slipMemory;
  const rearRight=tires.find(t=>t.name==='RR').slipMemory;

  speedText.textContent=Math.round(magnitude(car.vx,car.vy)*2.237)+' MPH';
  angleText.textContent=Math.round(Math.abs(driftAngle*180/Math.PI))+'°';
  stateText.textContent=drift.state;
  frontSlipText.textContent='F '+Math.round(averageFrontSlip*180/Math.PI)+'°';
  rearSlipText.textContent='R '+Math.round(averageRearSlip*180/Math.PI)+'°';
  steerHudText.textContent='S '+Math.round(Math.abs(car.steerAngle)*180/Math.PI)+'°';
  transferHudText.textContent='T '+Math.round(drift.transfer*100)+'%';
  rearMemoryHud.textContent=
    'M '+Math.round(rearLeft*100)+'/'+Math.round(rearRight*100);
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