/* Profile progression is cosmetic and never changes combat strength. */
(function (root) {
  'use strict';
  const ROLES = {
    assault: {name:'돌격형', icon:'⚡', color:'#42d8ff', title:'선봉대장', note:'공격 피해 · 처치 · 도움'},
    tank: {name:'탱커형', icon:'◆', color:'#b5a1ff', title:'철벽 수호자', note:'피해 방어 · 거점 유지'},
    sniper: {name:'저격형', icon:'◎', color:'#ffd45c', title:'정밀 사수', note:'명중 · 장거리 명중'},
    support: {name:'지원형', icon:'✚', color:'#67edbb', title:'든든한 동료', note:'아군 회복 · 처치 도움'}
  };
  const MODES = {classic:'3대3', domination:'점령전', wave:'웨이브', boss:'보스전'};
  const LEVELS = [0, 80, 200, 400, 700, 1100];
  const RANKS = ['입문','견습','숙련','전문','달인','마스터'];
  const THEMES = {midnight:{name:'미드나잇',color:'#193c62'},aurora:{name:'오로라',color:'#164f48'},dusk:{name:'트와일라잇',color:'#47315f'}};
  const ACCENTS = {cyan:{name:'시안',color:'#78e6ff'},mint:{name:'민트',color:'#8cf3cb'},gold:{name:'골드',color:'#ffe18a'},pink:{name:'로즈',color:'#ffb2d5'}};
  const BADGES = [
    {id:'debut',name:'첫 출전',icon:'↗',desc:'첫 경기 완료',test:p=>p.stats?.matches>=1},
    {id:'hunter',name:'네온 사냥꾼',icon:'◎',desc:'누적 25회 처치',test:p=>p.stats?.kills>=25},
    {id:'victory',name:'승리의 시작',icon:'⚑',desc:'첫 승리',test:p=>p.stats?.wins>=1},
    {id:'wave',name:'웨이브 마스터',icon:'≈',desc:'웨이브 5 도달',test:p=>p.stats?.bestWave>=5},
    {id:'guardian',name:'가디언 브레이커',icon:'♛',desc:'보스 1회 격파',test:p=>p.stats?.bossWins>=1},
    {id:'upgraded',name:'한계 돌파',icon:'✦',desc:'한 역할의 모든 강화 완료',test:p=>Object.values(p.upgrades||{}).some(r=>r.hp>=5&&r.damage>=5&&r.speed>=5)},
    ...Object.entries(ROLES).map(([id,r])=>({id:'mastery-'+id,name:r.title,icon:r.icon,desc:r.name+' 숙련도 3단계',test:p=>level(p.mastery?.[id]?.xp).level>=3}))
  ];
  const numeric = (v,max=1e9) => Math.min(max, Math.max(0, Number.isFinite(Number(v)) ? Number(v) : 0));
  const integer = (v,max) => Math.floor(numeric(v,max));
  const pick = (catalog,key,fallback) => Object.hasOwn(catalog,key) ? key : fallback;
  function emptyStats(){return {kills:0,deaths:0,shots:0,hits:0,damage:0,assists:0,healing:0,blocked:0,objective:0,longHits:0,elapsed:0};}
  function level(xp=0){
    xp=integer(xp);let i=0;while(i<LEVELS.length-1&&xp>=LEVELS[i+1])i++;
    const max=i===LEVELS.length-1,needed=max?0:LEVELS[i+1]-LEVELS[i],current=max?0:xp-LEVELS[i];
    return {level:i+1,name:RANKS[i],max,current,needed,percent:max?100:Math.min(100,current/needed*100)};
  }
  function loadExtras(saved={}) {
    saved=saved&&typeof saved==='object'?saved:{};
    const old=saved.identity||{},mastery={};
    for(const role of Object.keys(ROLES)) {
      const src=saved.mastery?.[role]||{}, m={xp:integer(src.xp),matches:integer(src.matches),wins:integer(src.wins)};
      for(const key of Object.keys(emptyStats()))m[key]=numeric(src[key]);
      m.wins=Math.min(m.wins,m.matches);mastery[role]=m;
    }
    const history=(Array.isArray(saved.history)?saved.history:[]).filter(r=>r&&Object.hasOwn(ROLES,r.role)&&Object.hasOwn(MODES,r.mode)&&['win','loss','draw'].includes(r.result)&&Number.isFinite(r.at)&&r.at>0).slice(0,10).map(r=>{
      const row={id:String(r.id||r.at).slice(0,80),at:r.at,role:r.role,mode:r.mode,map:['factory','crossfire','corridor'].includes(r.map)?r.map:'factory',result:r.result,masteryXp:integer(r.masteryXp,150)};
      for(const key of Object.keys(emptyStats()))row[key]=numeric(r[key]);return row;
    });
    const extra={profileVersion:54,mastery,history,identity:{role:pick(ROLES,old.role,'assault'),theme:pick(THEMES,old.theme,'midnight'),accent:pick(ACCENTS,old.accent,'cyan'),frame:old.frame==='prism'?'prism':'line',title:Object.hasOwn(ROLES,old.title)?old.title:'rookie',showcase:[...new Set(Array.isArray(old.showcase)?old.showcase:[])].filter(id=>BADGES.some(b=>b.id===id)).slice(0,3)}};
    const p={...saved,...extra};
    extra.identity.showcase=extra.identity.showcase.filter(id=>BADGES.find(b=>b.id===id).test(p));
    if(extra.identity.title!=='rookie'&&level(mastery[extra.identity.title].xp).level<3)extra.identity.title='rookie';
    if(!frameUnlocked(p))extra.identity.frame='line';
    return extra;
  }
  function frameUnlocked(p){return Object.values(p.mastery||{}).some(m=>level(m.xp).level>=5);}
  function title(p){return ROLES[p.identity.title]?.title||'네온 개척자';}
  function earned(p){return BADGES.filter(b=>b.test(p));}
  function reward(role,stats,win){
    const s={};for(const k of Object.keys(emptyStats()))s[k]=numeric(stats[k]);
    const contribution=role==='tank'?s.blocked/25+s.objective/4:role==='sniper'?s.hits*1.5+s.longHits*3:role==='support'?s.healing/12+s.assists*4:s.damage/50;
    return Math.min(150,Math.round(15+(win?10:0)+Math.min(40,s.kills*3+s.assists*2)+Math.min(45,contribution)));
  }
  function record(p,match){
    if(!match.id||!Object.hasOwn(MODES,match.mode)||!Object.hasOwn(ROLES,match.role)||p.history.some(r=>r.id===match.id))return null;
    const before=level(p.mastery[match.role].xp),stats={};
    for(const k of Object.keys(emptyStats()))stats[k]=numeric(match[k]);
    stats.hits=Math.min(stats.hits,stats.shots);
    const won=match.result==='win',xp=reward(match.role,stats,won),m=p.mastery[match.role];
    m.xp+=xp;m.matches++;if(won)m.wins++;
    for(const key of Object.keys(stats))m[key]+=stats[key];
    p.history.unshift({id:match.id,at:match.at||Date.now(),role:match.role,mode:match.mode,map:match.map,result:['win','draw'].includes(match.result)?match.result:'loss',masteryXp:xp,...stats});
    p.history=p.history.slice(0,10);
    const after=level(m.xp),unlocks=[];
    if(before.level<3&&after.level>=3)unlocks.push(ROLES[match.role].title+' 칭호·배지');
    if(before.level<5&&after.level>=5)unlocks.push('프리즘 테두리');
    return {xp,level:after.level,leveled:after.level>before.level,unlocks};
  }
  root.NEON_PROFILE={ROLES,MODES,THEMES,ACCENTS,BADGES,level,loadExtras,emptyStats,record,reward,title,earned,frameUnlocked};
})(globalThis);
