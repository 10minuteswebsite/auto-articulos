import test from'node:test';import assert from'node:assert/strict';import{publishingReadiness}from'./publishing-readiness';
const db=(user:unknown)=>({user:{findUnique:async()=>user}})
test('only an explicitly selected active HTTPS blog can publish without website credentials',async()=>{
 const blog={status:'active',hostname:'own.blogs.lasolucionweb.net',dnsVerified:true,tlsReady:true}
 assert.equal((await publishingReadiness(db({publishMethod:'BLOG',blogIaBlog:blog}),'own',false)).ready,true)
 for(const changed of [{...blog,status:'suspended'},{...blog,tlsReady:false},null])assert.equal((await publishingReadiness(db({publishMethod:'BLOG',blogIaBlog:changed}),'own',true)).ready,false)
 assert.equal((await publishingReadiness(db({publishMethod:'BROWSER'}),'own',false)).ready,false)
 assert.equal((await publishingReadiness(db({publishMethod:'BROWSER'}),'own',true)).ready,true)
})
