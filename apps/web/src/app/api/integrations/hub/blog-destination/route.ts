import{prisma}from'@auto-articulos/db';
import{BlogDestinationError,validBlogHubClient,parseBlogDestination,manageBlogDestination}from'@/lib/hub-blog-destination';
export const runtime='nodejs';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
 if(!validBlogHubClient(request,process.env))return reply({error:'unauthorized'},401);
 if(Number(request.headers.get('content-length')??0)>4096)return reply({error:'invalid_request'},413);
 try{const text=await request.text();if(Buffer.byteLength(text)>4096)return reply({error:'invalid_request'},413);const input=parseBlogDestination(JSON.parse(text));return reply({data:await manageBlogDestination(prisma,input)});}
 catch(e){if(e instanceof SyntaxError)return reply({error:'invalid_request'},400);if(e instanceof BlogDestinationError)return reply({error:e.code},e.status);if(e&&typeof e==='object'&&'code'in e&&['P2002','P2034'].includes(String(e.code)))return reply({error:'destination_changed'},409);return reply({error:'destination_unavailable'},503);}
}
