/** A Hub-selected BLOG destination uses the signed publisher, never a website password. */
export const BLOG_IA_STARTER_SUFFIX = ".lasolucionweb.net";

export type BlogIaReadiness = {
  status: string;
  hostname: string | null;
  dnsVerified: boolean;
  tlsReady: boolean;
  tenantId: string | null;
  provisionedAt: Date | null;
  activatedAt: Date | null;
  lastError: string | null;
};

export function isPublishableBlogIa(blog: BlogIaReadiness | null | undefined): boolean {
  if (!blog || blog.status !== "active" || !blog.hostname || !blog.tenantId) return false;
  const hostname = blog.hostname.trim().toLowerCase();
  if (!hostname || hostname.endsWith(BLOG_IA_STARTER_SUFFIX)) return false;
  if (!blog.dnsVerified || !blog.tlsReady || !blog.provisionedAt || !blog.activatedAt || blog.lastError) return false;
  try {
    const url = new URL(`https://${hostname}`);
    return url.hostname === hostname && url.pathname === "/";
  } catch {
    return false;
  }
}

export async function publishingReadiness(db:any,userId:string,hasWebsiteCredential:boolean){
 const user=await db.user.findUnique({where:{id:userId},select:{publishMethod:true,blogIaBlog:{select:{status:true,hostname:true,dnsVerified:true,tlsReady:true,tenantId:true,provisionedAt:true,activatedAt:true,lastError:true}}}})
 const blog=user?.blogIaBlog as BlogIaReadiness | null | undefined
 // El Hub es la fuente de verdad del vínculo. La dirección provisional nunca es un destino publicable.
 const blogAvailable=isPublishableBlogIa(blog)
 if(user?.publishMethod!=='BLOG')return{ready:hasWebsiteCredential,destination:'website' as const,hostname:null,blogAvailable,availableHostname:blogAvailable?blog!.hostname??null:null}
 return{ready:blogAvailable,destination:'blog-ia' as const,hostname:blog?.hostname??null,blogAvailable,availableHostname:null}
}
