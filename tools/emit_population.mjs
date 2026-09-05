import fs from 'node:fs';
import {policy} from './plan_population.mjs';

const plan=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const compact=[],indices=new Map();
function visit(old){if(old<0)return -1;if(indices.has(old))return indices.get(old);const i=compact.length;indices.set(old,i);const node=plan.nodes[old].slice();compact.push(node);if(node[0]!==-1){node[1]=visit(node[1]);node[2]=visit(node[2]);}return i;}
visit(0);
const raw=fs.readFileSync('bots/candidate_v4.ts','utf8');
const base=raw.slice(raw.indexOf('const WINDOW')).replace('export default function bot(state)', 'function baseline(state)');
console.log('// Apex population v1. Training snapshot: 2026-09-05_0905IST.\n// Offline-generated behavioral decision tree; no opponent identities or runtime models.\n// Payoffs C/C=2, D/C=3, D/D=1, C/D=0. Hidden match length, minimum 100.\n// Training uses whole-population score plus a self-play recovery objective.\n'+base+'\n'+policy.toString()+'\nconst TREE = '+JSON.stringify(compact)+';\n'+`
export default function populationBot({history}) {
  const h=Array.isArray(history)?history:[];
  // A partner that changes to persistent defection must not farm a cooperative leaf.
  if(h.length>=8 && h.slice(-5).every(r=>r.opponent==='D'))return ['D',null];
  let k=0;
  for(let i=0;i<h.length;i++) {
    const node=TREE[k];
    if(node[0]===-1)break;
    if(h[i].you !== (node[0]?'D':'C'))return [policy(0,h,0),null];
    k=node[h[i].opponent==='D'?2:1];
    if(k<0)return [policy(0,h,0),null];
  }
  const node=TREE[k];
  if(node[0]===-1)return [policy(node[1],h,node[2]),null];
  return [node[0]?'D':'C',null];
}`);
