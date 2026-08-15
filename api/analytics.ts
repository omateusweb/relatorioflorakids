import {db,json,requireAdmin} from './_shared.js';

const amount=(value:unknown)=>Number(value)||0;
const clean=(value:unknown,fallback='—')=>String(value||'').trim()||fallback;
const day=(value:unknown)=>String(value||'').slice(0,10);

function orderDate(order:any){
 const candidates=[order?.paid_at,order?.created_at,order?.completed_at?.date,order?.updated_at];
 for(const value of candidates){
  if(typeof value==='string'&&value.trim()&&!Number.isNaN(Date.parse(value)))return value;
 }
 return '';
}

async function paged(makeQuery:(from:number,to:number)=>PromiseLike<any>){
 const rows:any[]=[];
 for(let from=0;from<10000;from+=1000){
  const {data,error}=await makeQuery(from,from+999);
  if(error)throw error;
  const batch=data||[];
  rows.push(...batch);
  if(batch.length<1000)break;
 }
 return rows;
}

function channelFor(session:any){
 const source=clean(session?.utm_source,'').toLowerCase();
 const medium=clean(session?.utm_medium,'').toLowerCase();
 const referrer=clean(session?.referrer,'').toLowerCase();
 if(/facebook|instagram|meta|fb/.test(source))return 'Meta Ads';
 if(/google/.test(source)&&/cpc|ppc|paid/.test(medium))return 'Google Ads';
 if(/google/.test(source)||/google\./.test(referrer))return 'Google Orgânico';
 if(/tiktok|tt/.test(source))return 'TikTok Ads';
 if(/email|newsletter/.test(source)||/email/.test(medium))return 'E-mail';
 if(/organic/.test(medium))return source?`${clean(session.utm_source)} Orgânico`:'Orgânico';
 if(source)return clean(session.utm_source);
 if(referrer)return 'Referência';
 return 'Direto';
}

function dimension(name:string,sessions:any[],sales:any[],totalRevenue:number){
 const names=new Set([...sessions.map(x=>x[name]),...sales.map(x=>x[name])]);
 return [...names].map(value=>{
  const sessionCount=sessions.filter(x=>x[name]===value).length;
  const matched=sales.filter(x=>x[name]===value&&x.attributed);
  const revenue=matched.reduce((sum,x)=>sum+x.revenue,0);
  return {name:value,sessions:sessionCount,orders:matched.length,revenue,conversion:sessionCount?matched.length/sessionCount*100:0,share:totalRevenue?revenue/totalRevenue*100:0};
 }).sort((a,b)=>b.revenue-a.revenue||b.sessions-a.sessions);
}

