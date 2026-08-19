import {json,requireAdmin} from './_shared.js';

const num=(value:unknown)=>Number(value)||0;
const actionValue=(items:any[]|undefined)=>{
 for(const type of ['offsite_conversion.fb_pixel_purchase','purchase']){const item=items?.find(row=>row.action_type===type);if(item)return num(item.value)}
 return 0;
};

export default async function handler(req:any,res:any){
 if(req.method!=='GET')return json(res,405,{error:'method_not_allowed'});
 if(!await requireAdmin(req,res))return;
 const token=String(process.env.META_ACCESS_TOKEN||'');
 const campaignId=String(process.env.META_CAMPAIGN_ID||'120251439345290652');
 const version=String(process.env.META_API_VERSION||'v23.0');
 if(!token)return json(res,409,{error:'meta_not_configured'});
 try{
  const base=`https://graph.facebook.com/${version}`;
  const campaignQuery=new URLSearchParams({fields:'id,name,status,effective_status',access_token:token});
  const insightsQuery=new URLSearchParams({level:'ad',date_preset:'today',fields:'ad_id,ad_name,spend,actions,action_values,purchase_roas',limit:'100',access_token:token});
  const [campaignResponse,insightsResponse]=await Promise.all([fetch(`${base}/${campaignId}?${campaignQuery}`),fetch(`${base}/${campaignId}/insights?${insightsQuery}`)]);
  const campaign=await campaignResponse.json(),insights=await insightsResponse.json();
  if(!campaignResponse.ok||!insightsResponse.ok)throw new Error(campaign?.error?.message||insights?.error?.message||'meta_fetch_failed');
  const creatives=(insights.data||[]).map((row:any)=>{const spend=num(row.spend),purchases=actionValue(row.actions),revenue=actionValue(row.action_values);return{id:row.ad_id,name:row.ad_name,spend,purchases,revenue,cpa:purchases?spend/purchases:0,roas:spend?revenue/spend:0}}).sort((a:any,b:any)=>b.purchases-a.purchases||b.revenue-a.revenue);
  const totals=creatives.reduce((sum:any,row:any)=>({spend:sum.spend+row.spend,purchases:sum.purchases+row.purchases,revenue:sum.revenue+row.revenue}),{spend:0,purchases:0,revenue:0});
  const status=campaign.effective_status||campaign.status;
  return json(res,200,{campaign:{id:campaign.id,name:campaign.name,status,active:status==='ACTIVE'},totals:{...totals,cpa:totals.purchases?totals.spend/totals.purchases:0,roas:totals.spend?totals.revenue/totals.spend:0},creatives,syncedAt:new Date().toISOString(),source:'Meta Ads — atribuição da plataforma'});
 }catch(error){console.error(error);return json(res,502,{error:'meta_sync_failed'})}
}
