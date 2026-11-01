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

test('Actions obtains a short-lived identity only for user sync and never forwards legacy secrets',async()=>{
 const{hubBackendFetch}=await import('./hub-credential-transport');const original=globalThis.fetch;const calls:string[]=[];
 process.env.HUB_CREDENTIAL_TRANSPORT='shared';process.env.HUB_WORKLOAD_IDENTITY='github-actions';process.env.GITHUB_ACTIONS='true';process.env.ACTIONS_ID_TOKEN_REQUEST_URL='https://run.actions.githubusercontent.com/token';process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN='temporary-request-only';
 globalThis.fetch=async(input:any,init:any)=>{calls.push(String(input));if(String(input).includes('actions.githubusercontent.com'))return Response.json({value:'x'.repeat(64)});assert.equal(new Headers(init.headers).get('authorization'),'Bearer '+'x'.repeat(64));return Response.json({ok:true})};
 try{await hubBackendFetch('/api/integrations/auto-articulos/user-sync',{local_user_id:'native',email:'invalid'});assert.equal(calls.length,2);assert(calls[0].includes('audience='));assert(calls[1].endsWith('/user-sync'));await assert.rejects(hubBackendFetch('/api/product-launch',{app:'seo-total',code:'x'.repeat(48)}));assert.equal(calls.length,2);process.env.ACTIONS_ID_TOKEN_REQUEST_URL='https://evil.invalid/token';await assert.rejects(hubBackendFetch('/api/integrations/auto-articulos/user-sync',{}));assert.equal(calls.length,2)}finally{globalThis.fetch=original;for(const k of ['HUB_CREDENTIAL_TRANSPORT','HUB_WORKLOAD_IDENTITY','GITHUB_ACTIONS','ACTIONS_ID_TOKEN_REQUEST_URL','ACTIONS_ID_TOKEN_REQUEST_TOKEN'])delete process.env[k]}
});
