import {randomUUID} from 'node:crypto';
import {allowOrigin,db,json} from './_shared.js';
const text=(v:unknown,max=500)=>typeof v==='string'?v.slice(0,max):null;
export default async function handler(req:any,res:any){
 if(req.method==='OPTIONS'){allowOrigin(req,res);return res.status(204).end()}
 if(req.method==='GET'){try{const client=db();const {error}=await client.from('tracking_sessions').select('id',{head:true,count:'exact'}).limit(1);if(error)return json(res,503,{ready:false,error:'database_not_ready'});const test=await client.from('tracking_sessions').select('id').eq('utm_campaign','validacao').limit(1).maybeSingle();return json(res,200,{ready:true,testCaptured:Boolean(test.data)})}catch{return json(res,503,{ready:false,error:'server_not_configured'})}}
 if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'}); if(!allowOrigin(req,res))return json(res,403,{error:'origin_not_allowed'});
 try{const b=req.body||{};const visitorKey=text(b.visitor_id,100),sessionKey=text(b.session_id,100);if(!visitorKey||!sessionKey)return json(res,400,{error:'visitor_id_and_session_id_required'});const client=db();
  const {data:visitor,error:ve}=await client.from('tracking_visitors').upsert({visitor_key:visitorKey,last_seen_at:new Date().toISOString()},{onConflict:'visitor_key'}).select('id').single();if(ve)throw ve;
  const previous=await client.from('tracking_sessions').select('utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,gclid,ttclid,referrer,landing_page').eq('session_key',sessionKey).maybeSingle();if(previous.error)throw previous.error;
  const keep=(value:unknown,key:string,max=500)=>text(value,max)??previous.data?.[key]??null;
  const session={session_key:sessionKey,visitor_id:visitor.id,utm_source:keep(b.utm_source,'utm_source',200),utm_medium:keep(b.utm_medium,'utm_medium',200),utm_campaign:keep(b.utm_campaign,'utm_campaign',300),utm_content:keep(b.utm_content,'utm_content',300),utm_term:keep(b.utm_term,'utm_term',300),fbclid:keep(b.fbclid,'fbclid'),gclid:keep(b.gclid,'gclid'),ttclid:keep(b.ttclid,'ttclid'),referrer:keep(b.referrer,'referrer',1000),landing_page:keep(b.landing_page,'landing_page',1500),last_activity_at:new Date().toISOString()};
  const {data:s,error:se}=await client.from('tracking_sessions').upsert(session,{onConflict:'session_key'}).select('id').single();if(se)throw se;
  const eventKey=text(b.event_id,100)||randomUUID();const eventName=['checkout_started','purchase'].includes(b.event_name)?b.event_name:'page_view';const metadata=eventName==='purchase'?{order_number:text(b.order_number,100),order_total:Number(b.order_total)||null}:{};const {error:ee}=await client.from('tracking_events').upsert({event_key:eventKey,session_id:s.id,visitor_id:visitor.id,event_name:eventName,page_url:text(b.page_url,1500),metadata},{onConflict:'event_key',ignoreDuplicates:true});if(ee)throw ee;
  return json(res,202,{accepted:true});
 }catch(e){console.error(e);return json(res,500,{error:'tracking_unavailable'})}
}
