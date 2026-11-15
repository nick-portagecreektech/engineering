'use strict';
(() => {
const {Engine, Bodies, Body, Composite, Events}=Matter;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id),W=480,H=640;
const engine=Engine.create({enableSleeping:true});engine.gravity.y=1.2;
const stock=[{name:'STEEL BEAM',w:110,h:26,color:'#6e9fa5',value:100},{name:'ENGINE BLOCK',w:65,h:52,color:'#b6815b',value:160},{name:'TOOL CHEST',w:80,h:44,color:'#ca6754',value:140},{name:'AIR TANK',w:45,h:70,color:'#7f9a6b',value:180},{name:'GEAR HOUSING',w:58,h:48,color:'#c2a45a',value:150},{name:'HEAVY GIRDER',w:130,h:25,color:'#7394b5',value:220}];
let state='intro',scraps=[],held=null,next=null,elapsed=0,score=0,cargo=0,best=0,spills=0,load=1,dropped=0,lastTime=0,toastUntil=0,particles=[],sound=false,audio=null,streak=0,welds=0,perfects=0,contract=700,bonus=300,record=false,flash=0;
const money=v=>'$'+v.toLocaleString();
try{best=Number(localStorage.getItem('scrapyard-risk-best'))||0;sound=localStorage.getItem('scrapyard-sound')==='1';}catch(e){}
function saveBest(){if(score>best){best=score;record=true;try{localStorage.setItem('scrapyard-risk-best',best)}catch(e){}}}
function tone(freq,duration=.08,type='sine'){if(!sound)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.5,audio.currentTime+duration);g.gain.setValueAtTime(.08,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch(e){}}
function updateSound(){$('sound').innerHTML='♪ <span>'+(sound?'ON':'OFF')+'</span>';$('sound').setAttribute('aria-label',sound?'Disable sound':'Enable sound');}
$('sound').onclick=()=>{sound=!sound;updateSound();try{localStorage.setItem('scrapyard-sound',sound?'1':'0');}catch(e){}tone(550);};updateSound();
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastUntil=elapsed+1.25;}
function bedWidth(){return Math.max(170,280-(load-1)*18);}
function platform(){Composite.clear(engine.world,false);Engine.clear(engine);scraps=[];Composite.add(engine.world,Bodies.rectangle(240,564,bedWidth(),18,{isStatic:true,friction:.9,label:'truck'}));}
function highest(){let top=555;scraps.forEach(b=>{if(!b.lost)top=Math.min(top,b.bounds.min.y);});return top;}
function pick(){return {...stock[Math.floor(Math.random()*stock.length)]};}
function spawn(){held={...(next||stock[0]),x:240,y:Math.max(100,highest()-105),angle:0};next=pick();updateHUD();}
function activePieces(){return scraps.filter(b=>!b.lost);}
function unsettled(){return activePieces().some(b=>!b.scored);}
function settledCount(){return activePieces().filter(b=>b.scored).length;}
function canBank(){return state==='playing'&&settledCount()>=3&&cargo>0&&!unsettled()&&activePieces().every(b=>b.isStatic||b.speed<1.3);}
function updateHUD(){
$('score').textContent=money(score);$('best').textContent=money(best);$('cargo').textContent=money(cargo);$('load').textContent='TRUCK '+String(load).padStart(2,'0');$('lives').textContent=Array.from({length:3},(_,i)=>i<spills?'○':'●').join(' ');$('lives').setAttribute('aria-label',(3-spills)+' spills remaining this shift');
$('combo').textContent='×'+Math.min(5,Math.max(1,streak));$('combo').classList.toggle('hot',streak>=2);
$('contractText').textContent=cargo>=contract?'CONTRACT READY · +'+money(bonus):money(cargo)+' / '+money(contract)+' · BONUS '+money(bonus);$('contractFill').style.width=Math.min(100,cargo/contract*100)+'%';
const count=settledCount();const bankReason=state!=='playing'?'LOAD THREE PIECES':count<3?'LOAD '+count+'/3 PIECES':!canBank()?'WAIT FOR LOAD TO SETTLE':'READY TO BANK';$('bank').disabled=!canBank();$('bank').textContent=canBank()?'BANK '+money(cargo+(cargo>=contract?bonus:0))+' ↗':count<3?'LOAD '+count+'/3':'SETTLING…';$('bank').setAttribute('aria-label',canBank()?'Bank '+money(cargo+(cargo>=contract?bonus:0)):bankReason);$('bankHint').textContent=bankReason;$('bank').classList.toggle('ready',cargo>=contract);
$('rotate').disabled=state!=='playing'||!held;$('weld').disabled=state!=='playing'||!welds||!activePieces().some(b=>b.scored&&!b.isStatic);$('weld').textContent='WELD '+welds+' ⚡';$('weldProgress').textContent=welds===2?'WELDS FULL':(perfects%3)+'/3 perfects → weld';
$('drop').disabled=state!=='playing'||!held||highest()<175;
$('statusLabel').textContent=highest()<175?'TRUCK FULL · BANK IT':held?'ON THE MAGNET':'LANDING…';$('pieceName').textContent=held?held.name+' · '+money(held.value)+' / PERFECT '+money(held.value*Math.min(5,streak+1)):'KEEP IT ON THE TRUCK';
if(next){$('nextName').textContent=next.name;$('nextShape').style.width=(next.w*.31)+'px';$('nextShape').style.height=(next.h*.31)+'px';$('nextShape').style.background=next.color;}
}
function start(){state='playing';score=0;cargo=0;spills=0;load=1;dropped=0;streak=0;welds=0;perfects=0;contract=700;bonus=300;record=false;particles=[];elapsed=0;next={...stock[0]};platform();spawn();$('overlay').classList.add('hidden');toast('CENTER IT. BUILD YOUR MULTIPLIER.');tone(520);}
function rotate(){if(state!=='playing'||!held)return;[held.w,held.h]=[held.h,held.w];held.y=Math.max(100,highest()-105);tone(340,.04);updateHUD();}
function drop(){if(state!=='playing'||!held||highest()<175)return;const p={...held};const body=Bodies.rectangle(p.x,p.y,p.w,p.h,{angle:p.angle,friction:.9,frictionStatic:1.3,restitution:.025,density:.002,frictionAir:.012,chamfer:{radius:4}});Object.assign(body,{spec:p,born:elapsed,scored:false,lost:false,landed:false,stable:0,award:0,precision:false});Body.setVelocity(body,{x:Math.cos(elapsed*(1.1+load*.10))*.12,y:.4});scraps.push(body);Composite.add(engine.world,body);held=null;dropped++;updateHUD();tone(210,.08,'triangle');}
Events.on(engine,'collisionStart collisionActive',event=>{for(const pair of event.pairs){for(const [b,support] of [[pair.bodyA,pair.bodyB],[pair.bodyB,pair.bodyA]]){if(!b.spec||b.scored||b.lost||support.lost)continue;if((support.label==='truck'||support.scored)&&b.position.y<support.position.y){b.landed=true;b.support=support;b.contactAt=elapsed;}}}});
function weld(){if(state!=='playing'||welds<=0)return;const targets=activePieces().filter(b=>b.scored&&!b.isStatic).slice(-1);if(!targets.length)return;welds--;for(const b of targets){Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);Body.setStatic(b,true);b.welded=true;burst(b.position.x,b.position.y,'#70e4e0');}toast('TOP PIECE WELDED. BUILD ON IT.');tone(780,.15,'triangle');updateHUD();}
function bank(){if(!canBank())return;const won=cargo>=contract?bonus:0;const secured=cargo+won;score+=secured;saveBest();cargo=0;load++;streak=0;contract=700+(load-1)*350;bonus=300+(load-1)*150;platform();spawn();flash=.3;toast('BANKED '+money(secured)+(won?' · CONTRACT COMPLETE!':''));tone(880,.18,'triangle');updateHUD();}
function finish(){const lost=cargo;cargo=0;state='over';held=null;saveBest();updateHUD();$('overlay').innerHTML='<div class="modal"><div class="badge">'+(record?'NEW PERSONAL BEST':'THREE SPILLS. SHIFT OVER.')+'</div><h1>'+money(score)+'<br><em>IN THE BANK.</em></h1><p>'+money(lost)+' of unbanked cargo lost.<br>'+(score===0?'Load three pieces, then bank early.':'Your banked earnings are safe.')+'</p><div class="rules"><span><b>BEST</b> '+money(best)+'</span><span><b>NEXT RUN</b> Perfect drops build multipliers and earn welds.</span></div><button id="restart" class="primary">ONE MORE SHIFT <span>↗</span></button><small>Bank before gravity collects. Space to retry.</small></div>';$('overlay').classList.remove('hidden');$('restart').onclick=start;tone(130,.25,'sawtooth');}
function burst(x,y,color){for(let i=0;i<12;i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:-Math.random()*100,life:.65,color});}
function step(dt){elapsed+=dt;flash=Math.max(0,flash-dt);if(state==='playing'){
const substeps=Math.ceil(dt*60);for(let i=0;i<substeps;i++)Engine.update(engine,dt*1000/substeps);
for(const b of scraps){if(b.lost)continue;
const timedOut=!b.scored&&elapsed-b.born>5;
if(timedOut||b.position.y>615||b.position.x < -50||b.position.x>530){Composite.remove(engine.world,b);b.lost=true;spills++;streak=0;if(b.scored)cargo=Math.max(0,cargo-b.award);burst(Math.max(20,Math.min(460,b.position.x)),590,'#ed8163');toast((timedOut?'UNSAFE LOAD REMOVED · ':'SPILL ')+spills+'/3 · COMBO BROKEN');tone(95,.15,'sawtooth');if(spills>=3){finish();break;}}
else if(!b.scored&&b.landed&&elapsed-b.born>.3){b.stable=(b.speed<1.8&&Math.abs(b.angularVelocity)<.04)?b.stable+dt:0;if(b.stable>.14){b.scored=true;const perfect=b.support&&!b.support.lost&&elapsed-b.contactAt<.1&&Math.abs(b.position.x-b.support.position.x)<=14&&Math.abs(Math.sin(b.angle*2))<.3;let earnedWeld=false;if(perfect){streak++;perfects++;if(perfects%3===0&&welds<2){welds++;earnedWeld=true;}}else streak=0;const multiplier=Math.min(5,Math.max(1,streak));b.award=b.spec.value*multiplier;cargo+=b.award;burst(b.position.x,b.position.y,perfect?'#f6c544':'#b6ccd0');toast((perfect?'PERFECT ×'+multiplier+' · ':'')+'+'+money(b.award)+(earnedWeld?' · WELD EARNED!':''));tone(450+multiplier*120,.08);}}
}
if(state==='playing'&&!held&&!unsettled())spawn();updateHUD();}
if(held){const speed=1.1+Math.min(load,9)*.10;held.x=240+Math.sin(elapsed*speed)*150;held.angle=Math.sin(elapsed*speed)*.075;}
if(elapsed>toastUntil)$('toast').style.opacity=0;particles=particles.filter(p=>(p.life-=dt)>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;});}
function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}else ctx.fillRect(x,y,w,h);}
function line(x,y,x2,y2,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function drawScrap(p,x,y,a){ctx.save();ctx.translate(x,y);ctx.rotate(a);rect(-p.w/2+3,-p.h/2+4,p.w,p.h,'#0005',4);rect(-p.w/2,-p.h/2,p.w,p.h,p.color,4);rect(-p.w/2+3,-p.h/2+3,p.w-6,3,'#ffffff30');rect(-p.w/2+3,p.h/2-6,p.w-6,3,'#0003');for(const sx of [-1,1])for(const sy of [-1,1]){ctx.fillStyle='#20343a88';ctx.beginPath();ctx.arc(sx*(p.w/2-8),sy*(p.h/2-8),2.5,0,7);ctx.fill();}if(p.name==='ENGINE BLOCK'||p.name==='GEAR HOUSING'){ctx.strokeStyle='#253b4580';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.stroke();}else if(p.name==='TOOL CHEST'){for(let yy=-8;yy<15;yy+=10){line(-p.w/2+10,yy,p.w/2-10,yy,'#253b4560',2);rect(-6,yy-3,12,2,'#ebc6a7');}}else{line(-p.w/2+15,0,p.w/2-15,0,'#263c4a55',3);}ctx.restore();}
function draw(){ctx.clearRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1c3540');g.addColorStop(1,'#32494c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
// Muted skyline, gantry and evening glow.
ctx.fillStyle='#6e8c8a';ctx.globalAlpha=.15;ctx.beginPath();ctx.arc(390,140,65,0,7);ctx.fill();ctx.globalAlpha=1;
for(let x=0;x<480;x+=70){rect(x,410-(x%3)*23,55,150,'#21383d');rect(x+10,427-(x%3)*23,9,12,'#b3b68322');}for(let x=15;x<480;x+=40)line(x,470,x,550,'#66858122');line(0,480,480,480,'#78999a22');line(0,515,480,515,'#78999a22');
rect(20,0,12,555,'#17303b');rect(448,0,12,555,'#17303b');rect(20,45,440,14,'#43606a');for(let x=35;x<440;x+=38){line(x,46,x+18,58,'#1c3946',4);line(x+18,58,x+36,46,'#1c3946',4);}rect(0,612,480,28,'#13282d');line(0,613,480,613,'#6d7f72',2);for(let x=0;x<480;x+=30)line(x,630,x+16,630,'#345052',2);
// Truck silhouette and hazard-striped bed.
const bw=bedWidth();rect(240-bw/2,554,bw,20,'#d5a82b',3);ctx.save();ctx.beginPath();ctx.rect(240-bw/2,556,bw,16);ctx.clip();for(let x=80;x<410;x+=24){ctx.fillStyle='#253a3f';ctx.beginPath();ctx.moveTo(x,556);ctx.lineTo(x+10,556);ctx.lineTo(x-1,572);ctx.lineTo(x-11,572);ctx.fill();}ctx.restore();rect(105,577,266,12,'#192b30',4);rect(374,530,51,58,'#c8874b',6);rect(382,537,34,22,'#2d4b57',3);rect(379,565,42,4,'#e2a95f');rect(419,579,12,9,'#bfc9bb');for(let x of [141,318,398]){ctx.fillStyle='#0b1a22';ctx.beginPath();ctx.arc(x,594,18,0,7);ctx.fill();ctx.fillStyle='#5d7173';ctx.beginPath();ctx.arc(x,594,8,0,7);ctx.fill();}
if(held){line(240,59,held.x,held.y-held.h/2-15,'#132631',5);line(240,59,held.x,held.y-held.h/2-15,'#8ba2a0',2);rect(held.x-20,held.y-held.h/2-17,40,10,'#efbf3c',3);drawScrap(held,held.x,held.y,held.angle);ctx.setLineDash([3,7]);line(held.x,held.y+held.h/2+12,held.x,550,'#eac44425');ctx.setLineDash([]);}
for(const b of scraps){if(b.lost)continue;drawScrap(b.spec,b.position.x,b.position.y,b.angle);if(b.welded){ctx.fillStyle='#79e7df';ctx.font='bold 13px Arial';ctx.fillText('⚡',b.position.x-6,b.position.y+5);}}
if(flash){ctx.fillStyle='rgba(246,197,68,'+(flash*.4)+')';ctx.fillRect(0,0,W,H);}
// Precision guide marks the center of the current top support.
if(state==='playing'){const top=activePieces().filter(b=>b.scored).sort((a,b)=>a.bounds.min.y-b.bounds.min.y)[0];const tx=top?top.position.x:240,ty=top?top.bounds.min.y:553;line(tx-13,ty-5,tx+13,ty-5,'#f6c544',2);line(tx,ty-13,tx,ty-3,'#f6c544',2);}
for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.65);rect(p.x,p.y,3,3,p.color);}ctx.globalAlpha=1;
}

function frame(t){const dt=Math.min((t-lastTime)/1000||.016,1/30);lastTime=t;if(!document.hidden)step(dt);draw();requestAnimationFrame(frame);}
$('start').onclick=start;$('drop').onclick=drop;$('bank').onclick=bank;$('rotate').onclick=rotate;$('weld').onclick=weld;
canvas.addEventListener('pointerdown',e=>{e.preventDefault();drop();});window.addEventListener('keydown',e=>{if(e.repeat||e.target.tagName==='BUTTON')return;if(['Space','KeyR','KeyW','KeyB'].includes(e.code))e.preventDefault();if(e.code==='Space'){if(state==='playing')drop();else start();}if(e.code==='KeyR')rotate();if(e.code==='KeyW')weld();if(e.code==='KeyB')bank();});document.addEventListener('visibilitychange',()=>{lastTime=performance.now();});
// Read-only diagnostics for smoke tests and support.
window.scrapyard={getState:()=>({state,score,cargo,best,spills,load,held:!!held,pieces:scraps.length,streak,multiplier:Math.min(5,Math.max(1,streak)),welds,perfects,contract,bonus,canBank:canBank(),settledCount:settledCount(),next:next?.name})};
updateHUD();requestAnimationFrame(frame);
})();
