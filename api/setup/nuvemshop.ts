import {db,json} from '../_shared.js';

export default async function handler(req:any,res:any){
 if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'});
 const store=String(process.env.NUVEMSHOP_STORE_ID||'');
 const appId=String(process.env.NUVEMSHOP_APP_ID||'38884');
 const secret=process.env.NUVEMSHOP_CLIENT_SECRET||'';
 if(!store||!secret)return json(res,503,{error:'server_not_configured'});
 const client=db();
 const integration=await client.from('nuvemshop_integrations').select('access_token').eq('store_id',store).single();
 if(integration.error||!integration.data?.access_token)return json(res,409,{error:'store_not_connected'});
 const headers={Authorization:`Bearer ${integration.data.access_token}`,'User-Agent':`EcomReports/${appId}`,'Content-Type':'application/json'};
 const base=`https://api.nuvemshop.com.br/v1/${store}/webhooks`;
 const current=await fetch(base,{headers});
 const list:any[]=current.ok?await current.json():[];
 const url='https://relatorioflorakids.vercel.app/api/webhooks/nuvemshop';
 const existing=list.find(x=>x.event==='order/paid'&&x.url===url);
 if(existing)return json(res,200,{ok:true,created:false,event:'order/paid',webhookId:existing.id});
 const created=await fetch(base,{method:'POST',headers,body:JSON.stringify({event:'order/paid',url,headers:{'X-EcomReports-Webhook-Secret':secret}})});
 const result:any=await created.json();
 if(!created.ok||!result.id)return json(res,502,{error:'webhook_registration_failed',providerStatus:created.status});
 return json(res,201,{ok:true,created:true,event:'order/paid',webhookId:result.id});
}
