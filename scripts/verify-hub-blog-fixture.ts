import {prisma} from '@auto-articulos/db';
import {sendBlogIaEvent,BlogIaError} from '@auto-articulos/shared';
async function main(){
 const owner=process.env.TRIAL_HUB_USER_ID??'',negative=process.env.TRIAL_EXPECT_DENIED==='true';
 if(!/^[0-9a-f-]{36}$/.test(owner))throw Error('synthetic_tenant_required');
 const user=await prisma.user.findUnique({where:{hubUserId:owner},select:{email:true,publishMethod:true,blogIaBlog:{select:{tenantId:true,hostname:true,status:true}}}});
 if(user?.email!==`cf-launch-${owner}@example.invalid`||user.publishMethod!=='BLOG'||!user.blogIaBlog?.hostname?.endsWith('.blogs.lasolucionweb.net'))throw Error('synthetic_owned_blog_required');
 const blog=user.blogIaBlog,apiUrl=process.env.BLOG_IA_API_URL??'',secret=process.env.BLOG_IA_SECRET??'';
 if(!secret||apiUrl!=='https://blog-ia.10minuteswebsite.workers.dev')throw Error('existing_blog_provider_configuration_required');
 const slug='ensayo-integracion-hub',event={eventId:`harness:${owner}:${negative?'revoked':'active'}`,type:'article.publish',tenantId:blog.tenantId,data:{source_article_id:`harness-${owner}`,slug,title:'Ensayo técnico de integración del Hub',excerpt:'Contenido sintético de verificación; no es una publicación comercial.',body_html:'<p>Esta página es un ensayo técnico temporal de BLOG IA y CREA ARTÍCULOS. Comprueba la recepción firmada de contenido sintético y su lectura pública.</p><h2>Prueba aislada</h2><p>No contiene datos de clientes ni se utiliza para recomendaciones.</p>',author:'Ensayo técnico',revision:1,published_at:new Date().toISOString(),category_ids:[],language:'es'}};
 if(negative){try{await sendBlogIaEvent({apiUrl,secret},event);throw Error('expected_denial_missing')}catch(e){if(!(e instanceof BlogIaError)||e.status!==403)throw Error('expected_denial_missing')}console.log(JSON.stringify({test:'hub_blog_fixture',denied:403}));return}
 const first=await sendBlogIaEvent({apiUrl,secret},event),replay=await sendBlogIaEvent({apiUrl,secret},event);
 if(replay.result!=='duplicate')throw Error('replay_not_idempotent');
 const url=`https://${blog.hostname}/${slug}`;const page=await fetch(url,{redirect:'manual'}),html=await page.text();if(page.status!==200||!html.includes('Ensayo técnico de integración del Hub'))throw Error('public_effect_missing');
 console.log(JSON.stringify({test:'hub_blog_fixture',delivery:first.result,replay:replay.result,public_status:page.status,url}));
}
main().catch((e)=>{const allowed=['synthetic_tenant_required','synthetic_owned_blog_required','existing_blog_provider_configuration_required','expected_denial_missing','replay_not_idempotent','public_effect_missing'];console.error(JSON.stringify({test:'hub_blog_fixture',failure:e instanceof BlogIaError?'provider_rejected':allowed.includes(e?.message)?e.message:'dependency_unavailable',status:e instanceof BlogIaError?e.status:null}));process.exitCode=1}).finally(()=>prisma.$disconnect());
