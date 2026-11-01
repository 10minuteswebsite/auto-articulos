import {getVercelOidcToken} from '@vercel/oidc';
import {timingSafeEqual} from 'node:crypto';
const ORIGIN='https://hub-workload-credential-broker.10minuteswebsite.workers.dev';
export class HubTransportUnavailable extends Error{constructor(){super('hub_transport_unavailable')}}
export function sharedHubTransport(){return process.env.HUB_CREDENTIAL_TRANSPORT==='shared'}
export function hubTransportConfigured(){return !!process.env.AUTO_ARTICULOS_HUB_CLIENT_ID&&(sharedHubTransport()||!!process.env.AUTO_ARTICULOS_HUB_CLIENT_SECRET)}
async function broker(path:string,body:object){
 let token:string;
 if(process.env.HUB_WORKLOAD_IDENTITY==='github-actions'){
  if(path!=='/user-sync'||process.env.GITHUB_ACTIONS!=='true')throw new HubTransportUnavailable();
  const raw=process.env.ACTIONS_ID_TOKEN_REQUEST_URL,credential=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if(!raw||!credential)throw new HubTransportUnavailable();
  const url=new URL(raw);if(url.protocol!=='https:'||!url.hostname.endsWith('.actions.githubusercontent.com')||url.username||url.password||url.port)throw new HubTransportUnavailable();
  url.searchParams.set('audience',ORIGIN+'/github-user-sync');
  const r=await fetch(url,{headers:{authorization:'Bearer '+credential},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw new HubTransportUnavailable();const d=await r.json();if(typeof d.value!=='string'||d.value.length>16384||!/^[-A-Za-z0-9_.]{32,}$/.test(d.value))throw new HubTransportUnavailable();token=d.value;
 }else{token=await getVercelOidcToken();}
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
