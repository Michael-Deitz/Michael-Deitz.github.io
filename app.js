(()=>{'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const speedText=document.getElementById('speed');
const angleText=document.getElementById('angle');
const stateText=document.getElementById('state');
const rotate=document.getElementById('rotateScreen');

let W=0,H=0,D=1,last=performance.now(),cameraX=0,cameraY=0,raf=0;
const input={left:false,right:false,gas:false,brake:false,hand:false};

const car={
  x:0,y:0,angle:-Math.PI/2,
  vx:0,vy:0,yawRate:0,
  width:34,length:66,
  power:18.5,brakePower:15,maxSpeed:26,reverseSpeed:6,
  steering:4.0,
  frontGrip:8.0,
  rearGrip:5.2,
  driftRearGrip:1.15,
  handRearGrip:.28,
  driftLevel:0,
  transfer:0,
  previousSteer:0
};

function isLandscape(){return innerWidth>innerHeight}

function resetCar(){
  car.x=0;car.y=0;car.angle=-Math.PI/2;
  car.vx=0;car.vy=0;car.yawRate=0;
  car.driftLevel=0;car.transfer=0;car.previousSteer=0;
  cameraX=car.x;cameraY=car.y;
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

function screen(x,y){return{x:x-cameraX+W/2,y:y-cameraY+H/2}}

function roundedRect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawTrack(){
  ctx.fillStyle='#456d3f';ctx.fillRect(0,0,W,H);
  const p=screen(0,0);ctx.save();ctx.translate(p.x,p.y);

  ctx.fillStyle='#34383d';
  roundedRect(-1200,-820,2400,1640,90);ctx.fill();

  ctx.strokeStyle='#b2b7bb';ctx.lineWidth=10;
  roundedRect(-1195,-815,2390,1630,86);ctx.stroke();

  ctx.fillStyle='#426d40';
  ctx.beginPath();ctx.ellipse(0,-300,175,120,0,0,Math.PI*2);ctx.fill();

  ctx.strokeStyle='#d94b3e';ctx.lineWidth=14;ctx.setLineDash([32,24]);
  ctx.beginPath();ctx.ellipse(0,-300,194,139,0,0,Math.PI*2);ctx.stroke();

  ctx.strokeStyle='#ffffff3b';ctx.lineWidth=4;ctx.setLineDash([25,20]);
  ctx.beginPath();ctx.ellipse(-430,100,310,210,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(430,100,310,210,0,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

let smoke=[],skids=[];

function drawEffects(){
  ctx.strokeStyle='#111a';ctx.lineWidth=3;
  for(const mark of skids){
    const a=screen(mark.x1,mark.y1),b=screen(mark.x2,mark.y2);
    ctx.globalAlpha=Math.min(1,mark.life/2);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.globalAlpha=1;

  for(const puff of smoke){
    const p=screen(puff.x,puff.y);
    ctx.globalAlpha=Math.max(0,puff.life);ctx.fillStyle='#ddd';
    ctx.beginPath();ctx.arc(p.x,p.y,puff.radius,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawCar(){
  const p=screen(car.x,car.y);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(car.angle+Math.PI/2);

  ctx.fillStyle='rgba(0,0,0,.28)';
  roundedRect(-car.width/2+5,-car.length/2+6,car.width,car.length,7);ctx.fill();

  ctx.fillStyle='#a92331';
  roundedRect(-car.width/2,-car.length/2,car.width,car.length,7);ctx.fill();

  ctx.fillStyle='#101820';
  roundedRect(-car.width*.34,-car.length*.17,car.width*.68,car.length*.3,4);ctx.fill();

  ctx.fillStyle='#151515';
  ctx.fillRect(-car.width*.62,-car.length*.3,7,18);
  ctx.fillRect(car.width*.42,-car.length*.3,7,18);
  ctx.fillRect(-car.width*.62,car.length*.12,7,18);
  ctx.fillRect(car.width*.42,car.length*.12,7,18);

  ctx.restore();
}

function speedMagnitude(){return Math.hypot(car.vx,car.vy)}

function update(dt){
  const steer=(input.right?1:0)-(input.left?1:0);
  const forward={x:Math.cos(car.angle),y:Math.sin(car.angle)};
  const right={x:Math.cos(car.angle+Math.PI/2),y:Math.sin(car.angle+Math.PI/2)};

  const forwardSpeed=car.vx*forward.x+car.vy*forward.y;
  const lateralSpeed=car.vx*right.x+car.vy*right.y;
  const speed=Math.abs(forwardSpeed);

  // Weight transfer from a quick steering reversal.
  if(steer!==0 && car.previousSteer!==0 && steer!==car.previousSteer && speed>6.5){
    car.transfer=Math.min(1,car.transfer+.85);
  }
  if(steer!==0)car.previousSteer=steer;
  car.transfer=Math.max(0,car.transfer-dt*.72);

  // Lift-off oversteer.
  if(!input.gas && speed>8 && Math.abs(steer)>.1){
    car.transfer=Math.min(1,car.transfer+dt*1.35);
  }

  if(input.gas && forwardSpeed<car.maxSpeed){
    car.vx+=forward.x*car.power*dt;
    car.vy+=forward.y*car.power*dt;
  }

  if(input.brake){
    if(forwardSpeed>1){
      const m=speedMagnitude()||1;
      car.vx-=car.vx/m*car.brakePower*dt;
      car.vy-=car.vy/m*car.brakePower*dt;
    }else if(forwardSpeed>-car.reverseSpeed){
      car.vx-=forward.x*car.power*.5*dt;
      car.vy-=forward.y*car.power*.5*dt;
    }
  }

  // Drift initiation and maintenance.
  const naturalSlip=Math.min(1,Math.abs(lateralSpeed)/5.5);
  const initiation=Math.max(
    input.hand?1:0,
    car.transfer,
    input.gas&&speed>7&&Math.abs(steer)>.35 ? .65 : 0,
    naturalSlip
  );

  if(initiation>.38){
    car.driftLevel=Math.min(1,car.driftLevel+dt*(input.hand?4.5:2.2)*initiation);
  }else{
    const recovery=input.gas&&Math.abs(lateralSpeed)>1.5 ? .28 : .72;
    car.driftLevel=Math.max(0,car.driftLevel-dt*recovery);
  }

  // Steering creates rotation, but countersteer can catch it.
  const steeringAuthority=Math.min(1,speed/5);
  car.yawRate+=steer*car.steering*steeringAuthority*dt;

  if(car.driftLevel>.15){
    // Rear wheels push the car around while throttle is applied.
    car.yawRate+=steer*car.driftLevel*(input.gas?1.8:.75)*dt;

    // Countersteering against the direction of lateral travel stabilizes the slide.
    const lateralDirection=Math.sign(lateralSpeed);
    if(steer!==0 && steer===-lateralDirection){
      car.yawRate*=Math.pow(.965,dt*60);
    }
  }

  car.yawRate*=Math.pow(car.driftLevel>.15?.991:.975,dt*60);
  car.angle+=car.yawRate*dt;

  const rearGrip=input.hand
    ? car.handRearGrip
    : car.rearGrip+(car.driftRearGrip-car.rearGrip)*car.driftLevel;

  // Front and rear contribution are separated.
  const frontCorrection=lateralSpeed*car.frontGrip*.40;
  const rearCorrection=lateralSpeed*rearGrip*.60;
  const lateralCorrection=frontCorrection+rearCorrection;

  car.vx-=right.x*lateralCorrection*dt;
  car.vy-=right.y*lateralCorrection*dt;

  car.vx*=Math.pow(.995,dt*60);
  car.vy*=Math.pow(.995,dt*60);

  car.x+=car.vx*60*dt;
  car.y+=car.vy*60*dt;

  if(Math.abs(car.x)>1140){car.x=Math.sign(car.x)*1140;car.vx*=-.2}
  if(Math.abs(car.y)>760){car.y=Math.sign(car.y)*760;car.vy*=-.2}

  cameraX+=(car.x-cameraX)*Math.min(1,dt*4.2);
  cameraY+=(car.y-cameraY)*Math.min(1,dt*4.2);

  const slip=Math.atan2(lateralSpeed,Math.abs(forwardSpeed)+.01);
  const drifting=car.driftLevel>.18&&Math.abs(slip)>.13&&speedMagnitude()>4.5;

  if(drifting){
    const rearX=car.x-Math.cos(car.angle)*car.length*.38;
    const rearY=car.y-Math.sin(car.angle)*car.length*.38;

    if(Math.random()<dt*(28+42*car.driftLevel)){
      smoke.push({
        x:rearX+(Math.random()-.5)*16,
        y:rearY+(Math.random()-.5)*16,
        radius:6+Math.random()*8,
        life:.9
      });
    }

    const sideX=Math.cos(car.angle+Math.PI/2)*17;
    const sideY=Math.sin(car.angle+Math.PI/2)*17;
    skids.push({
      x1:rearX-sideX,y1:rearY-sideY,
      x2:rearX+sideX,y2:rearY+sideY,
      life:13
    });
  }

  smoke.forEach(p=>{p.life-=dt;p.radius+=dt*8});
  smoke=smoke.filter(p=>p.life>0);
  skids.forEach(mark=>mark.life-=dt);
  skids=skids.filter(mark=>mark.life>0);

  speedText.textContent=Math.round(speedMagnitude()*4.1)+' MPH';
  angleText.textContent=Math.round(Math.abs(slip*180/Math.PI))+'°';
  stateText.textContent=car.driftLevel>.18?'DRIFT':'GRIP';
}

function draw(){drawTrack();drawEffects();drawCar()}

function loop(time){
  raf=0;
  if(!isLandscape())return;
  const dt=Math.min((time-last)/1000,.033);
  last=time;
  update(dt);draw();
  raf=requestAnimationFrame(loop);
}

function startLoop(){if(!raf)raf=requestAnimationFrame(loop)}

function bind(id,key){
  const button=document.getElementById(id);

  const down=e=>{
    e.preventDefault();
    e.stopPropagation();
    input[key]=true;
    if(button.setPointerCapture && e.pointerId!==undefined){
      try{button.setPointerCapture(e.pointerId)}catch(_){}
    }
  };

  const up=e=>{
    e.preventDefault();
    e.stopPropagation();
    input[key]=false;
    if(button.releasePointerCapture && e.pointerId!==undefined){
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
  e.preventDefault();resetCar();smoke=[];skids=[];draw();
},{passive:false});

resetCar();
resize();
startLoop();
})();