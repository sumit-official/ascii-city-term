#!/usr/bin/env node
// STATIC CITY - terminal edition. An abandoned ASCII city you can walk through.
// Run:  node ascii-city.js        (Node 14+, no packages needed)
// Best in a big terminal window (try 120x40 or larger) with a monospace font.
// Controls: W A S D move | arrows: left/right turn, up/down look | Shift run
//           F auto-walk | R rain | P or Ctrl+C quit
'use strict';
let HOR=23,COLS=100,ROWS=30,K=31;
const EYE=.5,MAXD=42,N=77;
const PAL=[[240,100,50],[235,215,70],[60,130,240],[70,210,120],[70,210,230],[230,70,210],[150,150,165],[240,60,60],[110,110,125],[60,170,70],[40,110,220],[90,220,220],[0,0,0],[255,225,120],[255,255,255],[150,105,65],[175,235,60]];
const FAC=[1,.75,.52,.34,.2];
const ci=(p,l)=>p*5+Math.min(4,l);
function hs(a,b,c=0){let h=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(c,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)%1000}

// ---------- map ----------
const H=new Float32Array(N*N),P=new Uint8Array(N*N),FL=new Uint8Array(N*N),BLK=new Uint8Array(N*N),TY=new Uint8Array(N*N);
const TV=new Uint8Array(N*N),TZ=new Float32Array(N*N);
for(let y=0;y<N;y++)for(let x=0;x<N;x++){
 const i=y*N+x,rx=x%11,ry=y%11,bx=x/11|0,by=y/11|0,road=rx<3||ry<3;
 const lake=((x-46)**2+(y-34)**2)<150;
 if(road){FL[i]=lake?4:0;
 }else if(lake){FL[i]=3;BLK[i]=1}
 else if(rx==3||rx==10||ry==3||ry==10)FL[i]=1;
 else if(hs(bx,by,7)<190){FL[i]=2;if(hs(x,y,3)<230){const q=hs(x,y,11)%100,v=q<32?0:q<48?1:q<64?2:q<80?3:4,u=hs(x,y,4)/1000,z=[1.4+u*.6,1.9+u*.7,.35,1.8+u*.6,1.4+u*.6][v];TV[i]=v;TZ[i]=z;H[i]=z+[.7,1.15,.45,.75,.7][v];TY[i]=1;P[i]=3;BLK[i]=1}}
 else{const sx=(rx-4)/3|0,sy=(ry-4)/3|0,s=sx*2+sy,dc=Math.hypot(x-38,y-38);
  H[i]=(5+hs(bx,by,s)/1000*13)*(1+Math.max(0,1-dc/50));P[i]=hs(bx,by,10+s)%6;BLK[i]=1;FL[i]=1}
 if(x==0||y==0||x==N-1||y==N-1){H[i]=4;P[i]=6;BLK[i]=1;TY[i]=0;FL[i]=1}
}
for(let y=0;y<4;y++)for(let x=0;x<4;x++){const i=y*N+x;if(x&&y){H[i]=0;BLK[i]=0;TY[i]=0}}
// fences along the water's edge
for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const i=y*N+x;
 if(BLK[i]||H[i]||FL[i]==3)continue;
 if(FL[i-1]==3||FL[i+1]==3||FL[i-N]==3||FL[i+N]==3){H[i]=.3;TY[i]=4;BLK[i]=1;P[i]=6}}
// close the corners: join diagonal fence cells so fences always meet at right angles
const add=[];
for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){if(TY[y*N+x]!=4)continue;
 for(const [a,b] of[[1,1],[1,-1]]){
  if(TY[(y+b)*N+x+a]!=4)continue;
  const p=y*N+x+a,q=(y+b)*N+x;
  if(TY[p]==4||TY[q]==4)continue;
  for(const k of[p,q])if(!BLK[k]&&!H[k]&&FL[k]!=3){add.push(k);break}}}
