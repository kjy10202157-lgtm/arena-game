import "../../arena-obstacles.js";
const OBJECTS=globalThis.NEON_OBSTACLES;
const MAP_DATA={factory:{label:"네온 공장",bg:"#11192d",grid:"#5a82be22",block:"#253151",edge:"#85aeff66",obstacles:[{x:330,y:105,w:90,h:190},{x:330,y:425,w:90,h:190},{x:780,y:105,w:90,h:190},{x:780,y:425,w:90,h:190},{x:540,y:255,w:120,h:210}]},crossfire:{label:"크로스 광장",bg:"#18142b",grid:"#c278ff22",block:"#3b2851",edge:"#ef9cff66",obstacles:[{x:365,y:120,w:115,h:115},{x:720,y:120,w:115,h:115},{x:365,y:485,w:115,h:115},{x:720,y:485,w:115,h:115},{x:535,y:270,w:130,h:180},{x:165,y:300,w:75,h:120},{x:960,y:300,w:75,h:120}]},corridor:{label:"트윈 통로",bg:"#0d2024",grid:"#51ffd422",block:"#1d4748",edge:"#72ffe077",obstacles:[{x:305,y:65,w:85,h:240},{x:305,y:415,w:85,h:240},{x:560,y:150,w:80,h:420},{x:810,y:65,w:85,h:240},{x:810,y:415,w:85,h:240}]}};
const WIDTH=1200,HEIGHT=720,MAX_PLAYERS=6,TICK_MS=50;
const ROLES={assault:{hp:100,speed:225,rate:.19,damage:22},tank:{hp:160,speed:178,rate:.34,damage:25},sniper:{hp:85,speed:190,rate:.62,damage:52},support:{hp:110,speed:205,rate:.28,damage:18}};
const MAPS=["factory","crossfire","corridor"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const safe=(v,n=12)=>String(v||"").replace(/[<>]/g,"").slice(0,n);
const json=(socket,value)=>{try{socket.send(JSON.stringify(value))}catch{}};

export default {
  fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==="/health")return Response.json({ok:true,service:"NEON CLASH 3v3",version:50});
    if(url.pathname!=="/play")return new Response("NEON CLASH 3v3 server",{status:200});
    if(request.headers.get("Upgrade")!=="websocket")return new Response("WebSocket required",{status:426});
    const id=env.ARENA.idFromName("global-matchmaker-v49");
    return env.ARENA.get(id).fetch(request);
  }
};

