import {supabase} from './supabase';

export async function apiFetch(input:RequestInfo|URL,init:RequestInit={}){
 const {data}=await supabase!.auth.getSession();
 const token=data.session?.access_token;
 const headers=new Headers(init.headers);
 if(token)headers.set('authorization',`Bearer ${token}`);
 return fetch(input,{...init,headers});
}
