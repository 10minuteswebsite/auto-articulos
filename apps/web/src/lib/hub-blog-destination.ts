import {createHash,timingSafeEqual} from 'node:crypto';
export type Destination={hub_user_id:string;operation:'status'|'select'|'suspend';site_id?:string;tenant_id?:string;hostname?:string;expected_revision?:string;confirm?:true};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class BlogDestinationError extends Error{constructor(readonly code:string,readonly status:number){super(code)}}
export function validBlogHubClient(req:Request,env:Record<string,string|undefined>){
 if(req.headers.has('origin')||req.headers.has('cookie')||req.headers.has('sec-fetch-site'))return false;
 const id=env.AUTO_ARTICULOS_HUB_CLIENT_ID,secret=env.AUTO_ARTICULOS_HUB_CLIENT_SECRET,supplied=req.headers.get('authorization')??'';
 if(!id||!secret||req.headers.get('x-platform-client-id')!==id||!supplied.startsWith('Bearer '))return false;
 const a=Buffer.from(secret),b=Buffer.from(supplied.slice(7));return a.length===b.length&&timingSafeEqual(a,b);
}
export function parseBlogDestination(body:unknown):Destination{
 if(!body||typeof body!=='object'||Array.isArray(body))throw new BlogDestinationError('invalid_request',400);
 const b=body as Destination;if(Object.keys(b).some(k=>!['hub_user_id','operation','site_id','tenant_id','hostname','expected_revision','confirm'].includes(k))||!UUID.test(b.hub_user_id)||!['status','select','suspend'].includes(b.operation))throw new BlogDestinationError('invalid_request',400);
 if(b.operation==='suspend')return{hub_user_id:b.hub_user_id,operation:b.operation};
 if(typeof b.site_id!=='string'||!/^site_[0-9a-f-]{36}$/.test(b.site_id)||typeof b.tenant_id!=='string'||!/^t_[a-z0-9_-]{10,110}$/.test(b.tenant_id)||typeof b.hostname!=='string'||b.hostname.length>253||b.hostname!==b.hostname.toLowerCase()||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(b.hostname))throw new BlogDestinationError('invalid_destination',400);
 if(b.operation==='select'&&(b.confirm!==true||typeof b.expected_revision!=='string'||!/^[a-f0-9]{64}$/.test(b.expected_revision)))throw new BlogDestinationError('confirmation_required',400);return b;
}
export const destinationRevision=(method:string,blog:{tenantId:string;hostname:string|null;status:string;config?:unknown}|null)=>createHash('sha256').update(JSON.stringify({method,tenant:blog?.tenantId??null,host:blog?.hostname??null,status:blog?.status??null,config:blog?.config??null})).digest('hex');
/** Database is an injected Prisma-compatible transaction port; identity is always hubUserId, never email. */
export async function manageBlogDestination(db:any,input:Destination){
 return db.$transaction(async(tx:any)=>{
  const user=await tx.user.findUnique({where:{hubUserId:input.hub_user_id},select:{id:true,hubUserId:true,publishMethod:true}});
  if(!user)throw new BlogDestinationError('native_account_required',404);
  const blog=await tx.blogIaBlog.findUnique({where:{userId:user.id}}),config=blog?.config&&typeof blog.config==='object'&&!Array.isArray(blog.config)?blog.config:{};
  const linked=!!blog&&blog.tenantId===input.tenant_id&&blog.hostname===input.hostname&&blog.status==='active';
  const view=()=>({linked,selected:linked&&user.publishMethod==='BLOG',revision:destinationRevision(user.publishMethod,blog),current_method:user.publishMethod,current_hostname:blog?.hostname??null});
  if(input.operation==='status')return view();
  if(input.operation==='suspend'){
   if(config.hubLink?.hub_user_id===input.hub_user_id){await tx.blogIaBlog.update({where:{userId:user.id},data:{status:'suspended',lastError:'hub_blog_access_inactive'}});return{suspended:true};}
   return{suspended:false}; // Legacy destinations belong to their existing administrator.
  }
  if(linked&&user.publishMethod==='BLOG')return view(); // Exact replay is harmless.
  if(input.expected_revision!==destinationRevision(user.publishMethod,blog))throw new BlogDestinationError('destination_changed',409);
  for(const field of ['tenantId','hostname']){const other=await tx.blogIaBlog.findUnique({where:{[field]:field==='tenantId'?input.tenant_id:input.hostname}});if(other&&other.userId!==user.id)throw new BlogDestinationError('destination_conflict',409);}
  const now=new Date(),patch={tenantId:input.tenant_id,hostname:input.hostname,status:'active',dnsVerified:true,tlsReady:true,provisionedAt:now,activatedAt:now,lastError:null,config:{...config,hubLink:{hub_user_id:input.hub_user_id,site_id:input.site_id,selected_at:now.toISOString(),previous_method:user.publishMethod,previous_hostname:blog?.hostname??null}}};
  await tx.blogIaBlog.upsert({where:{userId:user.id},create:{userId:user.id,...patch},update:patch});
  const result=await tx.user.updateMany({where:{id:user.id,hubUserId:input.hub_user_id,publishMethod:user.publishMethod},data:{publishMethod:'BLOG'}});
  if(result.count!==1)throw new BlogDestinationError('destination_changed',409);
  return{linked:true,selected:true,current_method:'BLOG',current_hostname:input.hostname,revision:destinationRevision('BLOG',patch as any)};
 },{isolationLevel:'Serializable'});
}
