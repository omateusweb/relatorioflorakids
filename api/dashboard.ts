import {db,json} from './_shared.js';

const amount=(v:unknown)=>Number(v)||0;
export default async function handler(req:any,res:any){
 if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});
 const store=String(process.env.NUVEMSHOP_STORE_ID||'');
 const appId=String(process.env.NUVEMSHOP_APP_ID||'38884');
 const from=String(req.query?.from||'').slice(0,10);
 const to=String(req.query?.to||'').slice(0,10);
 if(!store||!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to))return json(res,400,{error:'invalid_range'});
 try{
  const client=db();
  const integration=await client.from('nuvemshop_integrations').select('access_token').eq('store_id',store).single();
  if(integration.error||!integration.data?.access_token)return json(res,409,{error:'store_not_connected'});
  const headers={Authorization:`Bearer ${integration.data.access_token}`,'User-Agent':`EcomReports/${appId}`};
  const orders:any[]=[];
  for(let page=1;page<=20;page++){
   const qs=new URLSearchParams({created_at_min:`${from}T00:00:00-03:00`,created_at_max:`${to}T23:59:59-03:00`,per_page:'200',page:String(page)});
   const response=await fetch(`https://api.nuvemshop.com.br/v1/${store}/orders?${qs}`,{headers});
   if(!response.ok)throw new Error(`orders_fetch_failed:${response.status}`);
   const batch:any[]=await response.json();orders.push(...batch);if(batch.length<200)break;
  }
  const paid=orders.filter(o=>o.status!=='cancelled'&&['paid','partially_refunded'].includes(o.payment_status));
  const gross=paid.reduce((s,o)=>s+amount(o.total_paid_by_customer??o.total),0);
  const shipping=paid.reduce((s,o)=>s+Math.max(0,amount(o.total)-amount(o.subtotal)+amount(o.discount)),0);
  const refunded=orders.filter(o=>['refunded','partially_refunded'].includes(o.payment_status)).length;
  const daily=new Map<string,{date:string;gross:number;orders:number;shipping:number}>();
  const payments=new Map<string,{name:string;value:number;orders:number}>();
  for(const o of paid){const date=String(o.paid_at||o.created_at||'').slice(0,10);const row=daily.get(date)||{date,gross:0,orders:0,shipping:0};const total=amount(o.total_paid_by_customer??o.total);const freight=Math.max(0,amount(o.total)-amount(o.subtotal)+amount(o.discount));row.gross+=total;row.orders++;row.shipping+=freight;daily.set(date,row);const name=String(o.gateway_name||o.payment_details?.method||o.gateway||'Outros');const pay=payments.get(name)||{name,value:0,orders:0};pay.value+=total;pay.orders++;payments.set(name,pay)}
  return json(res,200,{range:{from,to},metrics:{gross,orders:paid.length,shipping,ticket:paid.length?gross/paid.length:0,refunded},daily:[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)),payments:[...payments.values()].sort((a,b)=>b.value-a.value),syncedAt:new Date().toISOString()});
 }catch(e){console.error(e);return json(res,502,{error:'nuvemshop_sync_failed'})}
}
