/** A Hub-selected BLOG destination uses the signed publisher, never a website password. */
export async function publishingReadiness(db:any,userId:string,hasWebsiteCredential:boolean){
 const user=await db.user.findUnique({where:{id:userId},select:{publishMethod:true,blogIaBlog:{select:{status:true,hostname:true,dnsVerified:true,tlsReady:true}}}})
 if(user?.publishMethod!=='BLOG')return{ready:hasWebsiteCredential,destination:'website' as const,hostname:null}
 const blog=user.blogIaBlog
 return{ready:!!blog&&blog.status==='active'&&blog.dnsVerified===true&&blog.tlsReady===true,destination:'blog-ia' as const,hostname:blog?.hostname??null}
}
