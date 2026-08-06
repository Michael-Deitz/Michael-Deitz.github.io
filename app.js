(()=>{'use strict';
const c=document.getElementById('game'),x=c.getContext('2d');
const sp=document.getElementById('speed'),an=document.getElementById('angle'),gr=document.getElementById('grip');
const rotate=document.getElementById('rotateScreen');
let W=0,H=0,D=1,last=performance.now(),cx=0,cy=0,raf=0;
const input={l:0,r:0,g:0,b:0,h:0};
const car={x:0,y:0,a:-Math.PI/2,vx:0,vy:0,yaw:0,w:34,l:66,eng:17.5,br:15,max:25,rev:6,steer:4.2,front:8.8,rearBase:4,rear:4,rearMin:.55,recover:1.15,drop:3.2,transfer:0,prev:0};

function landscape(){return innerWidth>innerHeight}
function resetCar(){
  car.x=0;car.y=0;car.a=-Math.PI/2;car.vx=0;car.vy=0;car.yaw=0;
  car.rear=car.rearBase;car.transfer=0;car.prev=0;
  cx=car.x;cy=car.y;
}
function syncOrientation(){
  const land=landscape();
  document.body.classList.toggle('portrait',!land);
  rotate.classList.toggle('hidden',land);
  if(land){last=performance.now();startLoop()}
}
function resize(){
  D=Math.min(devicePixelRatio||1,2);
  W=innerWidth;H=innerHeight;
  c.width=Math.floor(W*D);c.height=Math.floor(H*D);
  c.style.width=W+'px';c.style.height=H+'px';
  x.setTransform(D,0,0,D,0,0);
  syncOrientation();
  draw();
}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>{setTimeout(resize,100);setTimeout(resize,450)});

function s(px,py){return{x:px-cx+W/2,y:py-cy+H/2}}
function rr(px,py,w,h,r){x.beginPath();x.moveTo(px+r,py);x.lineTo(px+w-r,py);x.quadraticCurveTo(px+w,py,px+w,py+r);x.lineTo(px+w,py+h-r);x.quadraticCurveTo(px+w,py+h,px+w-r,py+h);x.lineTo(px+r,py+h);x.quadraticCurveTo(px,py+h,px,py+h-r);x.lineTo(px,py+r);x.quadraticCurveTo(px,py,px+r,py);x.closePath()}
function track(){
  x.fillStyle='#456d3f';x.fillRect(0,0,W,H);
  const p=s(0,0);x.save();x.translate(p.x,p.y);
  x.fillStyle='#34383d';rr(-1050,-720,2100,1440,80);x.fill();
  x.strokeStyle='#b2b7bb';x.lineWidth=10;rr(-1045,-715,2090,1430,76);x.stroke();
  x.fillStyle='#426d40';x.beginPath();x.ellipse(0,-250,160,112,0,0,Math.PI*2);x.fill();
  x.strokeStyle='#d94b3e';x.lineWidth=14;x.setLineDash([32,24]);x.beginPath();x.ellipse(0,-250,178,130,0,0,Math.PI*2);x.stroke();
  x.strokeStyle='#ffffff3b';x.lineWidth=4;x.setLineDash([25,20]);x.beginPath();x.ellipse(-390,80,285,190,0,0,Math.PI*2);x.stroke();x.beginPath();x.ellipse(390,80,285,190,0,0,Math.PI*2);x.stroke();x.setLineDash([]);
  x.restore();
}
let smoke=[],skids=[];
function effects(){
  x.strokeStyle='#111a';x.lineWidth=3;
  for(const q of skids){const a=s(q.x1,q.y1),b=s(q.x2,q.y2);x.globalAlpha=Math.min(1,q.life/2);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}
  x.globalAlpha=1;
  for(const q of smoke){const a=s(q.x,q.y);x.globalAlpha=Math.max(0,q.life);x.fillStyle='#ddd';x.beginPath();x.arc(a.x,a.y,q.r,0,Math.PI*2);x.fill()}
  x.globalAlpha=1;
}
function carDraw(){
  const p=s(car.x,car.y);x.save();x.translate(p.x,p.y);x.rotate(car.a+Math.PI/2);
  x.fillStyle='rgba(0,0,0,.28)';rr(-car.w/2+5,-car.l/2+6,car.w,car.l,7);x.fill();
  x.fillStyle='#a92331';rr(-car.w/2,-car.l/2,car.w,car.l,7);x.fill();
  x.fillStyle='#101820';rr(-car.w*.34,-car.l*.17,car.w*.68,car.l*.3,4);x.fill();
  x.fillStyle='#151515';x.fillRect(-car.w*.62,-car.l*.3,7,18);x.fillRect(car.w*.42,-car.l*.3,7,18);x.fillRect(-car.w*.62,car.l*.12,7,18);x.fillRect(car.w*.42,car.l*.12,7,18);
  x.restore();
}
const mag=()=>Math.hypot(car.vx,car.vy);

function update(dt){
  const steer=(input.r?1:0)-(input.l?1:0);
  const f={x:Math.cos(car.a),y:Math.sin(car.a)},r={x:Math.cos(car.a+Math.PI/2),y:Math.sin(car.a+Math.PI/2)};
  const fs=car.vx*f.x+car.vy*f.y,ls=car.vx*r.x+car.vy*r.y,speed=Math.abs(fs);
  if(steer&&car.prev&&steer!==car.prev&&speed>7)car.transfer=Math.min(1,car.transfer+.95);
  if(steer)car.prev=steer;
  car.transfer=Math.max(0,car.transfer-dt*.75);
  if(!input.g&&speed>9&&Math.abs(steer)>.1)car.transfer=Math.min(1,car.transfer+dt*1.6);
  if(input.g&&fs<car.max){car.vx+=f.x*car.eng*dt;car.vy+=f.y*car.eng*dt}
  if(input.b){if(fs>1){const m=mag()||1;car.vx-=car.vx/m*car.br*dt;car.vy-=car.vy/m*car.br*dt}else if(fs>-car.rev){car.vx-=f.x*car.eng*.55*dt;car.vy-=f.y*car.eng*.55*dt}}
  const demand=Math.min(1,Math.abs(ls)/5.5+Math.abs(car.yaw)*.16+car.transfer*.85+(input.g&&speed>8?Math.abs(steer)*.3:0));
  if(input.h)car.rear=Math.max(car.rearMin,car.rear-car.drop*2.7*dt);
  else if(demand>.35)car.rear=Math.max(car.rearMin,car.rear-car.drop*demand*dt);
  else car.rear=Math.min(car.rearBase,car.rear+car.recover*dt);
  const sf=Math.min(1,speed/5);
  car.yaw+=steer*car.steer*sf*(fs>=0?1:-1)*dt;
  car.yaw+=steer*car.transfer*2.2*dt;
  if(input.g&&car.rear<2.3&&speed>7)car.yaw+=steer*1.25*dt;
  car.yaw*=Math.pow(.985,dt*60);car.a+=car.yaw*dt;
  const correction=ls*(car.front*.45+car.rear*.55);
  car.vx-=r.x*correction*dt;car.vy-=r.y*correction*dt;
  car.vx*=Math.pow(.995,dt*60);car.vy*=Math.pow(.995,dt*60);
  car.x+=car.vx*60*dt;car.y+=car.vy*60*dt;
  if(Math.abs(car.x)>1000){car.x=Math.sign(car.x)*1000;car.vx*=-.2}
  if(Math.abs(car.y)>670){car.y=Math.sign(car.y)*670;car.vy*=-.2}
  cx+=(car.x-cx)*Math.min(1,dt*4.2);cy+=(car.y-cy)*Math.min(1,dt*4.2);
  const slip=Math.atan2(ls,Math.abs(fs)+.01),drifting=Math.abs(slip)>.18&&mag()>5;
  if(drifting){const bx=car.x-Math.cos(car.a)*car.l*.38,by=car.y-Math.sin(car.a)*car.l*.38;if(Math.random()<dt*45)smoke.push({x:bx,y:by,r:6+Math.random()*7,life:.9});const sx=Math.cos(car.a+Math.PI/2)*17,sy=Math.sin(car.a+Math.PI/2)*17;skids.push({x1:bx-sx,y1:by-sy,x2:bx+sx,y2:by+sy,life:13})}
  smoke.forEach(q=>{q.life-=dt;q.r+=dt*8});smoke=smoke.filter(q=>q.life>0);skids.forEach(q=>q.life-=dt);skids=skids.filter(q=>q.life>0);
  sp.textContent=Math.round(mag()*4.1)+' MPH';an.textContent=Math.round(Math.abs(slip*180/Math.PI))+'°';gr.textContent=Math.round(car.rear/car.rearBase*100)+'%';
}
function draw(){track();effects();carDraw()}
function loop(t){
  raf=0;
  if(!landscape())return;
  const dt=Math.min((t-last)/1000,.033);last=t;
  update(dt);draw();
  raf=requestAnimationFrame(loop);
}
function startLoop(){if(!raf)raf=requestAnimationFrame(loop)}
function bind(id,k){const b=document.getElementById(id),on=e=>{e.preventDefault();input[k]=1},off=e=>{e.preventDefault();input[k]=0};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)}
bind('left','l');bind('right','r');bind('gas','g');bind('brake','b');bind('hand','h');
document.getElementById('resetBtn').onclick=()=>{resetCar();smoke=[];skids=[];draw()};
resetCar();resize();startLoop();
})();