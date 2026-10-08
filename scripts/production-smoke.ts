import {appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

type Options={origin:string;expectedRelease?:string;timeoutMs?:number;fetcher?:(url:string,init?:RequestInit)=>Promise<Response>};
type Check={path:string;ok:boolean;status?:number;reason?:string};
type Health={status?:unknown;check?:unknown;release?:unknown;accounts?:unknown;scheduled_jobs?:unknown;payments?:unknown;email_delivery_enabled?:unknown;monitoring?:unknown};
export async function runProductionSmoke({origin,expectedRelease,timeoutMs=15000,fetcher=fetch}:Options){
 const base=new URL(origin);if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw new Error('Use an HTTPS origin without credentials, path, query or fragment.');
 let health:Health={};
 const paths=['/','/login','/admin/login','/engagement','/portal','/admin','/api/engagement-billing','/api/jobs','/api/grant-discovery','/api/health'];
 const checks:Check[]=await Promise.all(paths.map(async path=>{
  try{
   const r=await fetcher(base.origin+path,{redirect:'manual',signal:AbortSignal.timeout(timeoutMs),headers:{'user-agent':'Champion-Production-Check/1.0'}});
   if(['/portal','/admin'].includes(path)){
    const target=r.headers.get('location');const destination=target?new URL(target,base):null;
    if(r.status!==307||destination?.origin!==base.origin||destination.pathname!==(path==='/admin'?'/admin/login':'/login'))return {path,ok:false,status:r.status,reason:'Unauthenticated portal did not redirect to its own sign-in page.'};
   }else if(path.startsWith('/api/')&&path!=='/api/health'){
    if(r.status!==401)return {path,ok:false,status:r.status,reason:'Private or scheduled endpoint did not reject an unauthenticated request.'};
   }else{
    if(r.status!==200)return {path,ok:false,status:r.status,reason:'Public endpoint is unavailable or unexpectedly protected.'};
    if(path==='/api/health'){
     const body=await r.json();if(!body||typeof body!=='object'||Array.isArray(body))return {path,ok:false,status:r.status,reason:'Invalid health response.'};health=body as Health;
     if(health.status!=='ok'||health.check!=='configuration_only'||health.accounts!==true||health.scheduled_jobs!==true||typeof health.release!=='string'||!/^[a-f0-9]{40}$/.test(health.release))return {path,ok:false,status:r.status,reason:'Required runtime configuration or release identifier is missing.'};
     if(expectedRelease&&health.release!==expectedRelease)return {path,ok:false,status:r.status,reason:'Production is not serving the expected release.'};
    }else{
     if(!r.headers.get('content-type')?.includes('text/html')||!(await r.text()).includes('Champion'))return {path,ok:false,status:r.status,reason:'Expected application page did not render.'};
     if(r.headers.get('x-frame-options')!=='DENY'||r.headers.get('x-content-type-options')!=='nosniff')return {path,ok:false,status:r.status,reason:'Expected browser security headers are missing.'};
    }
   }
   return {path,ok:true,status:r.status};
  }catch{return {path,ok:false,reason:'Request failed, timed out, or returned invalid data.'};}
 }));
 const pendingConfiguration=[];
 if(health.payments!==true)pendingConfiguration.push('Payment credentials');
 if(health.email_delivery_enabled!==true)pendingConfiguration.push('Application email activation');
 if(health.monitoring!==true)pendingConfiguration.push('External error reporting');
 return {checkedAt:new Date().toISOString(),origin:base.origin,ok:checks.every(c=>c.ok),checks,release:typeof health.release==='string'&&/^[a-f0-9]{40}$/.test(health.release)?health.release:null,pendingConfiguration,scope:'Availability and unauthenticated access checks only; provider delivery and customer launch acceptance remain separate.'};
}
export function smokeSummary(result:Awaited<ReturnType<typeof runProductionSmoke>>){return ['# Champion production availability',`Result: **${result.ok?'PASS':'FAIL'}**`,result.scope,'','| Endpoint | Result | HTTP |','|---|---|---|',...result.checks.map(c=>`| ${c.path} | ${c.ok?'PASS':'FAIL'} | ${c.status??'request failed'} |`),'',`Release: ${result.release??'unavailable'}`,`Pending configuration: ${result.pendingConfiguration.join(', ')||'none detected (delivery not verified)'}`,'',...result.checks.filter(c=>!c.ok).map(c=>`${c.path}: ${c.reason}`),''].join('\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const result=await runProductionSmoke({origin:process.env.PRODUCTION_ORIGIN||'https://champion-consulting-v2-two.vercel.app',expectedRelease:process.env.EXPECTED_RELEASE||undefined});console.log(JSON.stringify(result,null,2));if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,smokeSummary(result));if(!result.ok)process.exitCode=1;}
 catch{console.error('Production check could not start. Verify its origin and runtime configuration.');process.exitCode=1;}
}
