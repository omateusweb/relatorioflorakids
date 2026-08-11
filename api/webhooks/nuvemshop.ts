import {createHash} from 'node:crypto';
import {db,json,safeEqual} from '../_shared.js';

const hash=(x:string)=>createHash('sha256').update(x).digest('hex');
const userAgent=()=>`EcomReports/${process.env.NUVEMSHOP_APP_ID||'38884'}`;

export default async function handler(req:any,res:any){
 if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'});
 const secret=process.env.NUVEMSHOP_CLIENT_SECRET||'';
 const received=String(req.headers['x-ecomreports-webhook-secret']||'');
 if(!secret||!received||!safeEqual(received,secret))return json(res,401,{error:'invalid_webhook_secret'});

 const notification=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 const store=String(notification.store_id||'');
 const orderId=String(notification.id||'');
 const eventType=String(notification.event||'order/paid');
 if(!store||!orderId||store!==String(process.env.NUVEMSHOP_STORE_ID||store))return json(res,400,{error:'invalid_notification'});
 const eventKey=`${store}:${eventType}:${orderId}`;
 const client=db();
 const {data:evt,error:ie}=await client.from('nuvemshop_webhook_events').upsert({event_key:eventKey,event_type:eventType,store_id:store,resource_id:orderId,payload:notification},{onConflict:'event_key',ignoreDuplicates:true}).select('id').maybeSingle();
 if(ie)return json(res,500,{error:'event_store_failed'});
 if(!evt)return json(res,200,{ok:true,duplicate:true});

 try{
  const integration=await client.from('nuvemshop_integrations').select('access_token').eq('store_id',store).single();
  if(integration.error||!integration.data?.access_token)throw new Error('integration_token_not_found');
  const orderResponse=await fetch(`https://api.nuvemshop.com.br/v1/${store}/orders/${orderId}`,{headers:{Authorization:`Bearer ${integration.data.access_token}`,'User-Agent':userAgent()}});
  if(!orderResponse.ok)throw new Error(`order_fetch_failed:${orderResponse.status}`);
  const payload:any=await orderResponse.json();
  const email=payload.contact_email||payload.customer?.email||'';
  const order={store_id:store,order_id:orderId,order_number:String(payload.number||orderId),payment_status:String(payload.payment_status||payload.status||'paid'),currency:String(payload.currency||'BRL'),total:Number(payload.total||payload.total_paid||0),completed_at:payload.completed_at||payload.paid_at||new Date().toISOString(),customer_email_hash:email?hash(String(email).toLowerCase().trim()):null,raw_payload:payload,updated_at:new Date().toISOString()};
  const {data:o,error:oe}=await client.from('tracked_orders').upsert(order,{onConflict:'store_id,order_id'}).select('id').single();if(oe)throw oe;
  const extras=payload.extra||{};
  const noteSession=payload.note_attributes?.find?.((x:any)=>x.name==='ecom_session_id')?.value;
  const sessionKey=extras.ecom_session_id||noteSession||payload.ecom_session_id;
  let session=null;
  if(sessionKey){const result=await client.from('tracking_sessions').select('id,visitor_id').eq('session_key',sessionKey).maybeSingle();session=result.data}
  await client.from('order_attributions').upsert({order_id:o.id,session_id:session?.id||null,visitor_id:session?.visitor_id||null,confidence:session?'exact_session':'unattributed',details:{session_key:sessionKey||null}},{onConflict:'order_id'});
  await client.from('nuvemshop_webhook_events').update({status:'processed',processed_at:new Date().toISOString()}).eq('id',evt.id);
  return json(res,200,{ok:true});
 }catch(e:any){console.error(e);await client.from('nuvemshop_webhook_events').update({status:'failed',error:String(e?.message||e).slice(0,1000)}).eq('id',evt.id);return json(res,500,{error:'processing_failed'})}
}
