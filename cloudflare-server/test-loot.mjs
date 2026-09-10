import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ArenaCoordinator} from './src/worker.js';
const O=globalThis.NEON_OBSTACLES;
function readMaps(path){const src=fs.readFileSync(new URL(path,import.meta.url),'utf8');return vm.runInNewContext('('+src.match(/const MAPS=(.*?);/s)[1]+')');}
const maps=readMaps('../online6.js'),soloMaps=readMaps('../game.js');
let seed=711;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [w,h,data] of [[1200,720,maps],[1800,1100,soloMaps]])for(const [name,map] of Object.entries(data)){
 let previous=[];
 for(let n=0;n<300;n++){
  const cs=O.crates(w,h,map.obstacles,previous,random);
  assert.equal(cs.length,4,`${name} count at ${n}`);
  for(const c of cs){assert(c.hp===100);assert(!O.blocked(c.x+c.w/2,c.y+c.h/2,Math.max(c.w,c.h)/2,map.obstacles));assert(c.x>=w*.2&&c.x+c.w<=w*.8);}
  assert.notEqual(JSON.stringify(cs),JSON.stringify(previous));
  assert.equal(cs[0].x+cs[1].x+cs[0].w,w);
  previous=cs;
 }
}
const a=new ArenaCoordinator({}),m=a.makeMatch(['a','b']);m.map='factory';
m.crates=[{id:'test',x:450,y:330,w:60,h:60,hp:100,maxHp:100,destructible:true}];
for(let n=0;n<2;n++){m.bullets.push({x:430,y:360,vx:600,vy:0,life:1,damage:60,team:'blue',owner:'a'});a.updateBullets(m,.1);}
assert.equal(m.pickups.length,1);assert.equal(m.crates[0].hp,0);assert.equal(m.blue,0);
assert(!O.damage(m.crates[0],100));
const p=m.players.get('a'),q=m.players.get('b');Object.assign(p,{x:480,y:360,hp:50});Object.assign(q,{x:480,y:360,hp:50});m.pickups[0].type='heal';a.collectPickups(m);assert.equal(m.pickups.length,0);assert.equal(p.hp+q.hp,140);
for(const type of ['speed','haste']){m.pickups=[{x:p.x,y:p.y,type}];a.collectPickups(m);assert.equal(p[type==='speed'?'speedBuff':'haste'],8);}
p.input={x:0,y:0};a.updatePlayer(m,p,1);assert.equal(p.speedBuff,7);assert.equal(p.haste,7);assert.equal(a.snapshot(m).players[0].haste,7);a.updatePlayer(m,p,8);assert.equal(p.speedBuff,0);
p.hp=p.maxHp;q.hp=q.maxHp;m.pickups=[{x:p.x,y:p.y,type:'heal'}];a.collectPickups(m);assert.equal(m.pickups.length,1,'full-health players leave heal');
q.hp=50;q.alive=false;a.collectPickups(m);assert.equal(m.pickups.length,1,'dead players cannot collect');
assert.equal(a.snapshot(m).pickups.length,1);
console.log('PASS: 1800 map layouts, count, safe locations, new positions, drops, single collection, effects and snapshots');
