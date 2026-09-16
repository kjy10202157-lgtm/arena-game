(function () {
  'use strict';
  const P=NEON_PROFILE, root=document.querySelector('#profile-screen');
  const $p=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const format=n=>Math.round(n||0).toLocaleString('ko-KR');
  const tabs=[...root.querySelectorAll('[data-profile-tab]')];
  let currentTab='overview';
  function message(text){$p('profile-message').textContent=text;}
  function switchTab(id,focus=false){
    currentTab=id;
    for(const tab of tabs){const selected=tab.dataset.profileTab===id;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;$p('p54-'+tab.dataset.profileTab).hidden=!selected;if(selected&&focus)tab.focus();}
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>switchTab(tab.dataset.profileTab));
    tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();switchTab(tabs[next].dataset.profileTab,true);}});
  });
  function storeIdentity(key,value){state.profile.identity[key]=value;const saved=saveProfile();renderProfile();if(saved)message('저장했어요. 다음에 열어도 그대로 유지됩니다.');}
  function option(parent,key,value,label,selected,unlocked=true,note=''){
    const b=el('button','p54-option',label);b.type='button';b.id='p54-option-'+key+'-'+value;b.setAttribute('aria-pressed',String(selected));
    if(note)b.append(el('small','',note));
    if(!unlocked){b.classList.add('locked');b.setAttribute('aria-disabled','true');}
    b.onclick=()=>{if(!unlocked){message(note||'아직 해금되지 않았어요.');return;}storeIdentity(key,value);};parent.append(b);return b;
  }
  function renderCard(p){
    const card=$p('p54-card'),role=P.ROLES[p.identity.role];
    card.style.setProperty('--card-color',P.THEMES[p.identity.theme].color);
    card.style.setProperty('--accent',P.ACCENTS[p.identity.accent].color);
    card.style.setProperty('--skin',SKINS[p.skin].color);
    card.classList.toggle('prism',p.identity.frame==='prism');
    card.querySelector('.p54-body').setAttribute('rx',p.identity.role==='tank'?'9':'19');
    $p('p54-title').textContent=P.title(p);$p('p54-name').textContent=p.name;
    $p('p54-main-role').textContent=role.icon+' '+role.name+' · 숙련도 '+P.level(p.mastery[p.identity.role].xp).level+'단계';
    $p('p54-avatar-role').textContent=role.icon;$p('p54-avatar-role').style.color=role.color;
    $p('p54-card').querySelector('svg').setAttribute('aria-label',role.name+' · '+SKINS[p.skin].label+' 미리보기');
    const showcase=$p('p54-showcase');showcase.replaceChildren();
    for(let i=0;i<3;i++){
      const badge=P.BADGES.find(b=>b.id===p.identity.showcase[i]&&b.test(p));
      const slot=el('div','p54-showcase-slot'+(badge?'':' empty'));
      slot.append(el('b','',badge?badge.icon:'＋'),el('span','',badge?badge.name:'업적을 전시하세요'));showcase.append(slot);
    }
  }
  function renderMastery(p){
    const grid=$p('p54-mastery');grid.replaceChildren();
    for(const [key,role] of Object.entries(P.ROLES)){
      const m=p.mastery[key],l=P.level(m.xp),details=el('details','p54-mastery-card'),summary=el('summary');
      details.style.setProperty('--role-color',role.color);
      const head=el('div','p54-mastery-head');head.append(el('strong','',role.icon+' '+role.name),el('span','',l.level+'단계 · '+l.name));
      const bar=el('progress');bar.max=100;bar.value=l.percent;bar.setAttribute('aria-label',role.name+' 숙련도 진행률');
      summary.append(head,bar,el('small','',l.max?'최고 숙련도 달성':format(l.current)+' / '+format(l.needed)+' XP'),el('span','p54-mastery-hint',role.note+' ⌄'));
      details.append(summary);
      const data=el('div','p54-mastery-data');
      const rows=[['경기',m.matches],['승리',m.wins],['처치',m.kills],['도움',m.assists]];
      if(key==='assault')rows.push(['피해량',m.damage]);
      if(key==='tank')rows.push(['방어량',m.blocked],['거점 유지',format(m.objective)+'초']);
      if(key==='sniper')rows.push(['명중률',m.shots?Math.round(m.hits/m.shots*100)+'%':'—'],['장거리 명중',m.longHits]);
      if(key==='support')rows.push(['아군 회복량',m.healing]);
      for(const [label,value] of rows){const r=el('div');r.append(el('span','',label),el('b','',typeof value==='string'?value:format(value)));data.append(r);}
      details.append(data);grid.append(details);
    }
  }
  function renderAchievements(p){
    $p('p54-earned-count').textContent=P.earned(p).length+' / '+P.BADGES.length+' 획득 · '+p.identity.showcase.length+'/3 전시';
    const grid=$p('p54-achievements');grid.replaceChildren();
    for(const badge of P.BADGES){
      const unlocked=badge.test(p),selected=p.identity.showcase.includes(badge.id),b=el('button','p54-achievement'+(unlocked?'':' locked'));
      b.id='p54-achievement-'+badge.id;b.type='button';b.setAttribute('aria-pressed',String(selected));
      if(!unlocked)b.setAttribute('aria-disabled','true');
      b.append(el('b','p54-badge-symbol',badge.icon));const copy=el('span');copy.append(el('strong','',badge.name),el('small','',unlocked?(selected?'✓ 전시 중 · 누르면 해제':'획득 완료 · 눌러서 전시'):badge.desc));b.append(copy);
      b.onclick=()=>{
        if(!badge.test(state.profile)){message(badge.desc+' 후 해금됩니다.');return;}
        const chosen=state.profile.identity.showcase;
        if(chosen.includes(badge.id))storeIdentity('showcase',chosen.filter(id=>id!==badge.id));
        else if(chosen.length<3)storeIdentity('showcase',[...chosen,badge.id]);
        else message('최대 3개를 전시할 수 있어요. 전시 중인 배지를 눌러 해제해 주세요.');
      };grid.append(b);
    }
  }
  function renderRecords(p){
    const favorite=Object.entries(p.mastery).sort((a,b)=>b[1].matches-a[1].matches)[0];
    $p('p54-favorite').textContent=favorite[1].matches?'가장 많이 플레이한 역할: '+P.ROLES[favorite[0]].name+' · '+format(favorite[1].matches)+'경기':'첫 경기를 마치면 주로 사용하는 역할이 표시됩니다.';
    const list=$p('p54-history');list.replaceChildren();
    if(!p.history.length){list.append(el('div','p54-empty','아직 새 경기 기록이 없어요. 3대3·점령전·웨이브·보스전을 마치면 이곳에 기록됩니다.'));return;}
    for(const r of p.history){
      const row=el('details','p54-history-row '+r.result),summary=el('summary'),result={win:'승리',loss:'패배',draw:'무승부'}[r.result],date=new Date(r.at);
      summary.append(el('b','p54-result',result));const text=el('span','p54-history-copy');
      text.append(el('strong','',P.ROLES[r.role].name+' · '+P.MODES[r.mode]),el('small','',date.toLocaleDateString('ko-KR',{month:'short',day:'numeric'})+' '+date.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' · '+format(r.kills)+'처치 '+format(r.assists)+'도움'));
      summary.append(text,el('span','p54-history-xp','+'+r.masteryXp+' XP ⌄'));row.append(summary);
      const stats=el('div','p54-history-details');
      for(const [label,value] of [['맵',MAPS[r.map]?.label||r.map],['시간',format(r.elapsed)+'초'],['사망',format(r.deaths)],['피해량',format(r.damage)],['아군 회복',format(r.healing)],['방어량',format(r.blocked)],['명중률',r.shots?Math.round(r.hits/r.shots*100)+'%':'—'],['거점 유지',format(r.objective)+'초']]){
        const item=el('div');item.append(el('span','',label),el('b','',value));stats.append(item);
      }
      row.append(stats);list.append(row);
    }
  }
  function renderCustom(p){
    const i=p.identity;
    for(const key of ['role','theme','accent','frame','title'])$p('p54-'+key+'-options').replaceChildren();
    for(const [key,r] of Object.entries(P.ROLES))option($p('p54-role-options'),'role',key,r.icon+' '+r.name,i.role===key);
    for(const [key,t] of Object.entries(P.THEMES))option($p('p54-theme-options'),'theme',key,t.name,i.theme===key).style.setProperty('--swatch',t.color);
    for(const [key,a] of Object.entries(P.ACCENTS))option($p('p54-accent-options'),'accent',key,a.name,i.accent===key).style.setProperty('--swatch',a.color);
    option($p('p54-frame-options'),'frame','line','클래식 라인',i.frame==='line');
    option($p('p54-frame-options'),'frame','prism','✦ 프리즘',i.frame==='prism',P.frameUnlocked(p),'아무 역할 숙련도 5단계');
    option($p('p54-title-options'),'title','rookie','네온 개척자',i.title==='rookie');
    for(const [key,r] of Object.entries(P.ROLES))option($p('p54-title-options'),'title',key,r.title,i.title===key,P.level(p.mastery[key].xp).level>=3,r.name+' 숙련도 3단계');
  }
  function render(){
    const p=state.profile,focus=root.contains(document.activeElement)?document.activeElement.id:null;
    renderCard(p);renderMastery(p);renderAchievements(p);renderRecords(p);renderCustom(p);switchTab(currentTab);
    if(focus&&$p(focus))$p(focus).focus({preventScroll:true});
  }
  window.NEON_PROFILE_UI={render,open(){switchTab('overview');root.querySelector('.profile-panel').scrollTop=0;tabs[0].focus({preventScroll:true});}};
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeProfile();document.querySelector('#profile-card').focus();}});
  render();
})();
