import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {Eye,EyeOff,LoaderCircle,LockKeyhole,Mail,ShieldCheck} from 'lucide-react';
import {supabase} from './lib/supabase';

export function AuthGate({children}:{children:(email:string)=>React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[needsPassword,setNeedsPassword]=useState(()=>/type=(invite|recovery)/.test(window.location.hash));
 useEffect(()=>{
  supabase!.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});
  const {data}=supabase!.auth.onAuthStateChange((event,next)=>{if(event==='PASSWORD_RECOVERY'||/type=(invite|recovery)/.test(window.location.hash))setNeedsPassword(true);setSession(next);setReady(true)});
  return()=>data.subscription.unsubscribe();
 },[]);
 if(!ready)return <div className="auth-loading"><LoaderCircle className="spin"/><span>Protegendo o EcomReports…</span></div>;
 if(!session)return <Login/>;
 if(needsPassword)return <SetPassword onDone={()=>setNeedsPassword(false)}/>;
 return <>{children(session.user.email||'Administrador')}</>;
}

function Login(){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const submit=async(event:React.FormEvent)=>{event.preventDefault();setLoading(true);setError('');const result=await supabase!.auth.signInWithPassword({email:email.trim(),password});if(result.error)setError('E-mail ou senha incorretos.');setLoading(false)};
 const recover=async()=>{if(!email.trim()){setError('Digite seu e-mail primeiro.');return}setLoading(true);setError('');setNotice('');const result=await supabase!.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});if(result.error)setError('Não foi possível enviar o acesso. Tente novamente.');else setNotice('Enviamos um link seguro para você criar ou redefinir a senha.');setLoading(false)};
 return <main className="login-page"><section className="login-card"><div className="login-brand"><div>F</div><span><b>EcomReports</b><small>Flora Kids</small></span></div><div className="login-icon"><ShieldCheck/></div><h1>Acesso administrativo</h1><p>Entre com sua conta autorizada para visualizar os dados financeiros e de marketing.</p><form onSubmit={submit}><label><span>E-mail</span><div><Mail/><input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required autoFocus/></div></label><label><span>Senha</span><div><LockKeyhole/><input type={show?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" required/><button type="button" onClick={()=>setShow(!show)} aria-label={show?'Ocultar senha':'Mostrar senha'}>{show?<EyeOff/>:<Eye/>}</button></div></label>{error&&<div className="login-error">{error}</div>}{notice&&<div className="login-notice">{notice}</div>}<button className="login-submit" disabled={loading}>{loading?<><LoaderCircle className="spin"/>Aguarde…</>:<>Entrar com segurança</>}</button><button className="login-recover" type="button" onClick={recover} disabled={loading}>Criar ou redefinir minha senha</button></form><footer><LockKeyhole/> Sessão protegida pelo Supabase Auth</footer></section></main>;
}

function SetPassword({onDone}:{onDone:()=>void}){
 const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[show,setShow]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const save=async(event:React.FormEvent)=>{event.preventDefault();if(password.length<8){setError('Use pelo menos 8 caracteres.');return}if(password!==confirm){setError('As senhas não são iguais.');return}setLoading(true);setError('');const result=await supabase!.auth.updateUser({password});if(result.error)setError('Não foi possível salvar a senha. Solicite outro link.');else{window.history.replaceState({},'',window.location.pathname);onDone()}setLoading(false)};
 return <main className="login-page"><section className="login-card"><div className="login-brand"><div>F</div><span><b>EcomReports</b><small>Primeiro acesso</small></span></div><div className="login-icon"><LockKeyhole/></div><h1>Crie sua senha</h1><p>Defina uma senha exclusiva com pelo menos 8 caracteres.</p><form onSubmit={save}><label><span>Nova senha</span><div><LockKeyhole/><input type={show?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password" required/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label><label><span>Confirmar senha</span><div><LockKeyhole/><input type={show?'text':'password'} value={confirm} onChange={event=>setConfirm(event.target.value)} autoComplete="new-password" required/></div></label>{error&&<div className="login-error">{error}</div>}<button className="login-submit" disabled={loading}>{loading?<><LoaderCircle className="spin"/>Salvando…</>:<>Salvar senha e entrar</>}</button></form></section></main>;
}
