// Shared by the browser and the authoritative Worker.
(() => {
  function crates(w=1200,h=720,walls=[],previous=[],random=Math.random) {
    const sx=w/1200,sy=h/720,sizeX=60*sx,sizeY=60*sy,gap=20*Math.min(sx,sy),result=[];
    const make=(x,y)=>({x,y,w:sizeX,h:sizeY,hp:100,maxHp:100,destructible:true});
    const overlaps=(a,b,pad)=>a.x-pad<b.x+b.w&&a.x+a.w+pad>b.x&&a.y-pad<b.y+b.h&&a.y+a.h+pad>b.y;
    const candidates=[];
    for(let x=240;x<=480;x+=40)for(let y=65;y<=595;y+=35)candidates.push([x*sx,y*sy]);
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    for(const [x,y] of candidates){
      const pair=[make(x,y),make(w-x-sizeX,y)];
      if(pair.some(c=>walls.some(o=>overlaps(c,o,gap))||result.some(o=>overlaps(c,o,100*Math.min(sx,sy)))||previous.some(o=>Math.hypot((c.x-o.x)/sx,(c.y-o.y)/sy)<30)))continue;
      result.push(...pair);if(result.length===4)break;
    }
    return result.map((c,id)=>({...c,id:`crate-${id}`}));
  }
  function drop(c,random=Math.random){return{id:`drop-${c.id}`,x:c.x+c.w/2,y:c.y+c.h/2,p:0,type:['heal','haste','speed'][Math.floor(random()*3)]};}
  function damage(c,amount){if(c.hp<=0)return false;c.hp=Math.max(0,c.hp-amount);return c.hp===0;}
  function drawPickup(ctx,p){const data={heal:['+','#50efa7','회복'],haste:['⚡','#42d8ff','속사'],speed:['≫','#ff9b4a','가속']}[p.type];if(!data)return;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=data[1];ctx.shadowColor=data[1];ctx.shadowBlur=12;ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#07111e';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(data[0],0,0);ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.fillText(data[2],0,27);ctx.restore();}
  function blocked(x,y,r,items) { return items.some(o=>(!o.destructible||o.hp>0)&&x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h); }
  function segment(x,y,nx,ny,o,r=0) {
    let lo=0,hi=1;
    for(const [p,d,min,max] of [[x,nx-x,o.x-r,o.x+o.w+r],[y,ny-y,o.y-r,o.y+o.h+r]]) {
      if(Math.abs(d)<1e-9) { if(p<min||p>max)return Infinity; }
      else { let a=(min-p)/d,b=(max-p)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return Infinity; }
    }
    return lo;
  }
  function draw(ctx,o) {
    ctx.save();
    if(o.hp<=0){ctx.globalAlpha=.35;ctx.fillStyle='#bd8446';for(let i=0;i<5;i++)ctx.fillRect(o.x+8+i*o.w/7,o.y+o.h/2+(i%2)*9,9,6);ctx.restore();return;}
    ctx.fillStyle=o.hp<40?'#71452d':'#986334';ctx.fillRect(o.x,o.y,o.w,o.h);
    ctx.strokeStyle='#ffd48a';ctx.lineWidth=3;ctx.strokeRect(o.x+3,o.y+3,o.w-6,o.h-6);
    ctx.beginPath();ctx.moveTo(o.x+7,o.y+7);ctx.lineTo(o.x+o.w-7,o.y+o.h-7);ctx.moveTo(o.x+o.w-7,o.y+7);ctx.lineTo(o.x+7,o.y+o.h-7);ctx.stroke();
    if(o.hp<o.maxHp){ctx.fillStyle='#151522';ctx.fillRect(o.x,o.y-10,o.w,5);ctx.fillStyle='#ffd45c';ctx.fillRect(o.x,o.y-10,o.w*o.hp/o.maxHp,5);}
    ctx.restore();
  }
  globalThis.NEON_OBSTACLES={crates,blocked,segment,draw,drop,damage,drawPickup};
})();
