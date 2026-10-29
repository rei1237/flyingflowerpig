// Mechanical alpha-component extraction and atlas packing; never crop at assumed grid lines.
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const fs = require('node:fs');
async function pack(input, key) {
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info, ids=new Int32Array(w*h), queue=new Int32Array(w*h), components=[];
 let id=0;
 for(let p=0;p<w*h;p++){
  if(ids[p]||data[p*4+3]<32)continue;
  id++;let head=0,tail=1;queue[0]=p;ids[p]=id;
  let x0=w,y0=h,x1=0,y1=0,sx=0,sy=0,weight=0;
  while(head<tail){const n=queue[head++],x=n%w,y=Math.floor(n/w),a=data[n*4+3];
   x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   const body=a>220&&(key!=='yeoni'||(data[n*4]>220&&data[n*4+1]>145&&data[n*4+1]<230));
   if(body){sx+=x;sy+=y;weight++;}
   for(const v of [x>0?n-1:-1,x<w-1?n+1:-1,n-w,n+w])if(v>=0&&v<w*h&&!ids[v]&&data[v*4+3]>=32){ids[v]=id;queue[tail++]=v;}
  }
  components.push({id,n:tail,x0,y0,x1,y1,cx:weight?sx/weight:(x0+x1)/2,cy:weight?sy/weight:(y0+y1)/2});
 }
 const bodies=components.filter(c=>c.n>10000).sort((a,b)=>a.cy-b.cy);
 if(bodies.length!==24)throw Error(`Expected 24 isolated characters, found ${bodies.length}`);
 const ordered=[];for(let row=0;row<6;row++)ordered.push(...bodies.slice(row*4,row*4+4).sort((a,b)=>a.cx-b.cx));
 // Rows 1–3 form the wingbeat; reverse the downstroke to return smoothly without celebration frames.
 const order=key==='yeoni'?[0,1,2,4,4,5,6,6,8,9,10,11,10,9,8,6,16,17,18,19,20,21,22,23]:Array.from({length:24},(_,i)=>i);
 const sources=order.map(i=>ordered[i]);
 const span=Math.max(...sources.map(c=>2*Math.max(c.cx-c.x0,c.x1-c.cx,c.cy-c.y0,c.y1-c.cy)+10));
 const scale=216/span, layers=[], report=[];
 for(let frame=0;frame<24;frame++){
  const c=sources[frame], left=Math.max(0,c.x0-2),top=Math.max(0,c.y0-2),cw=Math.min(w-left,c.x1-left+3),ch=Math.min(h-top,c.y1-top+3);
  const out=Buffer.alloc(cw*ch*4);
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const n=(top+y)*w+left+x;let keep=ids[n]===c.id;
   // Retain two pixels of antialias around this character, never pixels owned by its neighbor.
   if(!keep&&ids[n]===0&&data[n*4+3]>0)for(let dy=-2;dy<=2&&!keep;dy++)for(let dx=-2;dx<=2;dx++){
    const xx=left+x+dx,yy=top+y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&ids[yy*w+xx]===c.id){keep=true;break;}
   }
   if(keep)data.copy(out,(y*cw+x)*4,n*4,n*4+4);
  }
  const rw=Math.round(cw*scale),rh=Math.round(ch*scale);
  const tile=await sharp(out,{raw:{width:cw,height:ch,channels:4}}).resize(rw,rh).png().toBuffer();
  const x=Math.round(128-(c.cx-left)*scale),y=Math.round(128-(c.cy-top)*scale);
  if(x<12||y<12||x+rw>244||y+rh>244)throw Error('Unsafe sprite gutter');
  layers.push({input:tile,left:frame%4*256+x,top:Math.floor(frame/4)*256+y});
  report.push({frame,source:order[frame],bounds:[x,y,rw,rh],anchor:[128,128]});
 }
 const atlas=sharp({create:{width:1024,height:1536,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers);
 const png=await atlas.png().toBuffer();
 await sharp(png).webp({lossless:true}).toFile(`assets/sprites/${key}-v3.webp`);
 await sharp(png).extract({left:0,top:0,width:256,height:256}).webp({lossless:true}).toFile(`assets/sprites/${key}-portrait-v3.webp`);
 fs.writeFileSync(`assets/sprites/${key}-v3.json`,JSON.stringify({size:[1024,1536],cell:256,alphaThreshold:32,frames:report},null,2)+'\n');
 console.log(key,'packed 24 frames with clear gutters; scale',scale);
}
(async()=>{await pack(process.argv[2],'yeoni');await pack(process.argv[3],'yeongnyangi');})().catch(e=>{console.error(e);process.exitCode=1});
