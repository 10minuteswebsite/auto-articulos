import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {middleware} from '../middleware';
test('the exact Hub blog endpoint reaches its backend auth gate without making other APIs public',async()=>{
 const own=await middleware(new NextRequest('https://articulos.lasolucionweb.net/api/integrations/hub/blog-destination',{method:'POST'}));
 assert.equal(own.headers.get('x-middleware-next'),'1');
 const unrelated=await middleware(new NextRequest('https://articulos.lasolucionweb.net/api/me'));
 assert.equal(unrelated.status,401);
 const child=await middleware(new NextRequest('https://articulos.lasolucionweb.net/api/integrations/hub/blog-destination/other',{method:'POST'}));
 assert.equal(child.status,401);
});
