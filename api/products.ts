import {db,json,requireAdmin} from './_shared.js';

const amount=(value:unknown)=>Math.max(0,Number(value)||0);
const localized=(value:unknown)=>{
 if(typeof value==='string')return value;
 if(value&&typeof value==='object'){const names=value as Record<string,string>;return names.pt||names['pt-BR']||names.es||names.en||Object.values(names)[0]||'Produto sem nome'}
 return 'Produto sem nome';
};

async function integration(){
 const store=String(process.env.NUVEMSHOP_STORE_ID||'');
 if(!store)throw new Error('store_not_configured');
 const client=db();
 const result=await client.from('nuvemshop_integrations').select('access_token').eq('store_id',store).single();
 if(result.error||!result.data?.access_token)throw new Error('store_not_connected');
 return{client,store,token:result.data.access_token};
}

export default async function handler(req:any,res:any){
 if(!['GET','PUT'].includes(req.method))return json(res,405,{error:'method_not_allowed'});
 if(!await requireAdmin(req,res))return;
 try{
  const {client,store,token}=await integration();
  if(req.method==='PUT'){
   const productId=String(req.body?.productId||'').trim(),cost=amount(req.body?.cost);
   if(!/^\d+$/.test(productId)||!Number.isFinite(Number(req.body?.cost)))return json(res,400,{error:'invalid_product_cost'});
   const saved=await client.from('product_costs').upsert({store_id:store,product_id:productId,cost,updated_at:new Date().toISOString()},{onConflict:'store_id,product_id'}).select('cost').single();
   if(saved.error)throw saved.error;
   return json(res,200,{productId,cost:amount(saved.data.cost)});
  }
  const headers={Authorization:`Bearer ${token}`,'User-Agent':`EcomReports/${process.env.NUVEMSHOP_APP_ID||'38884'}`};
  const products:any[]=[];
  for(let page=1;page<=20;page++){
   const query=new URLSearchParams({per_page:'200',page:String(page),fields:'id,name,variants,published'});
   const response=await fetch(`https://api.nuvemshop.com.br/v1/${store}/products?${query}`,{headers});
   if(!response.ok)throw new Error(`products_fetch_failed:${response.status}`);
   const batch:any[]=await response.json();products.push(...batch);if(batch.length<200)break;
  }
  const costs=await client.from('product_costs').select('product_id,cost').eq('store_id',store);
  const costMap=new Map((costs.data||[]).map(row=>[String(row.product_id),amount(row.cost)]));
  const rows=products.map(product=>{
   const prices=(product.variants||[]).map((variant:any)=>amount(variant.price)).filter((price:number)=>price>0);
   const price=prices.length?Math.min(...prices):0,cost=costMap.get(String(product.id))||0;
   return{id:String(product.id),name:localized(product.name),price,cost,profit:price-cost,margin:price?(price-cost)/price*100:0,published:product.published!==false,variants:(product.variants||[]).length};
  }).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  return json(res,200,{products:rows,summary:{products:rows.length,inventoryValue:rows.reduce((sum,row)=>sum+row.cost,0),averageMargin:rows.length?rows.reduce((sum,row)=>sum+row.margin,0)/rows.length:0},syncedAt:new Date().toISOString(),costStorageReady:!costs.error});
 }catch(error){console.error(error);return json(res,502,{error:'products_sync_failed'})}
}
