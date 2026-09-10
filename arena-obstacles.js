// Shared by the browser and the authoritative Worker.
(() => {
  function crates(w=1200,h=720) {
    return [[450,30],[690,30],[450,330],[690,330],[450,630],[690,630]].map(([x,y],id)=>({id:`crate-${id}`,x:x*w/1200,y:y*h/720,w:60*w/1200,h:60*h/720,hp:100,maxHp:100,destructible:true}));
  }
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
  globalThis.NEON_OBSTACLES={crates,blocked,segment,draw};
})();
