// UI-only Hub account context. Canonical source: la-solucion-ia/src/lib/hub-account-context.ts
(()=>{
 if(window.__hubAccountContext)return;window.__hubAccountContext=true;
 const origin='https://hub.lasolucionweb.net',frames=new Set();
 function mount(){
  for(const frame of frames)if(!frame.isConnected)frames.delete(frame);
  document.querySelectorAll('[data-hub-account-context]').forEach(holder=>{
   const email=holder.getAttribute('data-user-email'),url=new URL('/hub-account-context',origin);
   if(email&&email.length<=254)url.searchParams.set('account',email);
   let frame=holder.querySelector('iframe');
   if(frame){if(frame.src!==url.href)frame.src=url.href;return}
   frame=document.createElement('iframe');frame.src=url.href;
   frame.title='Contexto de la cuenta del Hub';frame.referrerPolicy='no-referrer';
   frame.setAttribute('sandbox','allow-scripts allow-forms allow-same-origin allow-top-navigation-by-user-activation');
   frame.className='hub-account-frame';frame.height='0';holder.append(frame);frames.add(frame);
  });
 }
 window.addEventListener('message',event=>{if(event.origin!==origin||event.data?.type!=='hub-account-context-size')return;
  for(const frame of frames)if(frame.isConnected&&event.source===frame.contentWindow){const h=event.data.height;if(Number.isFinite(h)&&h>=0&&h<=480)frame.height=String(h)}
 });
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')for(const f of frames)if(f.isConnected)f.src=f.src});
 function start(){mount();new MutationObserver(mount).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-user-email']})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