for(const k of add){H[k]=.3;TY[k]=4;BLK[k]=1;P[k]=6}
// street lamps on sidewalks, with a pool of warm light around each
const LIT=new Uint8Array(N*N);
for(let y=2;y<N-2;y++)for(let x=2;x<N-2;x++){const i=y*N+x;
 if(FL[i]!=1||BLK[i]||H[i]||(x+y)%4||hs(x,y,12)>=260)continue;
 H[i]=2.6;TY[i]=5;BLK[i]=1;P[i]=15;TV[i]=hs(x,y,13)%2;
 for(let b=-3;b<=3;b++)for(let a=-3;a<=3;a++){const j=(y+b)*N+x+a,v=3-(Math.hypot(a,b)|0);if(v>0&&v>LIT[j])LIT[j]=v}}
// parked cars: 2 cells long, one wide, with facing
const CAX=new Uint8Array(N*N),CF=new Uint8Array(N*N),CP=new Uint8Array(N*N);
for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){
 const rx=x%11,ry=y%11;let ax=-1,x2=x,y2=y;
 if(rx<3&&ry>=3&&(rx==0||rx==2)&&y%2==0&&(y+1)%11>=3){ax=1;y2=y+1}
 else if(ry<3&&rx>=3&&(ry==0||ry==2)&&x%2==0&&(x+1)%11>=3){ax=0;x2=x+1}
 if(ax<0||hs(x,y,5)>=170)continue;
 const i=y*N+x,j=y2*N+x2;
 if(FL[i]||FL[j]||H[i]||H[j]||y2>=N-1||x2>=N-1)continue;
 const f=hs(x,y,8)%2,c=[0,1,2,5,7,4,3][hs(x,y,6)%7];
 for(const [k,p] of [[i,0],[j,1]]){H[k]=.8;TY[k]=2;BLK[k]=1;P[k]=c;CAX[k]=ax;CF[k]=f;CP[k]=p}
}
const shards=[];
for(let s=0;shards.length<8;s++){const x=3+hs(s,1,9)%(N-6),y=3+hs(s,2,9)%(N-6),i=y*N+x;
 if(FL[i]==0&&!BLK[i]&&Math.hypot(x,y)>8){H[i]=1.3;TY[i]=3;P[i]=13;shards.push(i)}}
// ---------- state ----------
let px=1.5,py=1.5,ang=.78,pitch=0,got=0,flash=0,rain=false,T=0,hudText='';
const keys={};
let CHs=[],CLs=new Int16Array(1),drops=[];
function resize(){
 COLS=Math.max(40,Math.min(200,(process.stdout.columns||100)-1));
 ROWS=Math.max(12,Math.min(60,(process.stdout.rows||32)-2));
 K=COLS*.3125; // keeps square proportions (terminal cells are about twice as tall as wide)
 CHs=new Array(COLS*ROWS).fill(' ');CLs=new Int16Array(COLS*ROWS);
 drops=Array.from({length:Math.round(COLS*ROWS/40)},()=>[Math.random()*COLS|0,Math.random()*ROWS|0]);
 if(process.stdout.isTTY)process.stdout.write('\x1b[2J');
}
function put(x,r,ch,c){const i=r*COLS+x;CHs[i]=ch;CLs[i]=c}
// data shard: a small glowing gold crystal floating and bobbing above the street
function crystalHit(i,x,r,rdx,rdy,dz,d){
 const ox=px-((i%N)+.5),oy=py-((i/N|0)+.5),zc=.75+.08*Math.sin(T*2+i),R=.3;
 for(let t=d;t<d+1.6;t+=.07){const f=Math.abs(ox+t*rdx)+Math.abs(oy+t*rdy)+Math.abs(EYE+t*dz-zc)*1.4;
  if(f<R){const e=f/R;return e<.35?['@',14]:e>.75?['#',13]:['8@'[hs(x,r,5)&1],13]}}
 return null}
// generic ray-vs-box (local space), returns [t, faceAxis, faceSign] or null
function slab(o,d,b){let tn=-1e9,tf=1e9,fa=0,fs=0;
 for(let a=0;a<3;a++){const lo=b[a*2],hi=b[a*2+1];
  if(Math.abs(d[a])<1e-9){if(o[a]<lo||o[a]>hi)return null;continue}
  let t1=(lo-o[a])/d[a],t2=(hi-o[a])/d[a];const sg=d[a]>0?-1:1;if(t1>t2)[t1,t2]=[t2,t1];
  if(t1>tn){tn=t1;fa=a;fs=sg}if(t2<tf)tf=t2}
 return tn<=tf&&tn>0?[tn,fa,fs]:null}
