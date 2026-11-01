import test,{mock}from'node:test';import assert from'node:assert/strict';
mock.module('@vercel/oidc',{namedExports:{getVercelOidcToken:async()=>'fixture-workload-token'}});
process.env.AUTO_ARTICULOS_HUB_CLIENT_ID='fixture-client';process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET='legacy-fixture';
const request=(token:string)=>new Request('https://app.invalid',{headers:{'x-platform-client-id':'fixture-client',authorization:'Bearer '+token}});
test('legacy bridge and shared mode use distinct authority without returning or caching credentials',async()=>{
 const {hubBackendFetch,validHubBackend}=await import('./hub-credential-transport');
 const fetchOriginal=globalThis.fetch;const calls:Array<{url:string;headers:Headers;body:any}>=[];
 globalThis.fetch=async(input:any,init:any)=>{calls.push({url:String(input),headers:new Headers(init.headers),body:JSON.parse(init.body)});return Response.json({valid:true,allowed:true})};
 try{
  assert(await validHubBackend(request('legacy-fixture')));assert.equal(calls.length,0);
  await hubBackendFetch('/api/product-launch',{app:'seo-total',code:'c'.repeat(48)});assert(calls[0].url.startsWith('https://hub.lasolucionweb.net/'));assert.equal(calls[0].headers.get('authorization'),'Bearer legacy-fixture');
  process.env.HUB_CREDENTIAL_TRANSPORT='shared';
  await hubBackendFetch('/api/integrations/auto-articulos/access',{hub_user_id:'fixture',app:'auto-redes'});assert(calls[1].url.endsWith('/access'));assert.equal(calls[1].headers.get('authorization'),'Bearer fixture-workload-token');
  assert(await validHubBackend(request('new-fixture')));assert(calls[2].url.endsWith('/verify'));assert.equal(calls[2].body.credential,'new-fixture');
  const browser=request('new-fixture');browser.headers.set('origin','https://browser.invalid');assert.equal(await validHubBackend(browser),false);assert.equal(calls.length,3);
  globalThis.fetch=async()=>Response.json({error:'unavailable'},{status:503});await assert.rejects(validHubBackend(request('legacy-fixture'))); // no legacy fallback
 }finally{globalThis.fetch=fetchOriginal;delete process.env.HUB_CREDENTIAL_TRANSPORT}
});
