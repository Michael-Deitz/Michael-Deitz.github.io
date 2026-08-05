(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const speedText = document.getElementById('speed');
const angleText = document.getElementById('angle');
const gearText = document.getElementById('gear');
const startScreen = document.getElementById('startScreen');

let width=0,height=0,ratio=1,lastTime=0,running=false,cameraX=0,cameraY=0;
const input={left:false,right:false,gas:false,brake:false,hand:false};

const car={
  x:0,y:210,angle:-Math.PI/2,vx:0,vy:0,
  width:34,length:66,
  engineForce:16.5,
  brakeForce:15,
  maxForward:24,
  maxReverse:6,
  steerRate:2.6,
  lowSpeedGrip:6.2,
  rearGrip:1.35,
  handGrip:0.18,
  yawAssist:1.35
};

function resize(){
  ratio=Math.min(window.devicePixelRatio||1,2);
  width=window.innerWidth;height=window.innerHeight;
  canvas.width=Math.floor(width*ratio);canvas.height=Math.floor(height*ratio);
  canvas.style.width=width+'px';canvas.style.height=height+'px';
  ctx.setTransform(ratio,0,0,ratio,0,0);draw();
}
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>setTimeout(resize,200));
resize();

function toScreen(x,y){return{x:x-cameraX+width/2,y:y-cameraY+height/2}}
function roundRect(x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function drawTrack(){
  ctx.fillStyle='#456d3f';ctx.fillRect(0,0,width,height);
  const p=toScreen(0,0);ctx.save();ctx.translate(p.x,p.y);

  ctx.fillStyle='#34383d';
  roundRect(-900,-600,1800,1200,70);ctx.fill();

  ctx.strokeStyle='#b2b7bb';ctx.lineWidth=10;
  roundRect(-895,-595,1790,1190,66);ctx.stroke();

  ctx.fillStyle='#426d40';
  ctx.beginPath();ctx.ellipse(0,0,150,105,0,0,Math.PI*2);ctx.fill();

  ctx.strokeStyle='#d94b3e';ctx.lineWidth=14;ctx.setLineDash([32,24]);
  ctx.beginPath();ctx.ellipse(0,0,165,120,0,0,Math.PI*2);ctx.stroke();

  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=4;ctx.setLineDash([25,20]);
  ctx.beginPath();ctx.ellipse(-330,0,240,165,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.ellipse(330,0,240,165,0,0,Math.PI*2);ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(-610,-260,120,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.arc(610,260,120,0,Math.PI*2);ctx.stroke();

  const cones=[[-570,-260],[-650,-260],[-610,-220],[-610,-300],[570,260],[650,260],[610,220],[610,300]];
  ctx.fillStyle='#ff7300';
  for(const [x,y] of cones){ctx.beginPath();ctx.moveTo(x,y-12);ctx.lineTo(x-8,y+10);ctx.lineTo(x+8,y+10);ctx.closePath();ctx.fill()}
  ctx.restore();
}

let smoke=[],skids=[];

function drawEffects(){
  ctx.lineWidth=3;ctx.strokeStyle='rgba(20,20,20,.6)';
  for(const s of skids){
    const a=toScreen(s.x1,s.y1),b=toScreen(s.x2,s.y2);
    ctx.globalAlpha=Math.min(1,s.life/2);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.globalAlpha=1;
  for(const p of smoke){
    const q=toScreen(p.x,p.y);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle='#ddd';
    ctx.beginPath();ctx.arc(q.x,q.y,p.r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

function drawCar(){
  const p=toScreen(car.x,car.y);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(car.angle+Math.PI/2);
  ctx.fillStyle='rgba(0,0,0,.28)';roundRect(-car.width/2+5,-car.length/2+6,car.width,car.length,7);ctx.fill();
  ctx.fillStyle='#a92331';roundRect(-car.width/2,-car.length/2,car.width,car.length,7);ctx.fill();
  ctx.fillStyle='#101820';roundRect(-car.width*.34,-car.length*.17,car.width*.68,car.length*.30,4);ctx.fill();
  ctx.fillStyle='#151515';
  ctx.fillRect(-car.width*.62,-car.length*.30,7,18);ctx.fillRect(car.width*.42,-car.length*.30,7,18);
  ctx.fillRect(-car.width*.62,car.length*.12,7,18);ctx.fillRect(car.width*.42,car.length*.12,7,18);
  ctx.fillStyle='#ffe0a0';ctx.fillRect(-car.width*.34,-car.length*.48,9,5);ctx.fillRect(car.width*.08,-car.length*.48,9,5);
  ctx.restore();
}

function magnitude(){return Math.hypot(car.vx,car.vy)}

function update(dt){
  const steer=(input.right?1:0)-(input.left?1:0);
  const forward={x:Math.cos(car.angle),y:Math.sin(car.angle)};
  const right={x:Math.cos(car.angle+Math.PI/2),y:Math.sin(car.angle+Math.PI/2)};
  const forwardSpeed=car.vx*forward.x+car.vy*forward.y;
  const lateralSpeed=car.vx*right.x+car.vy*right.y;

  if(input.gas && forwardSpeed<car.maxForward){
    car.vx+=forward.x*car.engineForce*dt;
    car.vy+=forward.y*car.engineForce*dt;
  }

  if(input.brake){
    if(forwardSpeed>1){
      const m=magnitude()||1;
      car.vx-=(car.vx/m)*car.brakeForce*dt;
      car.vy-=(car.vy/m)*car.brakeForce*dt;
    }else if(forwardSpeed>-car.maxReverse){
      car.vx-=forward.x*car.engineForce*.55*dt;
      car.vy-=forward.y*car.engineForce*.55*dt;
    }
  }

  const speedFactor=Math.min(1,Math.abs(forwardSpeed)/3.5);
  const direction=forwardSpeed>=0?1:-1;
  car.angle+=steer*car.steerRate*speedFactor*direction*dt;

  // rear-end rotation assist while on throttle
  if(input.gas && Math.abs(steer)>.05 && Math.abs(forwardSpeed)>5){
    car.angle+=steer*car.yawAssist*Math.min(1,Math.abs(forwardSpeed)/14)*dt;
  }

  const slipRatio=Math.min(1,Math.abs(lateralSpeed)/6);
  let grip=car.lowSpeedGrip*(1-slipRatio)+car.rearGrip*slipRatio;
  if(input.hand) grip=car.handGrip;

  car.vx-=right.x*lateralSpeed*grip*dt;
  car.vy-=right.y*lateralSpeed*grip*dt;

  car.vx*=Math.pow(.994,dt*60);
  car.vy*=Math.pow(.994,dt*60);

  car.x+=car.vx*60*dt;
  car.y+=car.vy*60*dt;

  if(Math.abs(car.x)>860){car.x=Math.sign(car.x)*860;car.vx*=-.25;car.vy*=.72}
  if(Math.abs(car.y)>560){car.y=Math.sign(car.y)*560;car.vy*=-.25;car.vx*=.72}

  cameraX+=(car.x-cameraX)*Math.min(1,dt*4.5);
  cameraY+=(car.y-cameraY)*Math.min(1,dt*4.5);

  const slip=Math.atan2(lateralSpeed,Math.abs(forwardSpeed)+.01);
  const drifting=Math.abs(slip)>.20 && magnitude()>4.5;

  if(drifting){
    const backX=car.x-Math.cos(car.angle)*car.length*.38;
    const backY=car.y-Math.sin(car.angle)*car.length*.38;
    if(Math.random()<dt*42)smoke.push({x:backX+(Math.random()-.5)*16,y:backY+(Math.random()-.5)*16,r:5+Math.random()*8,life:.85});
    const sx=Math.cos(car.angle+Math.PI/2)*17,sy=Math.sin(car.angle+Math.PI/2)*17;
    skids.push({x1:backX-sx,y1:backY-sy,x2:backX+sx,y2:backY+sy,life:12});
    if(skids.length>900)skids.shift();
  }

  smoke.forEach(p=>{p.life-=dt;p.r+=dt*8});smoke=smoke.filter(p=>p.life>0);
  skids.forEach(s=>s.life-=dt);skids=skids.filter(s=>s.life>0);

  speedText.textContent=Math.round(magnitude()*4.1)+' MPH';
  angleText.textContent=Math.round(Math.abs(slip*180/Math.PI))+'°';
  gearText.textContent=forwardSpeed<-.5?'R':(forwardSpeed<8?'1':forwardSpeed<15?'2':'3');
}

function draw(){drawTrack();drawEffects();drawCar()}

function loop(time){
  if(!running)return;
  const dt=Math.min((time-lastTime)/1000,.033);
  lastTime=time;update(dt);draw();requestAnimationFrame(loop);
}

function bindHold(id,key){
  const b=document.getElementById(id);
  const on=e=>{e.preventDefault();input[key]=true};
  const off=e=>{e.preventDefault();input[key]=false};
  b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);
  b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);
}
bindHold('leftBtn','left');bindHold('rightBtn','right');bindHold('gasBtn','gas');bindHold('brakeBtn','brake');bindHold('handBtn','hand');

document.getElementById('startBtn').addEventListener('click',()=>{
  car.x=0;car.y=210;car.angle=-Math.PI/2;car.vx=0;car.vy=0;
  cameraX=car.x;cameraY=car.y;
  startScreen.classList.remove('show');running=true;lastTime=performance.now();requestAnimationFrame(loop);
});
draw();
})();