// waist-high wooden fence (Minecraft style): centre post + two rails reaching each neighbouring fence cell
function fenceHit(i,x,r,rdx,rdy,dz){
 const o=[px-((i%N)+.5),py-((i/N|0)+.5),EYE],d=[rdx,rdy,dz];
 const bx=[[-.12,.12,-.12,.12,0,.3]];
 for(const [ex,ey,ni] of[[1,0,i+1],[-1,0,i-1],[0,1,i+N],[0,-1,i-N]])if(TY[ni]==4)
  for(const [z0,z1] of[[.07,.14],[.19,.27]])bx.push(ex?[ex>0?0:-.5,ex>0?.5:0,-.04,.04,z0,z1]:[-.04,.04,ey>0?0:-.5,ey>0?.5:0,z0,z1]);
 let bt=1e9,bk=0,bf=0;
 for(let k=0;k<bx.length;k++){const h=slab(o,d,bx[k]);if(h&&h[0]<bt){bt=h[0];bk=k?1:0;bf=h[1]}}
 if(bt>=1e9)return null;
 if(bk==0)return bf==2?['=',0]:['#',bf==0?0:1];
 return bf==2?['-',0]:['=',1];
}
// ornate double street lamp: base, pole, arm with two glowing lanterns
const LB=[[-.2,.2,-.2,.2,0,.2,0],[-.14,.14,-.14,.14,.2,.42,0],[-.036,.036,-.036,.036,2.3,2.58,0],[-.36,.36,-.03,.03,2.16,2.22,0]];
for(const s of[1,-1]){const m=(a,b)=>s>0?[a,b]:[-b,-a];
 LB.push([...m(.31,.37),-.03,.03,2.06,2.34,0],[...m(.24,.44),-.1,.1,2.0,2.06,0],[...m(.28,.4),-.06,.06,1.66,1.72,0],[...m(.26,.42),-.08,.08,1.72,2.0,1])}
function lampHit(i,x,r,rdx,rdy,dzp){
 let ox=px-((i%N)+.5),oy=py-((i/N|0)+.5),dx=rdx,dy=rdy;const dz=dzp;
 if(TV[i]){[ox,oy]=[oy,ox];[dx,dy]=[dy,dx]}
 const o=[ox,oy,EYE],d=[dx,dy,dz];let bt=1e9,bb=null,bf=0,pole=false;
 for(const b of LB){const h=slab(o,d,b);if(h&&h[0]<bt){bt=h[0];bb=b;bf=h[1]}}
 const A=dx*dx+dy*dy,B=2*(ox*dx+oy*dy),D=B*B-4*A*(ox*ox+oy*oy-.0025);
 if(D>=0&&A>1e-9){const t=(-B-Math.sqrt(D))/(2*A),z=EYE+t*dz;if(t>0&&t<bt&&z>.42&&z<2.3){bt=t;pole=true;bb=null}}
 if(bt>=1e9)return null;
 if(pole)return[(r&1)?'I':'|',15,0,0];
 if(bb[6]){const hx=ox+bt*dx,hy=oy+bt*dy,cx=Math.abs(hx)-.34;
  if(bf==2)return['8',1,0,1];
  if(bf==0?Math.abs(hy)>.065:Math.abs(cx)>.065)return['|',15,0,0];
  const f=hs(x,r,(T*5)|0);return['8@O0%'[f%5],f<400?1:0,0,1]}
 return[bf==2?'=':'#',15,1,0];
}
// five tree kinds, each a set of ellipsoid crowns [dx,dy,dz,radiusXY,radiusZ] + trunk radius:
// 0 oak, 1 tall narrow cypress, 2 low bush, 3 birch (white trunk), 4 autumn tree (orange/red)
const TT=[
 {s:[[0,0,0,.4,.4],[.2,-.1,.35,.3,.3],[-.18,.15,.25,.3,.3]],tr:.08},
 {s:[[0,0,0,.25,.8],[0,0,.7,.15,.4]],tr:.06},
 {s:[[0,0,0,.42,.3],[.1,.08,.15,.3,.25]],tr:0},
 {s:[[0,0,0,.3,.45],[.12,-.08,.4,.22,.3],[-.1,.1,.3,.2,.3]],tr:.05},
 {s:[[0,0,0,.42,.42],[.2,-.1,.35,.3,.3],[-.18,.15,.25,.3,.3]],tr:.08}];
