import {createClient} from '@supabase/supabase-js';
import {createHmac,timingSafeEqual} from 'node:crypto';
export const db=()=>{const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Supabase server credentials are not configured');return createClient(url,key,{auth:{persistSession:false}})};
export const json=(res:any,status:number,body:unknown)=>res.status(status).setHeader('content-type','application/json').send(JSON.stringify(body));
export const requireAdmin=async(req:any,res:any)=>{
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
 if(!token){json(res,401,{error:'authentication_required'});return null}
 const {data,error}=await db().auth.getUser(token);
 if(error||!data.user){json(res,401,{error:'invalid_session'});return null}
 const allowed=(process.env.ECOMREPORTS_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const email=String(data.user.email||'').toLowerCase();
 const hasAdminRole=data.user.app_metadata?.role==='admin';
 if(!hasAdminRole&&!allowed.length){json(res,503,{error:'admin_allowlist_not_configured'});return null}
 if(!hasAdminRole&&!allowed.includes(email)){json(res,403,{error:'access_denied'});return null}
 return data.user;
};
export const safeEqual=(a:string,b:string)=>{const aa=Buffer.from(a);const bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)};
export const validSignature=(raw:string,signature:string|undefined)=>{const secret=process.env.NUVEMSHOP_CLIENT_SECRET;if(!secret||!signature)return false;const hex=createHmac('sha256',secret).update(raw).digest('hex');const b64=createHmac('sha256',secret).update(raw).digest('base64');return safeEqual(signature,hex)||safeEqual(signature,b64)};
export const allowOrigin=(req:any,res:any)=>{const normalize=(x:string)=>x.trim().replace(/["']/g,'').replace(/\/$/,'').toLowerCase();const allowed=[...new Set(['https://florakids.com.br','https://www.florakids.com.br',...(process.env.TRACKING_ALLOWED_ORIGINS||'').split(',')].map(normalize).filter(Boolean))];const rawOrigin=String(req.headers.origin||'');const origin=normalize(rawOrigin);if(origin&&allowed.includes(origin)){res.setHeader('access-control-allow-origin',rawOrigin);res.setHeader('vary','Origin')}res.setHeader('access-control-allow-methods','POST,OPTIONS');res.setHeader('access-control-allow-headers','content-type');return !origin||allowed.includes(origin)};
