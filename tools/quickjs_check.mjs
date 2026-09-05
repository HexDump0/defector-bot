// Run with: node tools/quickjs_check.mjs /path/to/dependencies candidate.ts [reps] [seed]
// Matches production's QuickJS-NG variant, 1e6-byte heap/stack and 10ms deadline.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {stripTypeScriptTypes} from 'node:module';
import {snapshot,population,random,payoff} from './research.mjs';
const require=createRequire(path.resolve(process.argv[2],'package.json'));
const {newQuickJSWASMModuleFromVariant,shouldInterruptAfterDeadline}=require('quickjs-emscripten-core');
const variant=require('@jitl/quickjs-ng-wasmfile-release-sync').default;
const Q=await newQuickJSWASMModuleFromVariant(variant);
const candidate=stripTypeScriptTypes(fs.readFileSync(process.argv[3],'utf8'));
const repetitions=+(process.argv[4]||10),seed=+(process.argv[5]||51001);
const compiled=population.map(b=>stripTypeScriptTypes(b.source));
let maxHeap=0,maxMoveMs=0,memoryBytes=0;const durations=[];
function sandbox(source,seed,measure=false) {
  const ctx=Q.newContext();ctx.runtime.setMemoryLimit(1e6);ctx.runtime.setMaxStackSize(1e6);
  ctx.unwrapResult(ctx.evalCode(`Math.random=(${random.toString()})(${seed});`)).dispose();
  const module=ctx.unwrapResult(ctx.evalCode(source,'bot.js',{type:'module'}));
  ctx.runtime.executePendingJobs();const fn=ctx.getProp(module,'default');module.dispose();
  function call(state) {
    ctx.runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now()+10));
    const start=performance.now();
    const input=ctx.unwrapResult(ctx.evalCode('('+JSON.stringify(state)+')','state.js'));
    try {
      const output=ctx.unwrapResult(ctx.callFunction(fn,ctx.undefined,input));
      try {
        const result=ctx.dump(output);
        if(!Array.isArray(result)||result.length!==2||!['C','D'].includes(result[0]))throw Error('invalid tuple');
        if(measure){const ms=performance.now()-start;maxMoveMs=Math.max(maxMoveMs,ms);durations.push(ms);memoryBytes=Math.max(memoryBytes,JSON.stringify(result[1]??null).length);}
        return result;
      }finally{output.dispose();}
    }finally{
      input.dispose();
      if(measure&&state.history.length%40===0){ctx.runtime.removeInterruptHandler();const usage=ctx.runtime.computeMemoryUsage();maxHeap=Math.max(maxHeap,ctx.dump(usage).memory_used_size);usage.dispose();}
    }
  }
  return {call,dispose(){fn.dispose();ctx.dispose();}};
}
function battle(aSource,bSource,N,seed,initialMemory=null) {
  const a=sandbox(aSource,seed,true),b=sandbox(bSource,seed^0xABCD1234);
  const states=[{history:[],memory:initialMemory},{history:[],memory:null}];let scores=[0,0],errors=[null,null];
  try {
    for(let n=0;n<N;n++) {
      const moves=[];
      for(let i=0;i<2;i++)try{const out=[a,b][i].call(states[i]);moves[i]=out[0];states[i].memory=out[1];}catch(e){errors[i]=String(e);}
      if(errors.some(Boolean)){scores=[errors[0]?0:3,errors[1]?0:3];break;}
      for(let i=0;i<2;i++){scores[i]+=payoff(moves[i],moves[1-i])/N;states[i].history.push({you:moves[i],opponent:moves[1-i]});}
    }
  } finally {a.dispose();b.dispose();}
  return {scores,errors};
}
const rng=random(seed),rows=[];
for(let i=0;i<population.length;i++) {
  const samples=[],opponentSamples=[],errors=[];
  for(let j=0;j<repetitions;j++) {
    const n=Math.floor(100-20*Math.log(1-rng()));
    const result=battle(candidate,compiled[i],n,(seed+i*100003+j*1009)>>>0);
    samples.push(result.scores[0]);opponentSamples.push(result.scores[1]);if(result.errors.some(Boolean))errors.push(result.errors);
  }
  rows.push({name:population[i].name,id:population[i].id,score:samples.reduce((a,b)=>a+b,0)/repetitions,samples,opponentSamples,errors});
}
const extra=[];
for(const n of [100,120,160,500,1000])for(const other of [candidate,'export default ()=>["C",null]','export default ()=>["D",null]']) {
  extra.push({rounds:n,opponent:other===candidate?'self':other.includes('"C"')?'AllC':'AllD',...battle(candidate,other,n,seed)});
}
for(const m of [null,0,[],{},'bad',{seen:-1,sparsePeace:true}])extra.push({memory:m,...battle(candidate,'export default ({history})=>[history.at(-1)?.opponent||"C",null]',120,seed,m)});
durations.sort((a,b)=>a-b);
console.log(JSON.stringify({snapshot:snapshot.scraped_at,seed,repetitions,mean:rows.reduce((s,r)=>s+r.score,0)/rows.length,candidateFailures:rows.reduce((s,r)=>s+r.errors.filter(x=>x[0]).length,0),opponentFailures:rows.reduce((s,r)=>s+r.errors.filter(x=>x[1]).length,0),maxHeap,maxMoveMs,p999MoveMs:durations[Math.floor(durations.length*.999)],memoryBytes,rows,extra},null,2));
