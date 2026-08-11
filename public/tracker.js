(function(){
 var script=document.currentScript;
 var endpoint=script&&script.dataset.endpoint||'https://relatorioflorakids.vercel.app/api/track';
 var storage=window.localStorage,now=Date.now(),query=new URLSearchParams(location.search);
 var cookieDomain=/^(?:www\.)?florakids\.com\.br$/.test(location.hostname)?'; Domain=.florakids.com.br':'';
 var readCookie=function(name){var found=document.cookie.split('; ').find(function(row){return row.indexOf(name+'=')===0});return found?decodeURIComponent(found.slice(name.length+1)):null};
 var saveCookie=function(name,value,age){document.cookie=name+'='+encodeURIComponent(value)+'; Path=/; Max-Age='+age+'; SameSite=Lax; Secure'+cookieDomain};
 var visitor=readCookie('ecom_vid')||storage.getItem('ecom_vid')||crypto.randomUUID();
 var raw;try{raw=JSON.parse(readCookie('ecom_session')||storage.getItem('ecom_session')||'null')}catch(e){raw=null}
 var session=!raw||now-raw.at>18e5?{id:crypto.randomUUID(),at:now,landing:location.href,attrs:{}}:raw;
 var keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ttclid'];
 session.attrs=session.attrs||{};
 keys.forEach(function(key){var value=query.get(key);if(value)session.attrs[key]=value});
 storage.setItem('ecom_vid',visitor);storage.setItem('ecom_session',JSON.stringify(session));saveCookie('ecom_vid',visitor,31536000);saveCookie('ecom_session',JSON.stringify(session),2592000);
 function send(extra){
  var body=Object.assign({event_id:crypto.randomUUID(),event_name:'page_view',visitor_id:visitor,session_id:session.id,page_url:location.href,landing_page:session.landing,referrer:document.referrer||null},session.attrs,extra||{});
  return fetch(endpoint,{method:'POST',mode:'cors',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(function(){console.warn('EcomReports tracking unavailable')});
 }
 window.EcomReportsTrack=send;
 send();
})();
