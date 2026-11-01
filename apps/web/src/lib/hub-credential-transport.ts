import {getVercelOidcToken} from '@vercel/oidc';
import {timingSafeEqual} from 'node:crypto';
const ORIGIN='https://hub-workload-credential-broker.10minuteswebsite.workers.dev';
export class HubTransportUnavailable extends Error{constructor(){super('hub_transport_unavailable')}}
export function sharedHubTransport(){return process.env.HUB_CREDENTIAL_TRANSPORT==='shared'}
export function hubTransportConfigured(){return !!process.env.AUTO_ARTICULOS_HUB_CLIENT_ID&&(sharedHubTransport()||!!process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET)}
async function broker(path:string,body:object){
 const token=await getVercelOidcToken();
 const response=await fetch(ORIGIN+path,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json','x-platform-client-id':process.env.AUTO_ARTICULOS_HUB_CLIENT_ID??''},body:JSON.stringify(body),cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(path==='/access'?3000:12000)});
 if(response.status>=500)throw new HubTransportUnavailable();return response;
}
export async function hubBackendFetch(path:'/api/product-launch'|'/api/integrations/auto-articulos/access'|'/api/integrations/auto-articulos/user-sync',body:object){
 if(sharedHubTransport())return broker(path==='/api/product-launch'?'/exchange':path.endsWith('/user-sync')?'/user-sync':'/access',body);
 const origin=process.env.HUB_BASE_URL||'https://hub.lasolucionweb.net';
 return fetch(origin+path,{method:'POST',headers:{'content-type':'application/json','x-platform-client-id':process.env.AUTO_ARTICULOS_HUB_CLIENT_ID??'',authorization:'Bearer '+(process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET??'')},body:JSON.stringify(body),cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(12000)});
}
export async function validHubBackend(request:Request){
 if(request.headers.has('origin')||request.headers.has('cookie')||request.headers.has('sec-fetch-site'))return false;
 const id=process.env.AUTO_ARTICULOS_HUB_CLIENT_ID,supplied=request.headers.get('authorization')?.match(/^Bearer (.{1,512})$/)?.[1];
 if(!id||request.headers.get('x-platform-client-id')!==id||!supplied)return false;
 if(!sharedHubTransport()){
  const legacy=process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET;
  if(legacy&&Buffer.byteLength(legacy)===Buffer.byteLength(supplied)&&timingSafeEqual(Buffer.from(legacy),Buffer.from(supplied)))return true;
 }
 // Prepared deployments accept the new source during the explicit transition.
 const response=await broker('/verify',{credential:supplied});if(!response.ok)return false;
 const data=await response.json();return data.valid===true;
}
