// Offline rollout planner: all strategic state in the emitted bot is ordinary memory.
// Hypothesis: conditional action sequences can outperform a single response threshold.
// Baselines: Apex v4 and goat v4.1; training seed 4101; uniform active September 5 pool.
// Acceptance: independent Rust/QuickJS evaluation, new seeds and population perturbations.
import fs from 'node:fs';
import {population, compiled, clone, compile, payoff} from './research.mjs';

const baseline = compile(fs.readFileSync('bots/candidate_v4.ts','utf8'))(1);
// Policy 0 is a conservative history-based fallback. Others are search continuations.
export function policy(id, h, start) {
  const n=h.length, last=h[n-1], prev=h[n-2];
  if(id===0) {
    if(!n)return 'C';
    // Preserve sparse, unprovoked periodic cooperation from the baseline.
    const clean=h.every(r=>r.you==='C');
    if(clean && (h.slice(0,3).map(r=>r.opponent).join('')==='CCD' || h.slice(0,5).map(r=>r.opponent).join('')==='CCCCD') && !h.some((r,i)=>i&&r.opponent==='D'&&h[i-1].opponent==='D'))return 'C';
    return baseline({history:h,memory:null})[0];
  }
  if(id===1)return 'C';
  if(id===2)return 'D';
  if(id===3)return last?.opponent||'C';
  if(id===4)return last?.opponent==='D'&&prev?.opponent==='D'?'D':'C';
  if(id===5)return last?.opponent==='D'&&prev?.you!=='D'?'D':'C';
  if(id===6)return h.slice(-3).every(r=>r.opponent==='D')&&n>=3?'D':'C';
  if(id>=7&&id<=16){const patterns=['DC','DDC','DCC','DDCC','DCCC','DDDCC','DDCCC','DCCCC','DDDDC','DDDDDCCCC'];return patterns[id-7][(n-start)%patterns[id-7].length];}
  if(id>=17&&id<=22){
    // Probe, allow a reaction, then select a continuation from the observed response.
    if(n===start)return 'D';
    if(n<=start+2)return 'C';
    const reacted=h.slice(start+1,start+3).some(r=>r.opponent==='D');
    if(reacted)return policy(id<20?0:5,h,start);
    if(id%3===2)return 'D';
    return (n-start)%2?'C':'D';
  }
  if(id>=23&&id<=25){
    const warm=[2,4,8][id-23];
    return n<start+warm?'C':policy(0,h,start);
  }
  if(id>=26&&id<=34){
    const fraction=(id-25)/10;
    const defects=h.reduce((s,r)=>s+(r.you==='D'),0);
    return defects/(n+1)<fraction?'D':'C';
  }
  if(id>=35&&id<=40){
    const periods=['DDDDCCCC','DDDDDCCCCC','DDDDDDDDDDCCCCCCCCCC','DDDDDDDDDDDDDDDDDDDDCCCCCCCCCCCCCCCCCCCC','DCCCCCCCCCC','DDCCCCCCCC'];
    const seq=periods[id-35];return seq[(n-start)%seq.length];
  }
  if(id>=41&&id<=45)return n-start<[5,10,20,40,60][id-41]?'C':'D';
  if(id>=46&&id<=50)return n-start<[5,10,20,40,60][id-46]?'D':'C';
  return 'D';
}

if(process.argv[1]?.endsWith('plan_population.mjs')) {
  const maxDepth=+(process.argv[2]||24), repetitions=+(process.argv[3]||8);
  const excluded=new Set((process.env.EXCLUDE||'').split(',').filter(Boolean));
  const nodes=[]; let visits=0;
  const cohort=[];
  for(let i=0;i<population.length;i++) {
    if(excluded.has(population[i].name)||population[i].name==='copycat')continue;
    const stochastic=/Math\.random/.test(population[i].source);
    const count=stochastic?repetitions:1;
    for(let j=0;j<count;j++)cohort.push({i, seed:4101+i*1009+j*100003, memory:null, rng:null,weight:1/count,stochastic});
  }
  const actors=new Map();
  function actor(p){const key=p.seed;if(!actors.has(key))actors.set(key,compiled[p.i](p.seed));return actors.get(key);}
  function move(p, h) {
    const bot=actor(p);
    if(p.rng!=null)bot.random.restore(p.rng);
    else bot.random.restore(p.seed>>>0);
    try {
      const [m,mem]=bot({history:h,memory:clone(p.memory)});
      if(m!=='C'&&m!=='D')return null;
      return {move:m,memory:clone(mem),rng:bot.random.state()};
    }catch{return null;}
  }
  // Expected per-battle weights, exactly integrated over hidden length up to 300.
  const weights=[];
  for(let t=0;t<300;t++) {
    let w=0;
    for(let N=Math.max(100,t+1);N<=700;N++)w+=(Math.exp(-(N-100)/20)-Math.exp(-(N-99)/20))/N;
    weights.push(w);
  }
  function rollout(group,h,oppHistory,id,forced=null) {
    let total=0;
    for(const p of group) {
      const own=h.slice(), other=oppHistory.slice();let state={...p},score=0;
      for(let n=h.length;n<200;n++) {
        const a=n===h.length&&forced?forced:policy(id,own,h.length);
        const out=move(state,other);
        if(!out){score=3;break;}
        score+=weights[n]*payoff(a,out.move);
        own.push({you:a,opponent:out.move});other.push({you:out.move,opponent:a});
        state={...state,memory:out.memory,rng:out.rng};
      }
      total+=p.weight*score;
    }
    return total;
  }
  function build(group,h,oppHistory) {
    const index=nodes.length;nodes.push(null); visits++;
    let best={score:-Infinity,id:0,forced:null};
    for(let id=0;id<=50;id++) {
      const score=rollout(group,h,oppHistory,id);
      if(score>best.score+1e-9)best={score,id,forced:null};
    }
    // One-step policy improvement also tests the other action before a continuation.
    for(const forced of ['C','D'])for(const id of [0,1,2,3,4,5,7,17,18,19,23,24]) {
      const score=rollout(group,h,oppHistory,id,forced);
      if(score>best.score+1e-9)best={score,id,forced};
    }
    const a=best.forced||policy(best.id,h,h.length);
    const deterministicMass=group.filter(p=>!p.stochastic).reduce((s,p)=>s+p.weight,0);
    if(h.length>=maxDepth || (!deterministicMass&&h.length>=8)) {
      nodes[index]=[-1,best.id,h.length,-1];
      return index;
    }
    const branches=[[],[]];
    for(const p of group){const out=move(p,oppHistory);if(out)branches[out.move==='C'?0:1].push({...p,memory:out.memory,rng:out.rng});}
    nodes[index]=[a==='C'?0:1,-1,-1,h.length];
    for(let b=0;b<2;b++)if(branches[b].length) {
      const o=b?'D':'C';
      nodes[index][b+1]=build(branches[b],h.concat({you:a,opponent:o}),oppHistory.concat({you:o,opponent:a}));
    }
    if(h.length<3)console.error(JSON.stringify({depth:h.length,nodes:nodes.length,move:a,policy:best.id,score:best.score/group.reduce((s,p)=>s+p.weight,0)}));
    return index;
  }
  build(cohort,[],[]);
  console.log(JSON.stringify({seed:4101,maxDepth,repetitions,nodes}));
}
