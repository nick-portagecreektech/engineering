(function(root){
'use strict';
class Mine {
 constructor(random=Math.random){this.random=random;this.bank=0;this.best=0;this.batteryLevel=0;this.drillLevel=0;this.run=0;this.state='ready';}
 start(){this.run++;this.x=3;this.y=0;this.depth=0;this.cargo=0;this.capacity=100+this.batteryLevel*20;this.energy=this.capacity;this.state='mining';this.cells=new Map();this.clock=0;this.returnClock=0;this.last='';}
 tile(x,y){if(y===0)return {kind:'air',hp:0,value:0};const key=x+','+y;if(!this.cells.has(key)){let r=this.random(),kind='rock',value=0,hp=1+Math.floor(y/12);if(r<.04){kind='battery';hp=1;}else if(r<.12){kind='gem';value=30+3*y;hp+=2;}else if(r<.35){kind='gold';value=10+y;hp++;}else if(r<.62){kind='copper';value=4+Math.floor(y/2);}this.cells.set(key,{kind,value,hp});}return this.cells.get(key);}
 move(dx,dy){if(this.state!=='mining'||Math.abs(dx)+Math.abs(dy)!==1)return false;let x=this.x+dx,y=this.y+dy;if(x<0||x>6||y<0)return false;let t=this.tile(x,y);if(t.hp>0){this.energy-=Math.max(1,2-this.drillLevel*.3);t.hp-=1+this.drillLevel*.5;if(t.hp>0){this.check();return true;}this.cargo+=t.value;if(t.kind==='battery')this.energy=Math.min(this.capacity,this.energy+18);this.last=t.kind;t.kind='air';t.value=0;}else this.energy-=.35;this.x=x;this.y=y;this.depth=Math.max(this.depth,y);this.check();if(this.state==='mining'&&y===0&&this.cargo>0)this.finish(true);return true;}
 returnCost(){return (this.y||0)*2;}
 recall(){if(this.state==='mining'){this.state='returning';if(this.y===0)this.finish(true);}}
 tick(dt){if(!['mining','returning'].includes(this.state))return;dt=Math.min(dt,.1);if(this.state==='mining')this.energy-=dt*.85;else{this.returnClock+=dt;if(this.returnClock>=.22){this.returnClock-=.22;this.energy-=2;this.y=Math.max(0,this.y-1);this.check();if(this.state==='returning'&&this.y===0)this.finish(true);}}this.check();}
 check(){if(this.energy<=0){this.energy=0;this.finish(false);}}
 finish(safe){if(!['mining','returning'].includes(this.state))return;this.state=safe?'banked':'lost';this.earned=safe?this.cargo:0;if(safe){this.bank+=this.cargo;this.best=Math.max(this.best,this.cargo);} }
 cost(type){return type==='battery'?60*(this.batteryLevel+1):80*(this.drillLevel+1);}
 upgrade(type){if(['mining','returning'].includes(this.state)||!['battery','drill'].includes(type))return false;let k=type+'Level',cost=this.cost(type);if(this[k]>=5||this.bank<cost)return false;this.bank-=cost;this[k]++;return true;}
}
if(typeof module!=='undefined')module.exports=Mine;else root.Mine=Mine;
})(typeof window!=='undefined'?window:globalThis);
