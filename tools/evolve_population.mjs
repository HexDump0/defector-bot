// Refine the complete policy, scoring consequences of each mutation by cross-play.
// Outputs the best tree as JSON; never changes the public opponent corpus.
import fs from 'node:fs';
import {evaluate,random,battle} from './research.mjs';
const original=fs.readFileSync(process.argv[2],'utf8');
const table=JSON.parse(original.match(/const TREE = (.*);/)[1]);
const code=original.replace(/const TREE = .*;/,'').replace('export default function populationBot','const populationBot = function populationBot').replace('const node=TREE[k];\n  if(node[0]', 'const node=TREE[k]; HITS[k]=(HITS[k]||0)+1;\n  if(node[0]');
const factory=new Function('TREE','Math','HITS',code+'\n;return populationBot;');
let hits=[];
const make=seed=>{const math=Object.create(Math);math.random=random(seed);return factory(table,math,hits);};
const rng=random(7223),iterations=+(process.argv[3]||1500),reps=+(process.argv[4]||4),trainSeed=+(process.argv[5]||74123);
function measure(){hits=[];const e=evaluate(make,reps,trainSeed,false);const self=battle(make(1),make(2),120).scores[0];return {mean:e.mean,self,objective:e.mean+0.03*Math.min(self,1.98)};}
let best=measure();console.error(JSON.stringify({iteration:-1,...best}));let accepted=0;
for(let step=0;step<iterations;step++){
  const eligible=hits.map((h,i)=>h?i:-1).filter(i=>i>=0);
  const index=eligible[Math.floor(rng()*eligible.length)],previous=table[index].slice();
  const n=previous[0]===-1?previous[2]:previous[3];
  const r=rng();
  if(previous[0]===-1||r<0.35)table[index]=[-1,Math.floor(rng()*51),n,-1];
  else if(r<0.8)table[index][0]=1-table[index][0];
  else {const slot=rng()<.5?1:2;table[index][slot]=previous[slot===1?2:1];}
  const priorHits=hits;
  const trial=measure();
  if(trial.objective>best.objective+0.000001){best=trial;accepted++;console.error(JSON.stringify({iteration:step,index,accepted,...best}));}
  else {table[index]=previous;hits=priorHits;}
}
console.log(JSON.stringify({seed:trainSeed,iterations,repetitions:reps,nodes:table,training:best}));