function treeHit(i,x,r,rdx,rdy,dzp){
 const ty=TV[i],tt=TT[ty],ox=px-((i%N)+.5),oy=py-((i/N|0)+.5),dx=rdx,dy=rdy,dz=dzp,zc=TZ[i];
 const A=dx*dx+dy*dy,B=2*(ox*dx+oy*dy);let bt=1e9,kind=0,nz=0;
 if(tt.tr){const D=B*B-4*A*(ox*ox+oy*oy-tt.tr*tt.tr);
  if(D>=0&&A>1e-9){const t=(-B-Math.sqrt(D))/(2*A),z=EYE+t*dz;if(t>0&&z>=0&&z<=zc){bt=t;kind=1}}}
 for(const [sx,sy,sz,rx,rz] of tt.s){
  const q=rx/rz,lx=ox-sx,ly=oy-sy,lz=(EYE-(zc+sz))*q,e=dz*q,a=dx*dx+dy*dy+e*e,b=2*(lx*dx+ly*dy+lz*e),c=lx*lx+ly*ly+lz*lz-rx*rx,dd=b*b-4*a*c;
  if(dd>=0){const t=(-b-Math.sqrt(dd))/(2*a);if(t>0&&t<bt){bt=t;kind=2;nz=(lz+t*e)/rx}}}
 if(!kind)return null;
 if(kind==1){const f=hs(x,r,4)<350;return ty==3?[f?'I':'|',f?6:14,0]:[(r&1)?'|':'I',15,0]}
 const br=nz*.5+.5+(hs(x,r,5)-500)/1500,ch='B8&@%#*;'[hs(x,r,6)%8],o=br<.3?2:br<.5?1:0;
 let p;
 if(ty==1)p=br>.6?3:9;else if(ty==2)p=br>.7?16:3;else if(ty==3)p=br>.55?16:br>.3?3:9;
 else if(ty==4)p=br>.75?1:br>.4?0:7;else p=hs(x,r,7)<40?4:br>.78?16:br>.45?3:9;
 return[ch,p,ty==1?Math.min(2,o+1):o];
}
// real car geometry in local space: +lx = front, ly = across, z = up
const BOX=[[-.95,.95,-.4,.4,.14,.46],[-.62,.38,-.36,.36,.46,.8]],WH=[[.6,1],[.6,-1],[-.6,1],[-.6,-1]];
function carHit(i,x,r,rdx,rdy,dzp){
 const ax=CAX[i],cp=CP[i],X=i%N,Y=i/N|0;
 let cx,cy;if(ax==0){cx=X-cp+1;cy=Y+.5}else{cx=X+.5;cy=Y-cp+1}
 let ox=px-cx,oy=py-cy,dx=rdx,dy=rdy;const dz=dzp;
 if(ax==1){[ox,oy]=[oy,ox];[dx,dy]=[dy,dx]}
 if(!CF[i]){ox=-ox;dx=-dx}
 const o=[ox,oy,EYE],d=[dx,dy,dz];
 let bt=1e9,bk=-1,bf=0,bs=0,bw=0;
 for(let k=0;k<2;k++){const b=BOX[k];let tn=-1e9,tf=1e9,fa=0,fs=0,ok=true;
  for(let a=0;a<3;a++){const lo=b[a*2],hi=b[a*2+1];
   if(Math.abs(d[a])<1e-9){if(o[a]<lo||o[a]>hi){ok=false;break}continue}
   let t1=(lo-o[a])/d[a],t2=(hi-o[a])/d[a];const sg=d[a]>0?-1:1;
   if(t1>t2)[t1,t2]=[t2,t1];
   if(t1>tn){tn=t1;fa=a;fs=sg}if(t2<tf)tf=t2}
  if(ok&&tn<=tf&&tn>0&&tn<bt){bt=tn;bk=k;bf=fa;bs=fs}}
 for(const [wc,sy] of WH){
  const lo=Math.min(sy*.33,sy*.43),hi=Math.max(sy*.33,sy*.43);
  const ex=ox-wc,ez=EYE-.17,A=dx*dx+dz*dz,B=2*(ex*dx+ez*dz),C=ex*ex+ez*ez-.0289,D=B*B-4*A*C;
  if(D>=0&&A>1e-9){const t=(-B-Math.sqrt(D))/(2*A),yy=oy+t*dy;if(t>0&&t<bt&&yy>=lo&&yy<=hi){bt=t;bk=2;bw=wc}}
  if(Math.abs(dy)>1e-9){const t=((sy>0?hi:lo)-oy)/dy,e1=ex+t*dx,e2=ez+t*dz;
   if(t>0&&t<bt&&e1*e1+e2*e2<.0289){bt=t;bk=3;bw=wc}}}
 if(bk<0)return null;
 const hx=ox+bt*dx,hy=oy+bt*dy,hz=EYE+bt*dz,ay=Math.abs(hy),col=P[i];
 const glass=()=>hs(x,r,3)<200?['/',4,0]:['#',4,3];
 if(bk==2)return['O',6,3];
 if(bk==3){const rr=Math.hypot(hx-bw,hz-.17);return rr<.04?['*',6,0]:rr<.1?['o',6,0]:['O',6,3]}
 const fr=bf==0&&bs>0,rear=bf==0&&bs<0;
 if(bk==0){
  if(bf==0){
   if(ay<.13&&hz>.16&&hz<.26)return['W115'[x&3],14,0];
   if(hz<.22)return['=',6,0];
   if(hz>.26&&hz<.4&&ay>.17&&ay<.36)return fr?['@',1,0]:['#',7,0];
   if(fr&&ay<.14&&hz>.26&&hz<.4)return[(x&1)?'#':'+',6,1];
   return[(r&1)?'=':'#',col,0]}
  if(bf==1){
   if(hz<.2)return['_',col,3];
   if(hx>.88&&hz>.26&&hz<.4)return['@',1,0];
   if(hx<-.88&&hz>.26&&hz<.4)return['#',7,0];
   if(Math.abs(hx-.15)<.03||Math.abs(hx+.45)<.03)return['|',col,2];
   if(hz>.41)return['-',6,1];
   return[(r&1)?'=':'#',col,1]}
  return(hx>.8&&ay<.05)?['*',6,0]:['=',col,0]}
 if(bf==1){
  if(hx>-.5&&hx<.28&&hz>.52&&hz<.76&&Math.abs(hx+.1)>.03)return glass();
  return['|',col,1]}
 if(bf==0){if(ay<.3&&hz>.5&&hz<.76)return glass();return['=',col,1]}
 return['=',col,0];
}
// moon direction (fixed in the sky) and its screen-independent basis
const MA=2.4,ME=.45,MX=Math.cos(MA)*Math.cos(ME),MY=Math.sin(MA)*Math.cos(ME),MZ=Math.sin(ME),MC=Math.hypot(MX,MY);
const AX=-MY/MC,AY=MX/MC,BX=-MZ*MX/MC,BY=-MZ*MY/MC,BZ=MC;
// one sky cell: stars (fixed bins on the dome) and the half moon
function skyCell(x,r,Dx,Dy,Dz,len){
 const el=Math.asin(Math.max(-1,Math.min(1,Dz/len))),eb=Math.floor(el/.025);
 const nA=Math.max(1,Math.floor(6.283*Math.cos(eb*.025)/.0133)),ab=Math.floor((Math.atan2(Dy,Dx)+Math.PI)/6.283*nA)%nA;
 const band=Math.abs((Dx*.3+Dy*.5+Dz*.8)/len)<.12,th=band?60:20;
 if(hs(ab,eb,3)<th&&!(hs(ab,eb,6)<150&&(((T*3)|0)+ab)%3==0)){
  const b=hs(ab,eb,4),t=hs(ab,eb,5);
  put(x,r,b<100?'*':b<450?'+':'.',ci(t<200?4:t<330?1:14,Math.min(4,(b<100?0:b<450?1:2)+(el<.12?1:0))))}
 if((Dx*MX+Dy*MY+Dz*MZ)/len>.9){
  const u=(Dx*AX+Dy*AY)/len,v=(Dx*BX+Dy*BY+Dz*BZ)/len,dd=Math.hypot(u,v);
  if(dd<=.125){
   if(Math.hypot(u+.055,v)>.125){const cr=hs(Math.floor(u/.0133),Math.floor(v/.025),9)<130;put(x,r,cr?'o':dd>.1?'0':'@',ci(13,cr?2:0))}
   else if(dd>.108)put(x,r,'.',ci(14,3))}}
}
// Every character cell casts its own true 3D ray (yaw + pitch), so looking up
// rotates the camera instead of sliding the world: buildings keep their size.
function render(){
 CLs.fill(-1);
 const dx=Math.cos(ang),dy=Math.sin(ang),sp=Math.sin(pitch),cp=Math.cos(pitch),MAXT=48,MAXH=40;
 for(let x=0;x<COLS;x++){
  const rg=(2*x/COLS-1)*.8;
  for(let r=0;r<ROWS;r++){
   const up=(ROWS/2-r-.5)/K;
   const Dx=dx*cp-dy*rg-dx*sp*up,Dy=dy*cp+dx*rg-dy*sp*up,Dz=sp+cp*up,len=Math.hypot(Dx,Dy,Dz);
   const hx=Dx/len,hy=Dy/len,hz=Dz/len,hl=Math.hypot(hx,hy);
   let tlim=MAXT,ground=false,tg=0;
   if(hz<-1e-6){tg=-EYE/hz;if(tg<tlim){tlim=tg;ground=true}}
   else if(hz>1e-6){const ts=(MAXH-EYE)/hz;if(ts<tlim)tlim=ts}
   let mx=px|0,my=py|0;const ddx=Math.abs(1/hx),ddy=Math.abs(1/hy),stx=hx<0?-1:1,sty=hy<0?-1:1;
   let sdx=(hx<0?px-mx:mx+1-px)*ddx,sdy=(hy<0?py-my:my+1-py)*ddy,done=false;
   for(let n=0;n<120;n++){
    let tn,side;
    if(sdx<sdy){tn=sdx;sdx+=ddx;mx+=stx;side=0}else{tn=sdy;sdy+=ddy;my+=sty;side=1}
    if(tn>tlim||mx<0||my<0||mx>=N||my>=N)break;
    const i=my*N+mx,h=H[i];if(h<=0)continue;
    const tx=Math.min(sdx,sdy),zi=EYE+tn*hz,zo=EYE+tx*hz;
    if(Math.min(zi,zo)>h)continue;
    const ty=TY[i],l=((tn*hl/7)|0)+side;let ch,c;
    if(ty==1){const q=treeHit(i,x,r,hx,hy,hz);if(!q)continue;ch=q[0];c=ci(q[1],l+q[2])}
    else if(ty==2){const q=carHit(i,x,r,hx,hy,hz);if(!q)continue;ch=q[0];c=ci(q[1],l+q[2])}
    else if(ty==3){const q=crystalHit(i,x,r,hx,hy,hz,tn);if(!q)continue;ch=q[0];c=ci(q[1],Math.min(1,l))}
    else if(ty==4){const q=fenceHit(i,x,r,hx,hy,hz);if(!q)continue;ch=q[0];c=ci(15,l+q[1])}
    else if(ty==5){const q=lampHit(i,x,r,hx,hy,hz);if(!q)continue;ch=q[0];c=ci(q[1],q[3]?Math.min(1,l):l+q[2])}
    else{if(zi>h)continue;
     const w=side==0?py+tn*hy:px+tn*hx,u=w-Math.floor(w),iy=zi/1.3,ix=u*3|0,jy=iy|0;
     if(u<.05||u>.95){ch='|';c=ci(P[i],l)}
     else if(iy-jy<.2){ch='=';c=ci(P[i],l+2)}
     else{const lit=hs(i,side*7+ix,jy)<520;ch=lit?'OXZ8'[hs(ix,jy,i)%4]:'.';c=ci(P[i],l+(lit?0:2))}}
    put(x,r,ch,c);done=true;break}
   if(done)continue;
   if(!ground){skyCell(x,r,Dx,Dy,Dz,len);continue}
   // ground
   const wx=px+hx*tg,wy=py+hy*tg,gx=wx|0,gy=wy|0;
   if(wx<0||wy<0||gx>=N||gy>=N)continue;
   const i=gy*N+gx,fx=wx-gx,fy=wy-gy,l=Math.min(4,tg*hl/8|0),f=FL[i];let ch,c;
   if(f==0){const rx=gx%11,ry=gy%11;
    if(rx==1&&ry>2&&fx>.35&&fx<.65&&(fy*2|0)==0){ch='|';c=ci(1,l+1)}
    else if(ry==1&&rx>2&&fy>.35&&fy<.65&&(fx*2|0)==0){ch='-';c=ci(1,l+1)}
    else{ch=hs(gx*3+(fx*3|0),gy*3+(fy*3|0))<500?'.':':';c=ci(8,l)}}
   else if(f==1){ch=hs(gx,gy,(fx*2|0)+(fy*2|0)*2)<300?'-':'_';c=ci(6,l+1)}
   else if(f==2){ch=hs(gx,gy,(fx*3|0)+(fy*3|0))<500?'"':',';c=ci(9,l)}
   else if(f==3){ch=((fx*4+fy*4+T*2)|0)%3?'~':'\u2248';c=ci(10,l)}
   else{ch=(fy*4|0)%2?'=':'#';c=ci(11,l)}
   if(LIT[i]&&f!=3)c=ci(13,Math.min(4,l+3-LIT[i]));
   put(x,r,ch,c)
  }}
 if(rain){for(const dr of drops){dr[1]=(dr[1]+2)%ROWS;dr[0]=(dr[0]+(Math.random()<.3?1:0))%COLS;put(dr[0],dr[1],'/',ci(4,1))}}

}
// ---------- terminal output ----------
const TRUE=/truecolor|24bit/i.test(process.env.COLORTERM||'');
const q6=v=>Math.round(v/51);
const fgSeq=(r,g,b)=>TRUE?`\x1b[38;2;${r};${g};${b}m`:`\x1b[38;5;${16+36*q6(r)+6*q6(g)+q6(b)}m`;
const bgSeq=(r,g,b)=>TRUE?`\x1b[48;2;${r};${g};${b}m`:`\x1b[48;5;${16+36*q6(r)+6*q6(g)+q6(b)}m`;
const FGS=[];for(let p=0;p<PAL.length;p++)for(let l=0;l<5;l++){const b=PAL[p],f=FAC[l];FGS.push(fgSeq(b[0]*f|0,b[1]*f|0,b[2]*f|0))}
function present(){
 const dx=Math.cos(ang),dy=Math.sin(ang),sp=Math.sin(pitch),cp=Math.cos(pitch),out=['\x1b[H'];
 const lerp=(a,b,t)=>a+(b-a)*t;
 for(let r=0;r<ROWS;r++){
  const up=(ROWS/2-r-.5)/K,sky=r<HOR;let line='',curBg='',cur=-1,base=null;
  if(sky){const el=Math.asin(Math.max(0,Math.min(1,(sp+cp*up)/Math.sqrt(1+up*up)))),g=Math.pow(Math.max(0,1-el/1.3),1.6);
   line+=bgSeq(lerp(4,16,g)|0,lerp(3,8,g)|0,lerp(14,34,g)|0)} // faint night sky, a touch lighter at the horizon
  else line+='\x1b[40m';
  for(let x=0;x<COLS;x++){
   const i=r*COLS+x,c=CLs[i];
   if(c<0){line+=' ';continue}
   if(c!==cur){line+=FGS[c];cur=c}
   line+=CHs[i]}
  out.push(line+'\x1b[0m\x1b[K\r\n')}
 out.push('\x1b[0m\x1b[97m'+hudText.slice(0,COLS)+'\x1b[K\r\n');
 out.push('\x1b[90m'+' WASD move  \u2190\u2192 turn  \u2191\u2193 look  Shift run  F auto-walk  R rain  P quit'.slice(0,COLS)+'\x1b[0m\x1b[K');
 process.stdout.write(out.join(''));
}
function blocked(x,y){const gx=x|0,gy=y|0;return gx<0||gy<0||gx>=N||gy>=N||BLK[gy*N+gx]}
function step(dt){
 T+=dt;flash-=dt;
 pitch+=((keys.KeyZ||keys.PageUp?1:0)-(keys.KeyX||keys.PageDown?1:0))*1.4*dt;pitch=Math.max(-1.5708,Math.min(1.5708,pitch));
 HOR=Math.round(ROWS/2+K*Math.tan(Math.max(-1.55,Math.min(pitch,1.55))));
 const sp=(keys.ShiftLeft||keys.ShiftRight?6:3.2)*dt;let mx=0,my=0;
 const fw=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),sd=(keys.KeyD?1:0)-(keys.KeyA?1:0);
 mx=Math.cos(ang)*fw-Math.sin(ang)*sd;my=Math.sin(ang)*fw+Math.cos(ang)*sd;
 const nx=px+mx*sp,ny=py+my*sp,r=.25;
 if(!blocked(nx+Math.sign(mx)*r,py)&&!blocked(nx+Math.sign(mx)*r,py+r)&&!blocked(nx+Math.sign(mx)*r,py-r))px=nx;
 if(!blocked(px,ny+Math.sign(my)*r)&&!blocked(px+r,ny+Math.sign(my)*r)&&!blocked(px-r,ny+Math.sign(my)*r))py=ny;
 ang+=((keys.ArrowRight||keys.KeyE?1:0)-(keys.ArrowLeft||keys.KeyQ?1:0))*2*dt;
 for(const s of shards)if(H[s]>0&&Math.hypot((s%N)+.5-px,(s/N|0)+.5-py)<1.6){H[s]=0;TY[s]=0;got++;flash=2}
 hudText=`SHARDS ${got}/8 (floating gold crystals)`+(flash>0?'  Shard collected!':'')+(got==8?'  All shards found - the city hums back to life, for you alone.':'')+(rain?'  rain':'');
}

