import {randomUUID} from 'node:crypto';
import {allowOrigin,db,json} from './_shared.js';
const text=(v:unknown,max=500)=>typeof v==='string'?v.slice(0,max):null;
export default async function handler(req:any,res:any){
 if(req.method==='OPTIONS'){allowOrigin(req,res);return res.status(204).end()}
 if(req.method==='GET'){try{const {error}=await db().from('tracking_sessions').select('id',{head:true,count:'exact'}).limit(1);return error?json(res,503,{ready:false,error:'database_not_ready'}):json(res,200,{ready:true})}catch{return json(res,503,{ready:false,error:'server_not_configured'})}}
 if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'}); if(!allowOrigin(req,res))return json(res,403,{error:'origin_not_allowed'});
 try{const b=req.body||{};const visitorKey=text(b.visitor_id,100),sessionKey=text(b.session_id,100);if(!visitorKey||!sessionKey)return json(res,400,{error:'visitor_id_and_session_id_required'});const client=db();
  const {data:visitor,error:ve}=await client.from('tracking_visitors').upsert({visitor_key:visitorKey,last_seen_at:new Date().toISOString()},{onConflict:'visitor_key'}).select('id').single();if(ve)throw ve;
  const session={session_key:sessionKey,visitor_id:visitor.id,utm_source:text(b.utm_source,200),utm_medium:text(b.utm_medium,200),utm_campaign:text(b.utm_campaign,300),utm_content:text(b.utm_content,300),utm_term:text(b.utm_term,300),fbclid:text(b.fbclid),gclid:text(b.gclid),ttclid:text(b.ttclid),referrer:text(b.referrer,1000),landing_page:text(b.landing_page,1500),last_activity_at:new Date().toISOString()};
  const {data:s,error:se}=await client.from('tracking_sessions').upsert(session,{onConflict:'session_key'}).select('id').single();if(se)throw se;
  const eventKey=text(b.event_id,100)||randomUUID();const {error:ee}=await client.from('tracking_events').upsert({event_key:eventKey,session_id:s.id,visitor_id:visitor.id,event_name:b.event_name==='checkout_started'?'checkout_started':'page_view',page_url:text(b.page_url,1500),metadata:{}},{onConflict:'event_key',ignoreDuplicates:true});if(ee)throw ee;
  return json(res,202,{accepted:true});
 }catch(e){console.error(e);return json(res,500,{error:'tracking_unavailable'})}
}
