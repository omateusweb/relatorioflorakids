(function(){
 var script=document.currentScript;
 var endpoint=script&&script.dataset.endpoint||'https://relatorioflorakids.vercel.app/api/track';
 var storage=window.localStorage,now=Date.now(),query=new URLSearchParams(location.search);
 var visitor=storage.getItem('ecom_vid')||crypto.randomUUID();
 var raw;try{raw=JSON.parse(storage.getItem('ecom_session')||'null')}catch(e){raw=null}
 var session=!raw||now-raw.at>18e5?{id:crypto.randomUUID(),at:now,landing:location.href,attrs:{}}:raw;
 var keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','gclid','ttclid'];
 session.attrs=session.attrs||{};
 keys.forEach(function(key){var value=query.get(key);if(value)session.attrs[key]=value});
 storage.setItem('ecom_vid',visitor);storage.setItem('ecom_session',JSON.stringify(session));
 function send(extra){
  var body=Object.assign({event_id:crypto.randomUUID(),event_name:'page_view',visitor_id:visitor,session_id:session.id,page_url:location.href,landing_page:session.landing,referrer:document.referrer||null},session.attrs,extra||{});
  return fetch(endpoint,{method:'POST',mode:'cors',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(function(){console.warn('EcomReports tracking unavailable')});
 }
 window.EcomReportsTrack=send;
 send();
})();
