const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const site=fs.existsSync(path.join(__dirname,'../site/game.js'))?path.join(__dirname,'../site'):path.join(__dirname,'..');
class Element {
  constructor(){this.style={setProperty(){}};this.dataset={};this.children=[];this.value='';this.textContent='';this.classList={contains:()=>false,add(){},remove(){},toggle(){}};this.width=1000;this.height=700;}
  querySelector(){return new Element()} querySelectorAll(){return []} addEventListener(){} replaceChildren(...v){this.children=v} append(...v){this.children.push(...v)} prepend(v){this.children.unshift(v)} remove(){} setAttribute(){} getBoundingClientRect(){return {left:0,top:0,width:1000,height:700}} focus(){}
  getContext(){return new Proxy({measureText:()=>({width:20}),createLinearGradient:()=>({addColorStop(){}})}, {get:(t,k)=>t[k]||(()=>{})})}
}
const legacy={name:'기존 유저',skin:'mint',badge:'bolt',xp:1500,coins:321,stats:{matches:12,wins:4,kills:35,bestWave:5,bossWins:1},upgrades:{assault:{hp:3,damage:2,speed:1}},claimed:{first_hunt:true},season:{id:'season-1',xp:600,claimed:{3:true}},extraFutureField:'keep'};
const storage=new Map([['neon-clash-profile-v1',JSON.stringify(legacy)]]),elements=new Map();
const context={console,Math,Date,JSON,Set,Map,performance:{now:()=>1000},crypto:{randomUUID:()=>Math.random().toString(36)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},document:{querySelector:s=>{if(!elements.has(s))elements.set(s,new Element());return elements.get(s)},querySelectorAll:()=>[],getElementById:id=>{if(!elements.has('#'+id))elements.set('#'+id,new Element());return elements.get('#'+id)},createElement:()=>new Element(),addEventListener(){},documentElement:new Element()},navigator:{},innerWidth:1000,innerHeight:700,devicePixelRatio:1,matchMedia:()=>({matches:false}),addEventListener(){},requestAnimationFrame(){},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){}};
context.window=context;vm.createContext(context);
for(const file of ['profile-system.js','arena-obstacles.js','game.js'])vm.runInContext(fs.readFileSync(path.join(site,file),'utf8'),context,{filename:file});
const run=s=>vm.runInContext(s,context),plain=v=>JSON.parse(JSON.stringify(v));
assert.equal(run('state.profile.name'),legacy.name);assert.equal(run('state.profile.coins'),321);assert.equal(run('state.profile.xp'),1500);assert.equal(run('state.profile.skin'),'mint');assert.equal(run('state.profile.upgrades.assault.hp'),3);assert.equal(run('state.profile.claimed.first_hunt'),true);assert.equal(run('state.profile.season.claimed[3]'),true);assert.equal(run('state.profile.extraFutureField'),'keep');
assert.deepEqual(JSON.parse(storage.get('neon-clash-profile-backup-pre54')),legacy);
assert.equal(run('NEON_PROFILE.earned(state.profile).length'),5);
run('state.settings.sound=false;state.settings.music=false;state.settings.vibration=false;state.selectedClass="support";state.selectedMode="classic";reset();');
run('fighters[0].hp=fighters[0].maxHp-20;fighters[2].hp=fighters[2].maxHp;fighters[0].x=me().x;fighters[0].y=me().y;fighters[2].x=me().x;fighters[2].y=me().y;useAbility();');
assert.equal(run('matchStats.healing'),20,'only actual ally healing counts');
run('me().abilityCd=0;useAbility()');assert.equal(run('matchStats.healing'),20,'overhealing gives no XP');
run('fighters[0].hp=fighters[0].maxHp-10;useAuxiliary()');assert.equal(run('matchStats.healing'),30);
run('const target=fighters.find(f=>f.team==="red");target.inv=0;hit(target,{damage:10,fromPlayer:true,ownerId:me().id,team:"blue",originX:0,originY:0});hit(target,{damage:1000,fromPlayer:false,ownerId:fighters[0].id,team:"blue"});');
assert.equal(run('matchStats.assists'),1,'player contribution counts as assist');
run('finish("blue")');assert.equal(run('state.profile.history.length'),1);assert.equal(run('state.profile.mastery.support.matches'),1);assert.equal(run('state.profile.mastery.support.healing'),30);
const first=plain(run('state.profile'));run('finish("blue")');assert.deepEqual(plain(run('state.profile')),first,'finish cannot grant duplicate reward');
run('state.profile=loadProfile()');assert.deepEqual(plain(run('state.profile')),first,'reload preserves new and old data');
run('state.selectedClass="tank";reset();me().inv=0;hit(me(),{damage:50,team:"red",ownerId:"red-0"});');assert.equal(run('matchStats.blocked'),9);
run('me().inv=2;me().shield=2;hit(me(),{damage:25,team:"red",ownerId:"red-0"});');assert.equal(run('matchStats.blocked'),34);
run('me().shield=0;hit(me(),{damage:25,team:"red",ownerId:"red-0"});');assert.equal(run('matchStats.blocked'),34,'spawn invulnerability excluded');
run('state.selectedMode="domination";reset();me().x=WORLD.w/2;me().y=WORLD.h/2;updateDomination(1);');assert.equal(run('matchStats.objective'),1);
run('fighters.find(f=>f.team==="red").x=me().x;fighters.find(f=>f.team==="red").y=me().y;updateDomination(1);');assert.equal(run('matchStats.objective'),1,'contested zone gives no control time');
run('state.selectedClass="sniper";state.selectedMode="classic";reset();const victim=fighters.find(f=>f.team==="red");victim.inv=0;hit(victim,{damage:10,fromPlayer:true,team:"blue",ownerId:me().id,originX:victim.x-500,originY:victim.y});');assert.equal(run('matchStats.longHits'),1);
const beforeTraining=plain(run('state.profile'));
run('state.selectedMode="tutorial";reset();finish("blue");');assert.deepEqual(plain(run('state.profile')),beforeTraining);
run('state.selectedMode="practice";reset();finish("blue");');assert.deepEqual(plain(run('state.profile')),beforeTraining);
run('state.selectedMode="classic";reset();returnToSelection()');assert.deepEqual(plain(run('state.profile')),beforeTraining,'aborted match gives no reward');
run('state.profile.mastery.support.xp=195;state.selectedClass="support";reset();finish("blue");');assert.equal(run('NEON_PROFILE.level(state.profile.mastery.support.xp).level'),3);assert.ok(run('state.profileReward.unlocks.includes("든든한 동료 칭호·배지")'));
run('state.profile.identity.title="support";state.profile.identity.theme="aurora";state.profile.identity.showcase=["debut","victory","mastery-support"];saveProfile();state.profile=loadProfile();');assert.equal(run('state.profile.identity.title'),'support');assert.equal(run('state.profile.identity.showcase.length'),3);
run('for(let i=0;i<12;i++){state.selectedClass="assault";reset();finish("red")}');assert.equal(run('state.profile.history.length'),10);assert.equal(run('state.profile.mastery.assault.matches'),12);
const P=context.NEON_PROFILE,bad=P.loadExtras({identity:{role:'bad',title:'tank',frame:'prism',showcase:['debut','debut','bad']},mastery:{tank:{xp:-100}},history:[]});assert.equal(bad.identity.role,'assault');assert.equal(bad.identity.title,'rookie');assert.equal(bad.identity.frame,'line');assert.equal(bad.identity.showcase.length,0);
assert.equal(P.level(1100).max,true);assert.equal(P.reward('support',{healing:240},false),35);assert.equal(P.reward('tank',{blocked:250},false),25);
console.log('PASS: migration + legacy backup, real combat healing/blocking/assists/objectives/long hits, single award, reload, training exclusion, unlocks and history cap');
