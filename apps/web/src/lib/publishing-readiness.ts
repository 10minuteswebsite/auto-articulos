/** A Hub-selected BLOG destination uses the signed publisher, never a website password. */
export async function publishingReadiness(db:any,userId:string,hasWebsiteCredential:boolean){
 const user=await db.user.findUnique({where:{id:userId},select:{publishMethod:true,blogIaBlog:{select:{status:true,hostname:true,dnsVerified:true,tlsReady:true}}}})
 const blog=user?.blogIaBlog
 // Blog ya vinculado (lo escribió el Hub al pulsar «Usar este blog») y listo, aunque hoy se publique en otro destino.
 const blogAvailable=!!blog&&blog.status==='active'&&blog.dnsVerified===true&&blog.tlsReady===true
 if(user?.publishMethod!=='BLOG')return{ready:hasWebsiteCredential,destination:'website' as const,hostname:null,blogAvailable,availableHostname:blogAvailable?blog!.hostname??null:null}
 return{ready:blogAvailable,destination:'blog-ia' as const,hostname:blog?.hostname??null,blogAvailable,availableHostname:null}
}