// ---------- input & main loop ----------
const until={};let auto=false;
function press(code,ms=240){keys[code]=true;until[code]=performance.now()+ms}
function quit(){
 if(process.stdin.isTTY)process.stdin.setRawMode(false);
 process.stdout.write('\x1b[0m\x1b[?1049l\x1b[?25h');
 process.exit(0);
}
function onData(buf){
 const s=buf.toString();
 for(let i=0;i<s.length;){
  if(s[i]=='\x1b'&&s[i+1]=='['){
   let j=i+2;while(j<s.length&&!/[A-Za-z~]/.test(s[j]))j++;
   const seq=s.slice(i+2,j+1);i=j+1;
   if(seq=='A'||seq=='5~')press('KeyZ');else if(seq=='B'||seq=='6~')press('KeyX');
   else if(seq=='C')press('ArrowRight');else if(seq=='D')press('ArrowLeft');
   continue}
  const ch=s[i++],lo=ch.toLowerCase();
  if(ch=='\u0003'||lo=='p'){quit();return}
  if('wasdqezx'.includes(lo)&&ch!==' '){press('Key'+lo.toUpperCase());if(ch!==lo)press('ShiftLeft');if(lo=='s')auto=false}
  else if(lo=='f')auto=!auto;
  else if(lo=='r')rain=!rain;
 }
}
let last=performance.now();
function frame(){
 const now=performance.now(),dt=Math.min(.1,(now-last)/1000);last=now;
 for(const k in until)if(now>until[k]){keys[k]=false;delete until[k]}
 if(auto)keys.KeyW=true;
 step(dt);render();present();
 setTimeout(frame,Math.max(1,33-(performance.now()-now)));
}
resize();
process.stdout.on('resize',resize);
process.on('SIGINT',quit);process.on('SIGTERM',quit);
process.stdout.write('\x1b[?1049h\x1b[?25l');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdin.resume();process.stdin.on('data',onData);
frame();
