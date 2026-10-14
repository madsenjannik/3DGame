// @ts-nocheck
// Timed rides: disciplines, medals, seeded daily rivals and leaderboards (today / week / all time). Local-only prototype.
export const DISC={
  lap_horse:{n:'Fastest lap',m:'Horse',mount:'horse',med:[31,35,40]},
  lap_bike:{n:'Fastest lap',m:'Bike',mount:'bike',med:[29,32,36]},
  jump:{n:'Jumping',m:'Horse',mount:'horse',med:[30,36,45]}};
export const SCOPES=[['day','Today'],['week','This week'],['all','All time']];
const NAMES=['Aloe','Cactus','Daisy','Fern','Sigurd','Moss','Nettle','Clover','Reed','Birch','Poppy','Tidsel-Thora'];
function rng(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);
  return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const dayKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function weekKeys(){const d=new Date();d.setHours(12,0,0,0);const wd=(d.getDay()+6)%7,out=[];
  for(let i=wd;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);out.push(dayKey(x));}return out;}
function rivals(disc,key,fast){const r=rng(disc+'|'+key),g=DISC[disc].med,pool=NAMES.slice(),n=5+Math.floor(r()*3),out=[];
  const lo=g[0]*(fast?0.93:0.98),hi=g[2]*(fast?0.96:1.12);
  for(let i=0;i<n;i++){const name=pool.splice(Math.floor(r()*pool.length),1)[0],q=r();out.push({name,t:Math.round((lo+(hi-lo)*q*q)*100)/100});}
  return out;}
const bestBy=list=>{const m=new Map();list.forEach(e=>{const k=e.you?'__you':e.name;if(!m.has(k)||e.t<m.get(k).t)m.set(k,e);});return[...m.values()].sort((a,b)=>a.t-b.t);};
export function board(disc,scope,runs){const today=dayKey(),wk=weekKeys(),list=[];
  const mine=runs.filter(r=>r.disc===disc&&(scope==='all'||(scope==='day'?r.day===today:wk.includes(r.day)))).map(r=>({name:'You',t:r.t,you:true}));
  if(scope==='day')list.push(...rivals(disc,today));
  else{wk.forEach(k=>list.push(...rivals(disc,k)));if(scope==='all')for(let i=0;i<5;i++)list.push(...rivals(disc,'legend'+i,1));}
  return bestBy([...list,...mine]);}
export function medal(disc,t){const g=DISC[disc].med;return t<=g[0]?'gold':t<=g[1]?'silver':t<=g[2]?'bronze':null;}
