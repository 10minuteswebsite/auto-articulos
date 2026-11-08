import test from'node:test';import assert from'node:assert/strict';import{isPublishableBlogIa,publishingReadiness}from'./publishing-readiness';
const db=(user:unknown)=>({user:{findUnique:async()=>user}})
test('only an explicitly selected active HTTPS blog can publish without website credentials',async()=>{
 const blog={status:'active',hostname:'own.example.com',tenantId:'tenant',provisionedAt:new Date(),activatedAt:new Date(),lastError:null,dnsVerified:true,tlsReady:true}
 assert.equal((await publishingReadiness(db({publishMethod:'BLOG',blogIaBlog:blog}),'own',false)).ready,true)
 for(const changed of [{...blog,status:'suspended'},{...blog,tlsReady:false},null])assert.equal((await publishingReadiness(db({publishMethod:'BLOG',blogIaBlog:changed}),'own',true)).ready,false)
 assert.equal((await publishingReadiness(db({publishMethod:'BROWSER'}),'own',false)).ready,false)
 assert.equal((await publishingReadiness(db({publishMethod:'BROWSER'}),'own',true)).ready,true)
})

test('BLOG IA solo es válido con dominio propio confirmado y evidencia de provisión/activación',()=>{
 const ready={status:'active',hostname:'blog.example.com',tenantId:'tenant',provisionedAt:new Date(),activatedAt:new Date(),lastError:null,dnsVerified:true,tlsReady:true}
 assert.equal(isPublishableBlogIa(ready),true)
 for (const blog of [
  null,
  {...ready,hostname:'blog.lasolucionweb.net'},
  {...ready,status:'pending_dns'},
  {...ready,status:'domain_error'},
  {...ready,dnsVerified:false},
  {...ready,tlsReady:false},
  {...ready,lastError:'DNS error'},
  {...ready,tenantId:null},
  {...ready,provisionedAt:null},
  {...ready,activatedAt:null},
 ]) assert.equal(isPublishableBlogIa(blog as any),false)
})

test('blogAvailable: un blog vinculado y listo se ofrece aunque hoy se publique en el sitio; sin blog o a medias, no',async()=>{
 const blog={status:'active',hostname:'own.example.com',tenantId:'tenant',provisionedAt:new Date(),activatedAt:new Date(),lastError:null,dnsVerified:true,tlsReady:true}
 const a=await publishingReadiness(db({publishMethod:'BROWSER',blogIaBlog:blog}),'own',false)
 assert.equal(a.blogAvailable,true);assert.equal(a.availableHostname,'own.example.com');assert.equal(a.ready,false)
 assert.equal((await publishingReadiness(db({publishMethod:'BROWSER',blogIaBlog:null}),'own',false)).blogAvailable,false)
 assert.equal((await publishingReadiness(db({publishMethod:'BROWSER',blogIaBlog:{...blog,status:'pending_dns'}}),'own',false)).blogAvailable,false)
})
