import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {Eye,EyeOff,LoaderCircle,LockKeyhole,Mail,ShieldCheck} from 'lucide-react';
import {supabase} from './lib/supabase';

export function AuthGate({children}:{children:(email:string)=>React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  supabase!.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
  const {data}=supabase!.auth.onAuthStateChange((_event,next)=>{setSession(next);setReady(true)});
  return()=>data.subscription.unsubscribe();
 },[]);
 if(!ready)return <div className="auth-loading"><LoaderCircle className="spin"/><span>Protegendo o EcomReports…</span></div>;
 if(!session)return <Login/>;
 return <>{children(session.user.email||'Administrador')}</>;
}

function Login(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const submit=async(event:React.FormEvent)=>{event.preventDefault();setLoading(true);setError('');const result=await supabase!.auth.signInWithPassword({email:email.trim(),password});if(result.error)setError('E-mail ou senha incorretos.');setLoading(false)};
 return <main className="login-page"><section className="login-card"><div className="login-brand"><div>F</div><span><b>EcomReports</b><small>Flora Kids</small></span></div><div className="login-icon"><ShieldCheck/></div><h1>Acesso administrativo</h1><p>Entre com sua conta autorizada para visualizar os dados financeiros e de marketing.</p><form onSubmit={submit}><label><span>E-mail</span><div><Mail/><input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required autoFocus/></div></label><label><span>Senha</span><div><LockKeyhole/><input type={show?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" required/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Ocultar senha':'Mostrar senha'}>{show?<EyeOff/>:<Eye/>}</button></div></label>{error&&<div className="login-error">{error}</div>}<button className="login-submit" disabled={loading}>{loading?<><LoaderCircle className="spin"/>Entrando…</>:<>Entrar com segurança</>}</button></form><footer><LockKeyhole/> Sessão protegida pelo Supabase Auth</footer></section></main>;
}
