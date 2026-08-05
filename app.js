(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const speedText = document.getElementById('speed');
const angleText = document.getElementById('angle');
const startScreen = document.getElementById('startScreen');

let width = 0;
let height = 0;
let ratio = 1;
let lastTime = 0;
let running = false;
let cameraX = 0;
let cameraY = 0;

const input = { left:false, right:false, gas:false, brake:false, hand:false };

const car = {
  x:0, y:130,
  angle:-Math.PI/2,
  vx:0, vy:0,
  width:34, length:66,
  engineForce:13.5,
  brakeForce:18,
  maxForward:19,
  maxReverse:6,
  steerRate:2.25,
  normalGrip:7.2,
  driftGrip:2.1,
  handGrip:0.45
};

function resize(){
  ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(ratio,0,0,ratio,0,0);
  draw();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

function toScreen(x,y){
  return { x:x-cameraX+width/2, y:y-cameraY+height/2 };
}

function drawRoundedRect(x,y,w,h,r,fill){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
  if(fill) ctx.fill();
}

function drawTrack(){
  ctx.fillStyle = '#456d3f';
  ctx.fillRect(0,0,width,height);

  const p = toScreen(0,0);
  ctx.save();
  ctx.translate(p.x,p.y);

  ctx.fillStyle = '#34383d';
  drawRoundedRect(-520,-350,1040,700,50,true);

  ctx.strokeStyle = '#b2b7bb';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.rect(-515,-345,1030,690);
  ctx.stroke();

  ctx.fillStyle = '#426d40';
  ctx.beginPath();
  ctx.ellipse(0,0,120,82,0,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = '#d94b3e';
  ctx.lineWidth = 12;
  ctx.setLineDash([28,23]);
  ctx.beginPath();
  ctx.ellipse(0,0,134,96,0,0,Math.PI*2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,.30)';
  ctx.lineWidth = 4;
  ctx.setLineDash([22,18]);
  ctx.beginPath();
  ctx.ellipse(-220,0,160,112,0,0,Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(220,0,160,112,0,0,Math.PI*2);
  ctx.stroke();
  ctx.setLineDash([]);

  const cones=[[-360,-90],[-360,90],[360,-90],[360,90],[0,-145],[0,145]];
  ctx.fillStyle='#ff7300';
  for(const point of cones){
    const x=point[0], y=point[1];
    ctx.beginPath();
    ctx.moveTo(x,y-12);
    ctx.lineTo(x-8,y+10);
    ctx.lineTo(x+8,y+10);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawCar(){
  const p = toScreen(car.x,car.y);
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.rotate(car.angle + Math.PI/2);

  ctx.fillStyle='rgba(0,0,0,.28)';
  drawRoundedRect(-car.width/2+5,-car.length/2+6,car.width,car.length,7,true);

  ctx.fillStyle='#a92331';
  drawRoundedRect(-car.width/2,-car.length/2,car.width,car.length,7,true);

  ctx.fillStyle='#101820';
  drawRoundedRect(-car.width*.34,-car.length*.17,car.width*.68,car.length*.30,4,true);

  ctx.fillStyle='#151515';
  ctx.fillRect(-car.width*.62,-car.length*.30,7,18);
  ctx.fillRect(car.width*.42,-car.length*.30,7,18);
  ctx.fillRect(-car.width*.62,car.length*.12,7,18);
  ctx.fillRect(car.width*.42,car.length*.12,7,18);

  ctx.fillStyle='#ffe0a0';
  ctx.fillRect(-car.width*.34,-car.length*.48,9,5);
  ctx.fillRect(car.width*.08,-car.length*.48,9,5);

  ctx.restore();
}

function magnitude(){
  return Math.hypot(car.vx,car.vy);
}

function update(dt){
  const steer = (input.right?1:0) - (input.left?1:0);
  const forward = {x:Math.cos(car.angle), y:Math.sin(car.angle)};
  const right = {x:Math.cos(car.angle+Math.PI/2), y:Math.sin(car.angle+Math.PI/2)};

  const forwardSpeed = car.vx*forward.x + car.vy*forward.y;
  const lateralSpeed = car.vx*right.x + car.vy*right.y;

  if(input.gas && forwardSpeed < car.maxForward){
    car.vx += forward.x * car.engineForce * dt;
    car.vy += forward.y * car.engineForce * dt;
  }

  if(input.brake){
    if(forwardSpeed > 1){
      const m = magnitude() || 1;
      car.vx -= (car.vx/m) * car.brakeForce * dt;
      car.vy -= (car.vy/m) * car.brakeForce * dt;
    } else if(forwardSpeed > -car.maxReverse) {
      car.vx -= forward.x * car.engineForce * .55 * dt;
      car.vy -= forward.y * car.engineForce * .55 * dt;
    }
  }

  const steerStrength = Math.min(1, Math.abs(forwardSpeed)/4);
  const direction = forwardSpeed >= 0 ? 1 : -1;
  car.angle += steer * car.steerRate * steerStrength * direction * dt;

  const grip = input.hand ? car.handGrip : (Math.abs(lateralSpeed)>3 ? car.driftGrip : car.normalGrip);
  car.vx -= right.x * lateralSpeed * grip * dt;
  car.vy -= right.y * lateralSpeed * grip * dt;

  car.vx *= Math.pow(.992, dt*60);
  car.vy *= Math.pow(.992, dt*60);

  car.x += car.vx * 60 * dt;
  car.y += car.vy * 60 * dt;

  if(Math.abs(car.x)>490){car.x=Math.sign(car.x)*490;car.vx*=-.28;car.vy*=.70}
  if(Math.abs(car.y)>325){car.y=Math.sign(car.y)*325;car.vy*=-.28;car.vx*=.70}

  cameraX += (car.x-cameraX)*Math.min(1,dt*5);
  cameraY += (car.y-cameraY)*Math.min(1,dt*5);

  const slip = Math.atan2(lateralSpeed,Math.abs(forwardSpeed)+.01);
  speedText.textContent = Math.round(magnitude()*4.1)+' MPH';
  angleText.textContent = Math.round(Math.abs(slip*180/Math.PI))+'°';
}

function draw(){
  drawTrack();
  drawCar();
}

function loop(time){
  if(!running) return;
  const dt = Math.min((time-lastTime)/1000,.033);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function bindHold(id,key){
  const button=document.getElementById(id);
  const down=e=>{e.preventDefault();input[key]=true};
  const up=e=>{e.preventDefault();input[key]=false};
  button.addEventListener('pointerdown',down);
  button.addEventListener('pointerup',up);
  button.addEventListener('pointercancel',up);
  button.addEventListener('pointerleave',up);
}
bindHold('leftBtn','left');
bindHold('rightBtn','right');
bindHold('gasBtn','gas');
bindHold('brakeBtn','brake');
bindHold('handBtn','hand');

document.getElementById('startBtn').addEventListener('click',()=>{
  car.x=0;car.y=130;car.angle=-Math.PI/2;car.vx=0;car.vy=0;
  cameraX=car.x;cameraY=car.y;
  startScreen.classList.remove('show');
  running=true;
  lastTime=performance.now();
  requestAnimationFrame(loop);
});

draw();
})();