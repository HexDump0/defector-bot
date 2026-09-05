// Fast offline screening only. Final comparisons use the Rust lab and QuickJS.
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';

export const snapshotPath = 'data/scraped_bots_2026-09-05_0905IST/bots.json';
export const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
export const population = snapshot.bots.filter(b => b.active === 'active' || b.active === true);
export const clone = value => value == null ? null : JSON.parse(JSON.stringify(value));
export function random(seed) {
  let s = seed >>> 0;
  const next = () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  next.state = () => s;
  next.restore = value => { s = value; };
  return next;
}
export function compile(source) {
  const js = stripTypeScriptTypes(source);
  if (/\bimport\s/.test(js)) throw new Error('Runtime imports unsupported');
  const factory = new Function('Math', js.replace(/export\s+default\s/, 'const __defaultBot = ') + '\n;return __defaultBot;');
  return seed => {
    const math = Object.create(Math);
    math.random = random(seed);
    const bot = factory(math);
    bot.random = math.random;
    return bot;
  };
}
export const compiled = population.map(b => compile(b.source));
export function payoff(a, b) { return a === 'D' ? b === 'C' ? 3 : 1 : b === 'C' ? 2 : 0; }
export function call(bot, history, memory) {
  try {
    const out = bot({history, memory});
    if (!Array.isArray(out) || out.length !== 2 || !['C','D'].includes(out[0])) return null;
    return [out[0], clone(out[1])];
  } catch { return null; }
}
export function battle(a, b, rounds, serialize = false) {
  const histories = [[], []]; let memories = [null, null]; const scores = [0, 0];
  for (let n = 0; n < rounds; n++) {
    const x = call(a, serialize ? clone(histories[0]) : histories[0], memories[0]);
    const y = call(b, serialize ? clone(histories[1]) : histories[1], memories[1]);
    if (!x || !y) return {scores:[x ? 3 : 0, y ? 3 : 0], failures:[!x,!y], histories};
    memories = [x[1], y[1]];
    histories[0].push({you:x[0], opponent:y[0]});
    histories[1].push({you:y[0], opponent:x[0]});
    scores[0] += payoff(x[0],y[0]); scores[1] += payoff(y[0],x[0]);
  }
  return {scores:scores.map(x=>x/rounds), failures:[false,false], histories};
}
export function evaluate(factory, repetitions = 5, seed = 101, details = true) {
  const rows = []; const rng = random(seed); let failures=0;
  for (let i=0; i<population.length; i++) {
    let score=0, opponentScore=0; const samples=[];
    for(let j=0;j<repetitions;j++) {
      const n=Math.floor(100-20*Math.log(1-rng()));
      const s=(seed+i*100003+j*1009)>>>0;
      const r=battle(factory(s), compiled[i](s^0xABCD1234), n);
      score+=r.scores[0]; opponentScore+=r.scores[1]; failures+=+r.failures[0];
      if(details)samples.push(r.scores[0]);
    }
    rows.push({name:population[i].name,id:population[i].id,score:score/repetitions,opponentScore:opponentScore/repetitions,samples});
  }
  return {mean:rows.reduce((s,r)=>s+r.score,0)/rows.length, failures, rows:details?rows:undefined};
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source=fs.readFileSync(process.argv[2],'utf8');
  console.log(JSON.stringify(evaluate(compile(source),+(process.argv[3]||10),+(process.argv[4]||101)),null,2));
}
