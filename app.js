(()=>{'use strict';

const CFG=window.CAR_CONFIG;
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const speedText=document.getElementById('speed');
const angleText=document.getElementById('angle');
const stateText=document.getElementById('state');
const frontSlipText=document.getElementById('frontSlip');
const controlStateText=document.getElementById('controlState');
const rearSlipText=document.getElementById('rearSlip');
const steerHudText=document.getElementById('steerHud');
const transferHudText=document.getElementById('transferHud');
const rotate=document.getElementById('rotateScreen');

let W=0,H=0,D=1,last=performance.now(),raf=0;
let cameraX=0,cameraY=0;

const input={left:false,right:false,gas:false,brake:false,hand:false};

const car={
  x:0,y:0,heading:-Math.PI/2,
  vx:0,vy:0,yawRate:0,
  steerAngle:0
};

let smoke=[];
let skids=[];
let previousRearSlip=0;

// Local car coordinates:
// lateral: negative = left, positive = right
// longitudinal: positive = front, negative = rear
const tires=[
  {name:'FL',lateral:-CFG.chassis.trackWidth/2,longitudinal: CFG.chassis.cgToFrontAxle,steer:true, drive:false,slipMemory:0},
  {name:'FR',lateral: CFG.chassis.trackWidth/2,longitudinal: CFG.chassis.cgToFrontAxle,steer:true, drive:false,slipMemory:0},
  {name:'RL',lateral:-CFG.chassis.trackWidth/2,longitudinal:-CFG.chassis.cgToRearAxle, steer:false,drive:true,slipMemory:0},
  {name:'RR',lateral: CFG.chassis.trackWidth/2,longitudinal:-CFG.chassis.cgToRearAxle, steer:false,drive:true,slipMemory:0}
];

let transitionLoad=0;
let previousSteerDirection=0;

function isLandscape(){return innerWidth>innerHeight}

function resetCar(){
  car.x=0;car.y=0;car.heading=-Math.PI/2;
  car.vx=0;car.vy=0;car.yawRate=0;car.steerAngle=0;
  cameraX=car.x;cameraY=car.y;
  smoke=[];skids=[];previousRearSlip=0;transitionLoad=0;previousSteerDirection=0;tires.forEach(t=>t.slipMemory=0);
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
    const tx=tire.lateral*scale;
    const ty=-tire.longitudinal*scale;
    ctx.save();
    ctx.translate(tx,ty);
    if(tire.steer)ctx.rotate(getFrontWheelSteerAngle(tire));
    ctx.fillRect(-4,-9,8,18);
    ctx.restore();
  }

  ctx.restore();
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function magnitude(x,y){return Math.hypot(x,y)}
function getFrontWheelSteerAngle(tire){
  const base=car.steerAngle;
  if(!tire.steer||Math.abs(base)<0.001)return 0;

  const direction=Math.sign(base);
  const absBase=Math.abs(base);
  const wheelbase=CFG.chassis.wheelbase;
  const halfTrack=CFG.chassis.trackWidth/2;

  // Approximate turn radius from the requested center steering angle.
  const centerRadius=wheelbase/Math.max(0.05,Math.tan(absBase));
  const isInner=(direction>0&&tire.lateral>0)||(direction<0&&tire.lateral<0);
  const wheelRadius=Math.max(0.2,centerRadius+(isInner?-halfTrack:halfTrack));
  const ackermannAngle=Math.atan(wheelbase/wheelRadius);

  const blended=absBase+(ackermannAngle-absBase)*CFG.steering.ackermannStrength;
  return direction*blended;
}


function updateSteering(dt,forwardSpeed,rearSlipEstimate){
  const targetInput=(input.right?1:0)-(input.left?1:0);

  const fullDriftLock=CFG.steering.maxAngleDeg*Math.PI/180;
  const gripLock=CFG.steering.gripMaxAngleDeg*Math.PI/180;
  const rearIsSliding=rearSlipEstimate>=CFG.steering.driftFullLockRearSlipRad;

  // Normal driving uses a manageable steering range.
  // Once the rear slides, full drift lock becomes available for countersteer.
  let maxAngle=rearIsSliding?fullDriftLock:gripLock;

  if(!rearIsSliding && forwardSpeed>CFG.steering.speedReductionStartMps){
    const range=Math.max(
      0.1,
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
  const movingTowardCenter=Math.abs(target)<Math.abs(car.steerAngle);
  const rate=(movingTowardCenter
    ? CFG.steering.returnSpeedDegPerSec
    : CFG.steering.inputSpeedDegPerSec)*Math.PI/180;

  if(car.steerAngle<target)car.steerAngle=Math.min(target,car.steerAngle+rate*dt);
  else if(car.steerAngle>target)car.steerAngle=Math.max(target,car.steerAngle-rate*dt);
}

function update(dt){
  const heading=car.heading;
  const forward={x:Math.cos(heading),y:Math.sin(heading)};
  const right={x:Math.cos(heading+Math.PI/2),y:Math.sin(heading+Math.PI/2)};

  const bodyForwardSpeed=car.vx*forward.x+car.vy*forward.y;
  const bodyLateralSpeed=car.vx*right.x+car.vy*right.y;

  updateSteering(dt,Math.abs(bodyForwardSpeed),previousRearSlip);

  const requestedSteerDirection=(input.right?1:0)-(input.left?1:0);
  const currentSteerDirection=Math.sign(car.steerAngle);

  if(
    requestedSteerDirection!==0 &&
    previousSteerDirection!==0 &&
    requestedSteerDirection!==previousSteerDirection &&
    Math.abs(bodyForwardSpeed)>5
  ){
    transitionLoad=Math.min(
      1,
      transitionLoad+CFG.assists.transitionBuild
    );
  }
  if(requestedSteerDirection!==0){
    previousSteerDirection=requestedSteerDirection;
  }
  transitionLoad=Math.max(
    0,
    transitionLoad-CFG.assists.transitionDecayPerSec*dt
  );

  const speedBeforeForces=Math.hypot(car.vx,car.vy);

  let totalFx=0,totalFy=0,totalTorque=0;
  let rearSlipSum=0;
  let rearSlipCount=0;
  let frontSlipSum=0;
  let frontSlipCount=0;

  for(const tire of tires){
    // Correct world contact point from the car's local axes.
    const rx=right.x*tire.lateral + forward.x*tire.longitudinal;
    const ry=right.y*tire.lateral + forward.y*tire.longitudinal;

    // Velocity at this tire contact point, including body rotation.
    const pointVx=car.vx-car.yawRate*ry;
    const pointVy=car.vy+car.yawRate*rx;

    const tireSteer=tire.steer?getFrontWheelSteerAngle(tire):0;
    const tireHeading=heading+tireSteer;
    const tireForward={x:Math.cos(tireHeading),y:Math.sin(tireHeading)};
    const tireRight={x:Math.cos(tireHeading+Math.PI/2),y:Math.sin(tireHeading+Math.PI/2)};

    const longSpeed=pointVx*tireForward.x+pointVy*tireForward.y;
    const latSpeed=pointVx*tireRight.x+pointVy*tireRight.y;
    const slipAngle=Math.atan2(latSpeed,Math.abs(longSpeed)+0.75);

    let stiffness=tire.steer
      ? CFG.tires.frontCorneringStiffness
      : CFG.tires.rearCorneringStiffness;

    let maxLateral=tire.steer
      ? CFG.tires.frontMaxLateralForce
      : CFG.tires.rearMaxLateralForce;

    let driveForce=0;
    if(tire.drive&&input.gas&&!input.brake){
      driveForce=CFG.engine.driveForce/2;
      maxLateral*=CFG.tires.rearDriveGripMultiplier;
    }

    if(tire.drive&&input.hand){
      maxLateral*=CFG.brakes.handbrakeRearGripMultiplier;
    }

    // Persistent rear tire slip memory.
    // Grip drops progressively while spinning/sliding and returns slowly.
    if(tire.drive){
      const slipDemand=Math.min(
        1,
        Math.abs(slipAngle)/0.42 +
        (input.gas?0.26:0) +
        (input.hand?0.55:0)
      );

      if(slipDemand>0.24){
        tire.slipMemory=Math.min(
          1,
          tire.slipMemory+CFG.tires.rearSlipBuildRate*slipDemand*dt
        );
      }else if(transitionLoad>0.08){
        tire.slipMemory=Math.max(
          CFG.tires.transitionRearSlipFloor,
          tire.slipMemory
        );
      }else{
        const recovery=input.gas
          ? CFG.tires.rearSlipRecoveryRate*(1-CFG.tires.rearSlipThrottleHold)
          : CFG.tires.rearSlipRecoveryRate;

        tire.slipMemory=Math.max(
          0,
          tire.slipMemory-recovery*dt
        );
      }

      const memoryGrip=
        1-(1-CFG.tires.rearSlipMinimumGripMultiplier)*tire.slipMemory;

      maxLateral*=memoryGrip;
      maxLateral*=1-transitionLoad*(1-CFG.assists.transitionRearGripMultiplier);
    }else{
      maxLateral*=1+transitionLoad*(CFG.assists.transitionFrontGripMultiplier-1);
    }

    // Powered rear tires lose lateral capacity when throttle and steering
    // demand exceed their available grip. This creates power oversteer.
    const powerOversteer =
      tire.drive &&
      input.gas &&
      Math.abs(bodyForwardSpeed)>CFG.tires.powerOversteerStartMps &&
      Math.abs(car.steerAngle)>CFG.tires.powerOversteerSteerRad;

    if(powerOversteer){
      maxLateral*=CFG.tires.powerOversteerRearGripMultiplier;
    }

    let lateralForce=clamp(-slipAngle*stiffness,-maxLateral,maxLateral);

    if(tire.steer){
      const extremeStart=CFG.tires.extremeLockStartDeg*Math.PI/180;
      const wheelLock=Math.abs(tireSteer);

      if(wheelLock>extremeStart){
        const fullLock=Math.max(
          extremeStart+0.01,
          CFG.steering.maxAngleDeg*Math.PI/180
        );
        const t=clamp(
          (wheelLock-extremeStart)/(fullLock-extremeStart),
          0,
          1
        );
        const multiplier=
          1-t*(1-CFG.tires.extremeLockFrontForceMultiplier);
        lateralForce*=multiplier;
      }
    }

    if(Math.abs(longSpeed)<2){
      lateralForce*=CFG.tires.lowSpeedAssist;
    }

    let brakeForce=0;

    // Foot brake acts at all four wheels opposite their longitudinal motion.
    if(input.brake){
      if(Math.abs(bodyForwardSpeed)>0.8){
        const sign=Math.sign(longSpeed||bodyForwardSpeed||1);
        brakeForce=-sign*CFG.brakes.footBrakeForce/4;
      }else if(tire.drive){
        brakeForce=-CFG.engine.reverseForce/2;
      }
    }

    // Handbrake locks only the rear wheels longitudinally.
    if(tire.drive&&input.hand){
      const rearLongSign=Math.sign(longSpeed||bodyForwardSpeed||1);
      brakeForce+=-rearLongSign*CFG.brakes.handbrakeRearLongitudinalForce/2;
    }

    let longitudinalForce=driveForce+brakeForce;

    // Combined tire-force limit: a tire cannot provide maximum forward and
    // lateral force simultaneously. Rear tires have a smaller combined budget
    // so throttle can break them loose.
    const combinedGrip=tire.steer
      ? CFG.tires.frontCombinedGrip
      : CFG.tires.rearCombinedGrip;

    const forceBudget=maxLateral*combinedGrip;

    if(tire.drive && input.gas && !input.brake){
      // Rear-wheel-drive arcade priority:
      // preserve most engine force and sacrifice lateral grip first.
      const protectedLongitudinal=
        longitudinalForce*CFG.tires.rearThrottleLongitudinalPriority;

      const remainingBudgetSq=Math.max(
        0,
        forceBudget*forceBudget-protectedLongitudinal*protectedLongitudinal
      );

      const allowedLateral=Math.sqrt(remainingBudgetSq);
      lateralForce=clamp(lateralForce,-allowedLateral,allowedLateral);

      // Retain the requested engine force instead of scaling it down with
      // lateral demand. This lets the rear tires spin and rotate the car.
    }else{
      const requestedMagnitude=Math.hypot(longitudinalForce,lateralForce);

      if(requestedMagnitude>forceBudget && requestedMagnitude>0){
        const scale=forceBudget/requestedMagnitude;
        longitudinalForce*=scale;
        lateralForce*=scale;
      }
    }

    const fx=tireForward.x*longitudinalForce+tireRight.x*lateralForce;
    const fy=tireForward.y*longitudinalForce+tireRight.y*lateralForce;

    totalFx+=fx;
    totalFy+=fy;
    totalTorque+=rx*fy-ry*fx;

    // Per-tire smoke and skid effects.
    const tireWorldX=car.x+rx*26;
    const tireWorldY=car.y+ry*26;
    const tireSlip=Math.abs(slipAngle);
    const wheelSpinning=tire.drive&&input.gas&&Math.abs(longSpeed)>4;
    const rearSliding=tire.drive&&tireSlip>0.13&&Math.abs(longSpeed)>3.5;
    const frontSevereScrub=tire.steer&&tireSlip>0.48&&Math.abs(longSpeed)>9;
    const leavingMark=rearSliding||frontSevereScrub;

    if(leavingMark){
      skids.push({
        x1:tireWorldX-right.x*3,
        y1:tireWorldY-right.y*3,
        x2:tireWorldX+right.x*3,
        y2:tireWorldY+right.y*3,
        life:11
      });

      const smokeRate=tire.drive
        ? (wheelSpinning?58:24)*tireSlip
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

  car.vx+=(totalFx/CFG.chassis.mass)*dt;
  car.vy+=(totalFy/CFG.chassis.mass)*dt;

  const transitionDirection=Math.sign(car.steerAngle||previousSteerDirection);
  const transitionTorque=
    transitionDirection *
    transitionLoad *
    CFG.assists.transitionYawTorque;

  car.yawRate+=(
    totalTorque+transitionTorque
  )/CFG.chassis.yawInertia*dt;

  // Arcade scrub-loss cap:
  // tire slip may redirect momentum, but cannot act like a brake pedal.
  if(!input.brake && !input.hand && speedBeforeForces>0.5){
    const speedAfterForces=Math.hypot(car.vx,car.vy);
    const minimumAllowedSpeed=Math.max(
      0,
      speedBeforeForces-CFG.tires.maxCoastScrubDecelMps2*dt
    );

    if(speedAfterForces<minimumAllowedSpeed && speedAfterForces>0.001){
      const restore=minimumAllowedSpeed/speedAfterForces;
      car.vx*=restore;
      car.vy*=restore;
    }
  }

  // While accelerating, do not let tire scrub instantly erase momentum.
  if(input.gas && !input.brake && speedBeforeForces>2){
    const speedAfterRestore=Math.hypot(car.vx,car.vy);
    const retention=transitionLoad>0.08
      ? CFG.tires.transitionSpeedRetention
      : CFG.tires.minimumThrottleSpeedRetention;
    const throttleFloor=speedBeforeForces*retention;

    if(speedAfterRestore<throttleFloor && speedAfterRestore>0.001){
      const restore=throttleFloor/speedAfterRestore;
      car.vx*=restore;
      car.vy*=restore;
    }
  }

  const averageRearSlip=rearSlipCount?rearSlipSum/rearSlipCount:0;
  previousRearSlip=averageRearSlip;
  const averageFrontSlip=frontSlipCount?frontSlipSum/frontSlipCount:0;
  const drifting=averageRearSlip>0.18&&Math.abs(bodyForwardSpeed)>5;

  const yawDamping=drifting
    ? CFG.assists.yawDampingDrift
    : CFG.assists.yawDampingGrip;
  car.yawRate*=Math.pow(yawDamping,dt*60);

  const slipSign=Math.sign(bodyLateralSpeed);
  const steerSign=Math.sign(car.steerAngle);

  if(drifting&&slipSign!==0&&steerSign===-slipSign){
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

  smoke.forEach(p=>{p.life-=dt;p.radius+=dt*7});
  smoke=smoke.filter(p=>p.life>0);

  skids.forEach(mark=>mark.life-=dt);
  skids=skids.filter(mark=>mark.life>0);

  speedText.textContent=Math.round(speed*2.237)+' MPH';
  angleText.textContent=Math.round(Math.abs(driftAngle*180/Math.PI))+'°';
  stateText.textContent=drifting?'DRIFT':'GRIP';
  frontSlipText.textContent='F '+Math.round(averageFrontSlip*180/Math.PI)+'°';
  rearSlipText.textContent='R '+Math.round(averageRearSlip*180/Math.PI)+'°';
  steerHudText.textContent='S '+Math.round(Math.abs(car.steerAngle)*180/Math.PI)+'°';
  transferHudText.textContent='T '+Math.round(transitionLoad*100)+'%';
  controlStateText.textContent=input.hand?'E-BRAKE':input.brake?'BRAKE':input.gas?'GAS':'COAST';
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