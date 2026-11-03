/* Presentation only. Keeps original links, buttons, forms and permission gates. */
(()=>{
 if(window.__responsiveNavigation)return;window.__responsiveNavigation=true;
 const rootSelector='[data-responsive-navigation]';
 function setOpen(root,open,focus=false){
  root.setAttribute('data-navigation-open',String(open));
  const button=root.querySelector('[data-navigation-toggle]');
  button?.setAttribute('aria-expanded',String(open));
  if(!open)root.querySelectorAll('details[open]').forEach(d=>d.removeAttribute('open'));
  if(focus)button?.focus();
 }
 function closeOthers(except){document.querySelectorAll(rootSelector+'[data-navigation-open="true"]').forEach(root=>{if(root!==except)setOpen(root,false)})}
 document.addEventListener('click',event=>{
  const target=event.target;if(!(target instanceof Element))return;
  const toggle=target.closest('[data-navigation-toggle]');
  if(toggle){const root=toggle.closest(rootSelector);if(!root)return;const open=root.getAttribute('data-navigation-open')!=='true';closeOthers(root);setOpen(root,open);return}
  const root=target.closest(rootSelector);
  if(target.closest('a[href]')||target.closest('[data-navigation-panel] button')||!root)closeOthers(null);
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll(rootSelector+'[data-navigation-open="true"]').forEach(root=>setOpen(root,false,true))});
 const desktop=matchMedia('(min-width: 1024px)');desktop.addEventListener('change',()=>closeOthers(null));
})();
