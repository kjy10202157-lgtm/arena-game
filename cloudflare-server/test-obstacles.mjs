import assert from 'node:assert/strict';
import {ArenaCoordinator} from './src/worker.js';
const a=new ArenaCoordinator({});
const m=a.makeMatch(['1','2','3','4','5','6']);m.map='factory';
const c=m.crates.find(c=>c.x===450&&c.y===330),p=m.players.get('1');
p.x=420;p.y=360;p.input={x:1,y:0};a.updatePlayer(m,p,.1);assert.equal(p.x,420,'intact crate blocks movement');
function shot(damage){m.bullets.push({x:400,y:360,vx:1000,vy:0,life:1,damage,team:'blue',owner:'1'});a.updateBullets(m,.1);}
shot(52);assert.equal(c.hp,48);shot(52);assert.equal(c.hp,0);assert.equal(m.blue,0,'crate gives no kill score');
a.updatePlayer(m,p,.1);assert(p.x>420,'destroyed crate permits movement');
assert.equal(a.snapshot(m).crates.find(o=>o.id===c.id).hp,0);
assert.equal(a.makeMatch(['1']).crates.find(o=>o.id===c.id).hp,100,'new match restores crates');
p.x=295;p.y=200;a.updatePlayer(m,p,.1);assert.equal(p.x,295,'permanent wall blocks');
m.bullets=[{x:290,y:200,vx:1000,vy:0,life:1,damage:999,team:'blue'}];a.updateBullets(m,.1);assert.equal(m.bullets.length,0,'wall stops fast projectile');
// A player in front of a crate is hit first.
const enemy=m.players.get('4');enemy.x=420;enemy.y=60;m.bullets=[{x:370,y:60,vx:1000,vy:0,life:1,damage:22,team:'blue',owner:'1'}];a.updateBullets(m,.1);assert.equal(enemy.hp,78);assert.equal(m.crates[0].hp,100);
console.log('PASS: damage, destruction, passage, reset, snapshot, walls and nearest target');