export class ArenaCoordinator {
  constructor(state){
    this.state=state;this.clients=new Map();this.waiting=[];this.matches=new Map();this.sequence=0;this.timer=null;
  }
  async fetch(request){
    const pair=new WebSocketPair(),client=pair[0],server=pair[1];server.accept();
    const id=`p${Date.now().toString(36)}${(++this.sequence).toString(36)}`;
    const session={id,socket:server,name:"플레이어",role:"assault",skin:"neon",badge:"star",matchId:null,lastSeen:Date.now()};
    this.clients.set(id,session);
    server.addEventListener("message",e=>this.message(session,e.data));
    server.addEventListener("close",()=>this.disconnect(session));
    server.addEventListener("error",()=>this.disconnect(session));
    json(server,{type:"connected",id,version:50});
    this.ensureTimer();
    return new Response(null,{status:101,webSocket:client});
  }
  message(session,raw){
    session.lastSeen=Date.now();let data;try{data=JSON.parse(raw)}catch{return}
    if(data.type==="queue"){
      session.name=safe(data.profile?.name||"플레이어",10);session.role=ROLES[data.role]?data.role:"assault";session.skin=safe(data.profile?.skin||"neon",12);session.badge=safe(data.profile?.badge||"star",12);
      if(!session.matchId&&!this.waiting.includes(session.id))this.waiting.push(session.id);
      this.broadcastQueue();this.formMatches();
    }else if(data.type==="cancel")this.leaveQueue(session);
    else if(data.type==="input"&&session.matchId){const match=this.matches.get(session.matchId),p=match?.players.get(session.id);if(p)p.input=this.cleanInput(data.input)}
    else if(data.type==="ping"&&session.matchId){const match=this.matches.get(session.matchId),p=match?.players.get(session.id);if(match&&p)this.broadcastMatch(match,{type:"ping",playerId:p.id,team:p.team,ping:safe(data.ping,12)})}
    else if(data.type==="rematch"){this.removeFromMatch(session);if(!this.waiting.includes(session.id))this.waiting.push(session.id);this.broadcastQueue();this.formMatches()}
  }
  cleanInput(v){return{x:clamp(Number(v?.x)||0,-1,1),y:clamp(Number(v?.y)||0,-1,1),ax:clamp(Number(v?.ax)||0,-1,1),ay:clamp(Number(v?.ay)||0,-1,1),fire:!!v?.fire,ability:!!v?.ability,auxiliary:!!v?.auxiliary}}
  leaveQueue(session){this.waiting=this.waiting.filter(id=>id!==session.id);json(session.socket,{type:"queue",count:this.waiting.length,needed:MAX_PLAYERS});this.broadcastQueue()}
  broadcastQueue(){this.waiting=this.waiting.filter(id=>this.clients.has(id)&&!this.clients.get(id).matchId);const msg={type:"queue",count:this.waiting.length,needed:MAX_PLAYERS};for(const id of this.waiting){const s=this.clients.get(id);if(s)json(s.socket,msg)}}
  formMatches(){while(this.waiting.length>=MAX_PLAYERS){const ids=this.waiting.splice(0,MAX_PLAYERS),match=this.makeMatch(ids);this.matches.set(match.id,match);for(const p of match.players.values()){const s=this.clients.get(p.id);if(s){s.matchId=match.id;json(s.socket,{type:"match",matchId:match.id,playerId:p.id,team:p.team,map:match.map,players:[...match.players.values()].map(this.publicPlayer)})}}setTimeout(()=>{if(this.matches.has(match.id)){match.started=true;match.startedAt=Date.now();this.broadcastMatch(match,{type:"start",countdown:0})}},3000)}this.broadcastQueue()}
  makeMatch(ids){const id=`m${Date.now().toString(36)}${(++this.sequence).toString(36)}`,players=new Map();ids.forEach((sid,i)=>{const s=this.clients.get(sid),team=i<3?"blue":"red",slot=i%3,role=s?.role||"assault",spec=ROLES[role];players.set(sid,{id:sid,name:s?.name||"플레이어",role,skin:s?.skin||"neon",badge:s?.badge||"star",team,slot,x:team==="blue"?145:WIDTH-145,y:190+slot*170,ax:team==="blue"?1:-1,ay:0,hp:spec.hp,maxHp:spec.hp,alive:true,respawn:0,cool:0,abilityCd:0,kills:0,deaths:0,input:this.cleanInput()})});return{id,map:MAPS[Math.floor(Math.random()*MAPS.length)],players,crates:OBJECTS.crates(),bullets:[],blue:0,red:0,time:120,started:false,ended:false,lastTick:Date.now(),shotSeq:0}}
  publicPlayer(p){return{id:p.id,name:p.name,role:p.role,skin:p.skin,badge:p.badge,team:p.team,slot:p.slot,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10,ax:p.ax,ay:p.ay,hp:Math.max(0,Math.round(p.hp)),maxHp:p.maxHp,alive:p.alive,respawn:p.respawn,kills:p.kills,deaths:p.deaths}}
  ensureTimer(){if(!this.timer)this.timer=setInterval(()=>this.tick(),TICK_MS)}
  tick(){const now=Date.now();for(const match of this.matches.values()){if(!match.started||match.ended)continue;const dt=Math.min(.1,(now-match.lastTick)/1000);match.lastTick=now;match.time=Math.max(0,match.time-dt);for(const p of match.players.values())this.updatePlayer(match,p,dt);this.updateBullets(match,dt);if(match.time<=0||match.blue>=10||match.red>=10)this.endMatch(match);else this.broadcastMatch(match,{type:"snapshot",world:this.snapshot(match)})}if(!this.clients.size&&this.timer){clearInterval(this.timer);this.timer=null}}
  updatePlayer(match,p,dt){if(!p.alive){p.respawn-=dt;if(p.respawn<=0){p.alive=true;p.hp=p.maxHp;p.x=p.team==="blue"?145:WIDTH-145;p.y=190+p.slot*170}return}const spec=ROLES[p.role],i=p.input,d=Math.hypot(i.x,i.y)||1;const solids=[...MAP_DATA[match.map].obstacles,...match.crates],nx=clamp(p.x+i.x/d*spec.speed*dt,28,WIDTH-28),ny=clamp(p.y+i.y/d*spec.speed*dt,28,HEIGHT-28);if(!OBJECTS.blocked(nx,p.y,28,solids))p.x=nx;if(!OBJECTS.blocked(p.x,ny,28,solids))p.y=ny;if(Math.hypot(i.ax,i.ay)>.15){const a=Math.hypot(i.ax,i.ay);p.ax=i.ax/a;p.ay=i.ay/a}p.cool=Math.max(0,p.cool-dt);p.abilityCd=Math.max(0,p.abilityCd-dt);if(i.fire&&p.cool<=0){p.cool=spec.rate;match.bullets.push({id:++match.shotSeq,owner:p.id,team:p.team,x:p.x,y:p.y,vx:p.ax*660,vy:p.ay*660,damage:spec.damage,life:1.3})}if(i.ability&&p.abilityCd<=0){p.abilityCd=10;if(p.role==="support"){for(const ally of match.players.values())if(ally.team===p.team&&ally.alive&&Math.hypot(ally.x-p.x,ally.y-p.y)<190)ally.hp=Math.min(ally.maxHp,ally.hp+35)}else if(p.role==="tank")p.hp=Math.min(p.maxHp,p.hp+45);else p.cool=0}p.input.ability=false;p.input.auxiliary=false}
  updateBullets(match,dt){
    for(let i=match.bullets.length-1;i>=0;i--){
      const b=match.bullets[i],nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;
      let target=null,nearest=Infinity;
      for(const o of [...MAP_DATA[match.map].obstacles,...match.crates.filter(o=>o.hp>0)]){
        const t=OBJECTS.segment(b.x,b.y,nx,ny,o,6);if(t<nearest){nearest=t;target=o;}
      }
      for(const p of match.players.values())if(p.alive&&p.team!==b.team){
        const dx=nx-b.x,dy=ny-b.y,ox=b.x-p.x,oy=b.y-p.y,A=dx*dx+dy*dy,B=2*(ox*dx+oy*dy),C=ox*ox+oy*oy-31*31,D=B*B-4*A*C;
        const t=C<=0?0:A>0&&D>=0?(-B-Math.sqrt(D))/(2*A):Infinity;
        if(t>=0&&t<=1&&t<nearest){nearest=t;target=p;}
      }
      b.life-=dt;
      if(target){
        if(target.destructible)target.hp=Math.max(0,target.hp-b.damage);
        else if(target.team){target.hp-=b.damage;if(target.hp<=0){target.alive=false;target.respawn=3;target.deaths++;const killer=match.players.get(b.owner);if(killer){killer.kills++;match[killer.team]++;this.broadcastMatch(match,{type:"kill",killer:killer.name,victim:target.name,team:killer.team});}}}
        match.bullets.splice(i,1);continue;
      }
      b.x=nx;b.y=ny;if(b.life<=0||nx<0||nx>WIDTH||ny<0||ny>HEIGHT)match.bullets.splice(i,1);
    }
  }
  snapshot(m){return{crates:m.crates.map(o=>({...o})),map:m.map,time:m.time,blue:m.blue,red:m.red,players:[...m.players.values()].map(this.publicPlayer),bullets:m.bullets.map(b=>({id:b.id,team:b.team,x:b.x,y:b.y})),ended:m.ended}}
  endMatch(match){match.ended=true;const winner=match.blue===match.red?"draw":match.blue>match.red?"blue":"red";this.broadcastMatch(match,{type:"end",winner,world:this.snapshot(match)});setTimeout(()=>{for(const p of match.players.values()){const s=this.clients.get(p.id);if(s)s.matchId=null}this.matches.delete(match.id)},30000)}
  broadcastMatch(match,message){for(const p of match.players.values()){const s=this.clients.get(p.id);if(s)json(s.socket,message)}}
  removeFromMatch(session){const match=this.matches.get(session.matchId);if(match){match.players.delete(session.id);this.broadcastMatch(match,{type:"left",playerId:session.id,name:session.name});if(!match.players.size)this.matches.delete(match.id)}session.matchId=null}
  disconnect(session){this.waiting=this.waiting.filter(id=>id!==session.id);this.removeFromMatch(session);this.clients.delete(session.id);this.broadcastQueue()}
}
