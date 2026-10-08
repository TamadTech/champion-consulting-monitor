import {appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function checkRuntime(fetcher:typeof fetch=fetch){
    try {
        const r=await fetcher('https://champion-consulting-v2-two.vercel.app/api/runtime-health',{redirect:'error',signal:AbortSignal.timeout(15000)});
        const b=await r.json();
        if(r.status===200&&b.status==='ok'&&b.drill===false)return {ok:true,reason:'No unacknowledged server errors',drill:false};
        if(r.status===503&&b.status==='error_pending'&&typeof b.drill==='boolean')return {ok:false,reason:'Unacknowledged server error or monitoring drill',drill:b.drill};
    } catch { /* Never echo upstream bodies, URLs or exception messages. */ }
    return {ok:false,reason:'Runtime monitor unavailable or invalid response',drill:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
    const result=await checkRuntime();console.log(JSON.stringify(result));
    if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`# Champion server errors\n\n${result.ok?'PASS':'FAIL'}: ${result.reason}\n\nDrill flag: ${result.drill}. No customer data is included.\n`);
    if(!result.ok)process.exitCode=1;
}
