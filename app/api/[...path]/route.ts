import { verifiedPlaces, geoDistance, normalizePhoton } from '../../../lib/places';
import { getPlatform } from '../../../lib/platform';
import { getAppUser } from '../../../lib/auth';
export const dynamic='force-dynamic';
const E=()=>getPlatform();
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
const clip=(v:any,n=150)=>String(v??'').slice(0,n);
async function throttle(id:string){const now=Date.now();const r=await E().DB.prepare('INSERT INTO service_requests (id,last) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET last=excluded.last WHERE last<?').bind(id,now,now-1100).run();return r.meta.changes>0;}
async function cached(key:string,fetcher:()=>Promise<Response>){
 const db=E().DB;const hit=await db.prepare('SELECT value FROM service_cache WHERE id=? AND expires>?').bind(key,Date.now()).first();
 if(hit)return json(JSON.parse(hit.value));
 const response=await fetcher();
 if(response.ok){const raw=await response.clone().text();try{JSON.parse(raw);if(raw.length<800000)await db.prepare('INSERT INTO service_cache(id,value,expires) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,expires=excluded.expires').bind(key,raw,Date.now()+(key.includes('routed-foot')?86400000:3600000)).run();}catch{}}
 return response;
}
export async function GET(req:Request){try{
const u=new URL(req.url), p=u.pathname.replace('/api/',''), user=await getAppUser(req);
if(p==='me')return json({user:user?{name:user.fullName??user.email.split('@')[0]}:null});
if(!user)return json({error:'Sign in to continue.'},401);
const db=E().DB;
if(p==='state'){const r=await db.prepare('SELECT value FROM user_state WHERE user_id=?').bind(user.userId).first();return json(r?JSON.parse(r.value):{})}
if(p==='route'){
const points=JSON.parse(u.searchParams.get('points')??'[]');if(!Array.isArray(points)||points.length<2||points.length>10||points.some((p:any)=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>90||Math.abs(p[1])>180))return json({error:'Choose 2–10 valid stops.'},400);
const coordinates=points.map((p:number[])=>p[1]+','+p[0]).join(';');
const endpoint='https://routing.openstreetmap.de/routed-foot/route/v1/driving/'+coordinates+'?overview=full&geometries=geojson&steps=true';
return await cached(endpoint,async()=>{if(!await throttle('routing'))return json({error:'Please wait a moment before requesting another route.'},429);const r=await fetch(endpoint,{headers:{'User-Agent':'Flaneur/1.0 (scenic walking preview)'},signal:AbortSignal.timeout(18000)});if(!r.ok)return json({error:'Walking directions are unavailable. Try again shortly.'},503);const d:any=await r.json();if(!d.routes?.[0])return json({error:'No walking route found.'},404);const route=d.routes[0];return Response.json({geometry:route.geometry,distance:route.distance,duration:route.duration,steps:route.legs.flatMap((l:any)=>l.steps),source:'FOSSGIS pedestrian routing · OpenStreetMap'},{headers:{'Cache-Control':'public,max-age=86400'}})});
}
if(p==='places'){
 const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng'));if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return json({error:'Invalid location.'},400);
 const category=clip(u.searchParams.get('category')??'parks',30);const area=clip(u.searchParams.get('area')??(geoDistance(lat,lng,{lat:51.374,lng:-.10})<10000?'Croydon':'London'),80).split(',')[0];
 const tag=({parks:'leisure:park',cafes:'amenity:cafe',landmarks:'historic',views:'tourism:viewpoint',art:'tourism:artwork'} as any)[category]??'leisure:park';
 return await cached('places-v3/'+area+'/'+category+'/'+lat.toFixed(2)+'/'+lng.toFixed(2),async()=>{
 let places:any[]=[];let live=false;
 try{const q=category==='parks'?'park '+area:area;const url='https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&osm_tag='+encodeURIComponent(tag)+'&limit=20&lang=en';const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(r.ok){places=normalizePhoton(await r.json());live=true}}catch(e){console.warn('Named place provider unavailable',e instanceof Error?e.message:'Unknown error')}
 const nearby=places.filter(p=>geoDistance(lat,lng,p)<10000);
 for(const p of verifiedPlaces){if(geoDistance(lat,lng,p)<10000&&(category==='parks'?!!p.tags.leisure:category==='landmarks'?!!p.tags.historic:false)&&!nearby.some(x=>x.name.toLowerCase()===p.name.toLowerCase()))nearby.push(p)}
 nearby.sort((a,b)=>geoDistance(lat,lng,a)-geoDistance(lat,lng,b));
 if(!nearby.length&&!live)return json({error:'Live place search is unavailable here. You can still search a named destination and build a walk.'},503);
 return json({places:nearby,source:live?'OpenStreetMap / Photon; supplemented by checked local places':'Checked local places',updated:new Date().toISOString(),notice:nearby.length?'':'No matching named places found. Try a different category or search a destination.'});
 });
}
if(p==='sunset'){const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng'));if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return json({error:'Invalid location'},400);const endpoint='https://api.sunrise-sunset.org/json?lat='+lat.toFixed(3)+'&lng='+lng.toFixed(3)+'&date='+new Date().toISOString().slice(0,10)+'&formatted=0';return await cached(endpoint,async()=>{const r=await fetch(endpoint,{signal:AbortSignal.timeout(12000)});const d:any=await r.json();if(d.status!=='OK'||!d.results?.sunset)return json({error:'Sunset times unavailable.'},503);return Response.json({sunset:d.results.sunset},{headers:{'Cache-Control':'public,max-age=3600'}})});}
if(p==='search'){
 const q=clip(u.searchParams.get('q'),100);if(q.length<3)return json([]);const endpoint='https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&limit=8&lang=en';
 return await cached(endpoint,async()=>{const r=await fetch(endpoint,{signal:AbortSignal.timeout(12000)});if(!r.ok)return json({error:'Place search is temporarily unavailable. Please retry.'},503);let d:any;try{d=await r.json()}catch{return json({error:'Place search returned an unexpected response.'},502)}if(!Array.isArray(d.features))return json({error:'Place search returned an unexpected result.'},502);return json(d.features.map((f:any)=>({place_id:f.properties.osm_type+'-'+f.properties.osm_id,lat:f.geometry.coordinates[1],lon:f.geometry.coordinates[0],display_name:[f.properties.name,f.properties.street,f.properties.city,f.properties.country].filter(Boolean).join(', '),name:f.properties.name,city:f.properties.city,osm_type:({N:'node',W:'way',R:'relation'} as any)[f.properties.osm_type],osm_id:f.properties.osm_id})));});
}
if(p.startsWith('photo/')){const key=decodeURIComponent(p.slice(6));if(!key.startsWith(user.userId+'/'))return json({error:'Private photo.'},403);const obj=await E().BUCKET.get(key);return obj?new Response(obj.body,{headers:{'Content-Type':obj.httpMetadata?.contentType??'image/jpeg','Cache-Control':'private,max-age=3600'}}):json({error:'Photo unavailable.'},404)}
if(p.startsWith('walks/')){const id=p.split('/')[1];const walk=await db.prepare('SELECT * FROM shared_walks WHERE id=?').bind(id).first();if(!walk)return json({error:'Invitation not found.'},404);const members=await db.prepare('SELECT user_id,name,status,lat,lng,expires,summary FROM members WHERE walk_id=?').bind(id).all();const joined=members.results.some((m:any)=>m.user_id===user.userId&&m.status==='joined');return json({...walk,route:JSON.parse(walk.route),host:undefined,isHost:walk.host===user.userId,members:members.results.map((m:any)=>({name:m.name,status:m.status,isYou:m.user_id===user.userId,summary:m.summary?JSON.parse(m.summary):null,location:joined&&m.expires>Date.now()?{lat:m.lat,lng:m.lng}:null}))})}
if(p==='reports'){const r=await db.prepare('SELECT kind,note,created FROM reports WHERE route_id=? ORDER BY created DESC LIMIT 15').bind(clip(u.searchParams.get('route'))).all();return json(r.results)}
return json({error:'Not found'},404);
}catch(error){console.error('Flaneur request failed',error instanceof Error?error.message:'Unknown service error');return json({error:'Nearby services are temporarily unavailable. You can retry or search another area.'},503)}}
export async function POST(req:Request){try{
const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return json({error:'Invalid origin'},403);
const user=await getAppUser(req);if(!user)return json({error:'Sign in to continue.'},401);const p=new URL(req.url).pathname.replace('/api/',''),db=E().DB;
if(p==='photo'){const blob=await req.blob();if(blob.size>4e6||!['image/jpeg','image/png','image/webp'].includes(blob.type))return json({error:'Choose a JPG, PNG or WebP smaller than 4 MB.'},400);const key=user.userId+'/'+crypto.randomUUID();await E().BUCKET.put(key,blob.stream(),{httpMetadata:{contentType:blob.type}});return json({url:'/api/photo/'+encodeURIComponent(key)})}
const raw=await req.text();if(raw.length>300000)return json({error:'Too much data.'},413);const data=JSON.parse(raw);
if(p==='state'){await db.prepare('INSERT INTO user_state (user_id,value) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET value=excluded.value').bind(user.userId,raw).run();return json({ok:true})}
if(p==='walks'){if(!data.route?.id||!data.title||!data.time||!data.meeting||!Number.isFinite(Date.parse(data.time)))return json({error:'Add a route, meeting point and date.'},400);const id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO shared_walks (id,host,title,route,meeting,time,created) VALUES (?,?,?,?,?,?,?)').bind(id,user.userId,clip(data.title),JSON.stringify(data.route),clip(data.meeting,300),data.time,Date.now()),db.prepare('INSERT INTO members (walk_id,user_id,name,status) VALUES (?,?,?,?)').bind(id,user.userId,clip(user.fullName??user.email.split('@')[0],60),'joined')]);return json({id})}
if(p.startsWith('walks/')){const id=p.split('/')[1],walk=await db.prepare('SELECT * FROM shared_walks WHERE id=?').bind(id).first();if(!walk)return json({error:'Walk not found.'},404);
if(data.action==='end'){if(walk.host!==user.userId)return json({error:'Only the host can end sharing.'},403);await db.batch([db.prepare('UPDATE members SET expires=0,lat=NULL,lng=NULL WHERE walk_id=?').bind(id),db.prepare('UPDATE shared_walks SET ended=1 WHERE id=?').bind(id)]);return json({ok:true})}
if(data.action==='join'||data.action==='decline'||data.action==='leave'){const status=data.action==='join'?'joined':data.action==='decline'?'declined':'left';await db.prepare('INSERT INTO members (walk_id,user_id,name,status) VALUES (?,?,?,?) ON CONFLICT(walk_id,user_id) DO UPDATE SET status=excluded.status,expires=0,lat=NULL,lng=NULL').bind(id,user.userId,clip(user.fullName??user.email.split('@')[0],60),status).run();return json({ok:true})}
const member=await db.prepare('SELECT status FROM members WHERE walk_id=? AND user_id=?').bind(id,user.userId).first();if(member?.status!=='joined')return json({error:'Join this walk first.'},403);
if(data.action==='location'){if(walk.ended&&data.enabled)return json({error:'The host ended this location-sharing session.'},409);const valid=data.enabled===true&&Number.isFinite(data.lat)&&Number.isFinite(data.lng)&&Math.abs(data.lat)<=90&&Math.abs(data.lng)<=180;await db.prepare('UPDATE members SET lat=?,lng=?,expires=? WHERE walk_id=? AND user_id=?').bind(valid?data.lat:null,valid?data.lng:null,valid?Date.now()+45000:0,id,user.userId).run();return json({ok:true})}
if(data.action==='summary'){const distance=Number(data.distance),seconds=Number(data.seconds);if(!Number.isFinite(distance)||!Number.isFinite(seconds)||distance<0||seconds<0)return json({error:'Invalid summary'},400);await db.prepare('UPDATE members SET summary=?,expires=0,lat=NULL,lng=NULL WHERE walk_id=? AND user_id=?').bind(JSON.stringify({distance,seconds}),id,user.userId).run();return json({ok:true})}
}
if(p==='reports'){const id=crypto.randomUUID();if(!data.routeId||!data.note)return json({error:'Add a description.'},400);await db.prepare('INSERT INTO reports (id,user_id,route_id,kind,note,created) VALUES (?,?,?,?,?,?)').bind(id,user.userId,clip(data.routeId),clip(data.kind),clip(data.note,1000),Date.now()).run();return json({ok:true})}
return json({error:'Not found'},404);
}catch{return json({error:'Could not save. Please retry.'},503)}}
