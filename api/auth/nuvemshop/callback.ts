import {db} from '../../_shared.js';

export default async function handler(req:any,res:any){
 const code=String(req.query?.code||'');
 const clientId=process.env.NUVEMSHOP_APP_ID;
 const clientSecret=process.env.NUVEMSHOP_CLIENT_SECRET;
 if(!code||!clientId||!clientSecret)return res.status(400).send('Configuração OAuth incompleta. Volte ao EcomReports e tente novamente.');
 try{
  const body=new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,grant_type:'authorization_code'});
  const response=await fetch('https://www.tiendanube.com/apps/authorize/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const token:any=await response.json();
  if(!response.ok||!token.access_token||!token.user_id)throw new Error(`token_exchange_failed:${token.error||response.status}`);
  const {error}=await db().from('nuvemshop_integrations').upsert({store_id:String(token.user_id),access_token:token.access_token,token_type:token.token_type||'bearer',scope:token.scope||null,updated_at:new Date().toISOString()},{onConflict:'store_id'});
  if(error)throw error;
  res.status(200).setHeader('content-type','text/html; charset=utf-8').send('<!doctype html><meta charset="utf-8"><title>EcomReports conectado</title><style>body{background:#08100d;color:#eafff7;font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0}.box{border:1px solid #235442;background:#101b17;padding:40px;border-radius:16px;text-align:center}h1{color:#35e6b2}</style><div class="box"><h1>Nuvemshop conectada!</h1><p>A loja foi autorizada com sucesso no EcomReports.</p><p>Você já pode fechar esta janela.</p></div>');
 }catch(e){console.error(e);res.status(500).send('Não foi possível concluir a instalação. Verifique as configurações e tente novamente.')}
}