export default async function handler(req:any,res:any){
 if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});
 if(!await requireAdmin(req,res))return;
 const from=String(req.query?.from||'').slice(0,10);
 const to=String(req.query?.to||'').slice(0,10);
 const store=String(process.env.NUVEMSHOP_STORE_ID||'');
 if(!store||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(from)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(to)||from>to)return json(res,400,{error:'invalid_range'});

 try{
  const client=db();
  const integration=await client.from('nuvemshop_integrations').select('access_token,installed_at,updated_at').eq('store_id',store).single();
  if(integration.error||!integration.data?.access_token)return json(res,409,{error:'store_not_connected'});
  const start=`${from}T00:00:00-03:00`,end=`${to}T23:59:59-03:00`;
  const [sessions,events,trackedOrders,attributions,webhooks,countSessions,countEvents]=await Promise.all([
   paged((a,b)=>client.from('tracking_sessions').select('id,session_key,utm_source,utm_medium,utm_campaign,utm_content,utm_term,fbclid,gclid,ttclid,referrer,landing_page,started_at,last_activity_at').gte('started_at',start).lte('started_at',end).order('started_at',{ascending:false}).range(a,b)),
   paged((a,b)=>client.from('tracking_events').select('session_id,event_name,occurred_at,metadata').gte('occurred_at',start).lte('occurred_at',end).order('occurred_at',{ascending:false}).range(a,b)),
   paged((a,b)=>client.from('tracked_orders').select('id,order_id,order_number,total,payment_status,completed_at').gte('completed_at',start).lte('completed_at',end).range(a,b)),
   paged((a,b)=>client.from('order_attributions').select('order_id,session_id,confidence,attributed_at').range(a,b)),
   client.from('nuvemshop_webhook_events').select('status,received_at,processed_at').order('received_at',{ascending:false}).limit(100),
   client.from('tracking_sessions').select('id',{head:true,count:'exact'}),
   client.from('tracking_events').select('id',{head:true,count:'exact'})
  ]);

  const orders:any[]=[];
  const headers={Authorization:`Bearer ${integration.data.access_token}`,'User-Agent':`EcomReports/${process.env.NUVEMSHOP_APP_ID||'38884'}`};
  for(let page=1;page<=20;page++){
   const qs=new URLSearchParams({created_at_min:start,created_at_max:end,per_page:'200',page:String(page)});
   const response=await fetch(`https://api.nuvemshop.com.br/v1/${store}/orders?${qs}`,{headers});
   if(!response.ok)throw new Error(`orders_fetch_failed:${response.status}`);
   const batch:any[]=await response.json();
   orders.push(...batch);
   if(batch.length<200)break;
  }
  const paidOrders=orders.filter(order=>order.status!=='cancelled'&&['paid','partially_refunded'].includes(order.payment_status));
  const sessionById=new Map(sessions.map(x=>[x.id,x]));
  const trackedByExternal=new Map(trackedOrders.map(x=>[String(x.order_id),x]));
  const attributionByOrder=new Map(attributions.map(x=>[x.order_id,x]));
  const purchaseSessionByNumber=new Map<string,string>();
  for(const event of events){
   const number=clean(event.metadata?.order_number,'');
   if(event.event_name==='purchase'&&number&&!purchaseSessionByNumber.has(number))purchaseSessionByNumber.set(number,event.session_id);
  }
  const eventsBySession=new Map<string,any[]>();
  for(const event of events){const list=eventsBySession.get(event.session_id)||[];list.push(event);eventsBySession.set(event.session_id,list)}

  const sales=paidOrders.map(order=>{
   const tracked=trackedByExternal.get(String(order.id));
   const stored=tracked?attributionByOrder.get(tracked.id):null;
   const sessionId=stored?.session_id||purchaseSessionByNumber.get(String(order.number||''))||null;
   const session=sessionId?sessionById.get(sessionId):null;
   const attributed=Boolean(session);
   const hasUtm=Boolean(session&&(session.utm_source||session.utm_medium||session.utm_campaign||session.fbclid||session.gclid||session.ttclid));
   return {id:String(order.id),date:orderDate(order),order:`#${order.number||order.id}`,channel:attributed?channelFor(session):'Não identificado',campaign:attributed?clean(session.utm_campaign,'Sem campanha'):'Sem campanha',creative:attributed?clean(session.utm_content,'Sem criativo'):'Sem criativo',revenue:amount(order.total_paid_by_customer??order.total),status:hasUtm?'Atribuída':attributed?'Sessão direta':'Sem sessão',attributed,hasUtm};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));

  const sessionRows=sessions.map(session=>{
   const sessionEvents=eventsBySession.get(session.id)||[];
   const eventNames=new Set(sessionEvents.map(x=>x.event_name));
   return {id:session.id,date:session.started_at,session:clean(session.session_key).slice(0,12),channel:channelFor(session),source:clean(session.utm_source,'Direto'),medium:clean(session.utm_medium,'—'),campaign:clean(session.utm_campaign,'Sem campanha'),creative:clean(session.utm_content,'Sem criativo'),landing:clean(session.landing_page,'—'),events:sessionEvents.length,status:eventNames.has('purchase')?'Comprou':eventNames.has('checkout_started')?'Checkout':'Navegou'};
  });
  const attributedSales=sales.filter(x=>x.attributed);
  const attributedRevenue=attributedSales.reduce((sum,x)=>sum+x.revenue,0);
  const utmSales=sales.filter(x=>x.hasUtm).length;
  const noCampaign=sessions.filter(x=>!x.utm_campaign).length;
  const webhookRows=webhooks.data||[];
  const processed=webhookRows.filter((x:any)=>x.status==='processed').length;
  const failed=webhookRows.filter((x:any)=>x.status==='failed').length;
  const latestSession=sessions[0]?.started_at||null;
  const latestWebhook=webhookRows[0]?.received_at||null;

  return json(res,200,{
   range:{from,to},
   summary:{attributedRevenue,attributedOrders:attributedSales.length,totalOrders:sales.length,sessions:sessions.length,conversion:sessions.length?attributedSales.length/sessions.length*100:0,ticket:attributedSales.length?attributedRevenue/attributedSales.length:0,coverage:sales.length?attributedSales.length/sales.length*100:0,utmValid:sales.length?utmSales/sales.length*100:0,noCampaign:sessions.length?noCampaign/sessions.length*100:0,noSession:sales.length?(sales.length-attributedSales.length)/sales.length*100:0},
   dimensions:{channels:dimension('channel',sessionRows,sales,attributedRevenue),campaigns:dimension('campaign',sessionRows,sales,attributedRevenue),creatives:dimension('creative',sessionRows,sales,attributedRevenue)},
   sales:sales.slice(0,300),sessions:sessionRows.slice(0,500),
   diagnostics:{database:{ok:true,detail:`${countSessions.count||0} sessões e ${countEvents.count||0} eventos`},capture:{ok:Boolean(countSessions.count),detail:latestSession?`Última sessão ${latestSession}`:'Nenhuma sessão recebida'},webhook:{ok:processed>0&&failed===0,warning:failed>0,detail:latestWebhook?`${processed} processados, ${failed} com erro`:'Aguardando primeira venda paga'},integration:{ok:true,detail:`Loja conectada desde ${integration.data.installed_at}`}},
   syncedAt:new Date().toISOString()
  });
 }catch(error){console.error(error);return json(res,502,{error:'analytics_sync_failed'})}
}
