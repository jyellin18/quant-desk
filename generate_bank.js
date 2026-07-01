#!/usr/bin/env node
/*
 * generate_bank.js — produces bank.json for Quant Desk.
 *
 * Quant Desk works fully on its own; this just publishes a fresh, larger pool
 * of probability questions that the app merges in on load (App fetches ./bank.json).
 *
 * Every question's answer is COMPUTED here, never guessed, and each one is
 * re-checked before output. If any check fails the script exits non-zero and
 * writes nothing, so a broken run can never push wrong answers to your phone.
 *
 *   node generate_bank.js > bank.json
 *
 * Wire it to a weekly scheduled task that runs this, commits bank.json, and pushes.
 */
const ri = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pick = a => a[Math.floor(Math.random()*a.length)];
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const t=a%b;a=b;b=t;}return a||1;}
function fr(n,d){if(d<0){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;return d===1?String(n):n+"/"+d;}
function dec(x){return Number.isInteger(x)?String(x):String(Math.round(x*1000)/1000);}
function nCk(n,k){if(k<0||k>n)return 0;let r=1;for(let i=0;i<k;i++){r=r*(n-i)/(i+1);}return Math.round(r);}
function shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function parseOpt(s){s=String(s).replace(/−/g,"-").replace(/\$/g,"").replace(/\+/g,"").trim();if(s.includes("/")){const[a,b]=s.split("/").map(Number);return a/b;}return Number(s);}

function buildMC(q, correct, cands, ex){
  const pad=[{l:"1/2",v:.5},{l:"1/3",v:1/3},{l:"1/4",v:.25},{l:"2/3",v:2/3},{l:"1/6",v:1/6},{l:"1/5",v:.2}];
  const opts=[correct];
  for(const c of cands.concat(pad)){ if(opts.length>=4) break; if(opts.some(o=>o.l===c.l||Math.abs(o.v-c.v)<1e-9)) continue; opts.push(c); }
  const sh=shuffle(opts);
  const correct_idx=sh.findIndex(o=>o.l===correct.l&&Math.abs(o.v-correct.v)<1e-9);
  return {q, opts:sh.map(o=>o.l), correct:correct_idx, ex, _cv:correct.v};
}
function genProb(){
  const t=pick(["sum","heads","atleast","evdie","firstface","adjacent","exactlyone"]);
  if(t==="sum"){const N=ri(2,12),w=6-Math.abs(7-N);
    return buildMC(`Roll two fair dice. P(the sum equals ${N})?`,{l:fr(w,36),v:w/36},
      [{l:fr(Math.max(1,w-1),36),v:Math.max(1,w-1)/36},{l:fr(Math.min(6,w+1),36),v:Math.min(6,w+1)/36},{l:fr(N,36),v:N/36},{l:"1/6",v:1/6}],
      `Of 36 equally likely ordered rolls, ${w} sum to ${N}, so ${fr(w,36)}.`);}
  if(t==="heads"){const n=ri(3,7),k=ri(0,n),c=nCk(n,k),tot=2**n;const cs=[];
    if(k+1<=n)cs.push({l:fr(nCk(n,k+1),tot),v:nCk(n,k+1)/tot}); if(k-1>=0)cs.push({l:fr(nCk(n,k-1),tot),v:nCk(n,k-1)/tot});
    cs.push({l:fr(k,n),v:k/n},{l:"1/2",v:.5});
    return buildMC(`Flip a fair coin ${n} times. P(exactly ${k} heads)?`,{l:fr(c,tot),v:c/tot},cs,`C(${n},${k}) / 2^${n} = ${c}/${tot} = ${fr(c,tot)}.`);}
  if(t==="atleast"){const m=ri(2,4),den=6**m,num=den-5**m;
    return buildMC(`Roll a fair die ${m} times. P(at least one six)?`,{l:fr(num,den),v:num/den},
      [{l:fr(5**m,den),v:5**m/den},{l:fr(m,6),v:m/6},{l:"1/6",v:1/6},{l:fr(1,den),v:1/den}],
      `1 − (5/6)^${m} = ${fr(num,den)}. The complement (no six) is ${fr(5**m,den)}.`);}
  if(t==="evdie"){const s=pick([4,6,8,10,12,20]),ev=(s+1)/2;
    return buildMC(`A fair ${s}-sided die has faces 1 through ${s}. Expected value of one roll?`,{l:dec(ev),v:ev},
      [{l:dec(s/2),v:s/2},{l:dec((s+2)/2),v:(s+2)/2},{l:dec(s),v:s},{l:dec(s/2+1),v:s/2+1}],
      `(1 + 2 + … + ${s}) / ${s} = (${s}+1)/2 = ${dec(ev)}.`);}
  if(t==="firstface"){const s=pick([4,6,8,10,12]);
    return buildMC(`You roll a fair ${s}-sided die until a chosen face appears. Expected number of rolls?`,{l:dec(s),v:s},
      [{l:dec(s-1),v:s-1},{l:dec(s+1),v:s+1},{l:dec(Math.round(s/2)),v:Math.round(s/2)},{l:dec(2*s),v:2*s}],
      `Geometric with success probability 1/${s}, so the expected wait is ${s}.`);}
  if(t==="exactlyone"){const m=ri(2,4),den=6**m,num=m*5**(m-1);
    return buildMC(`Roll a fair die ${m} times. P(exactly one six)?`,{l:fr(num,den),v:num/den},
      [{l:fr(6**m-5**m,den),v:(6**m-5**m)/den},{l:fr(5**m,den),v:5**m/den},{l:fr(m,6),v:m/6},{l:"1/6",v:1/6}],
      `Choose which of the ${m} rolls is the six and let the rest miss: ${m}·5^${m-1} / 6^${m} = ${fr(num,den)}.`);}
  const n=ri(4,9);
  return buildMC(`${n} people sit in a row in random order. P(two particular people are adjacent)?`,{l:fr(2,n),v:2/n},
    [{l:fr(1,n),v:1/n},{l:fr(2,n-1),v:2/(n-1)},{l:fr(1,n-1),v:1/(n-1)},{l:"1/2",v:.5}],
    `Glue the pair into one block: 2 · ${n-1}! / ${n}! = 2/${n} = ${fr(2,n)}.`);
}

// Build a deduped batch, self-check every question.
const TARGET = 40;
const out=[]; const seen=new Set(); let guard=0;
while(out.length<TARGET && guard++<5000){
  const x=genProb();
  if(seen.has(x.q)) continue;
  const vals=x.opts.map(parseOpt);
  if(x.opts.length!==4) continue;
  if(new Set(x.opts).size!==4) continue;
  let dup=false; for(let a=0;a<4;a++)for(let b=a+1;b<4;b++) if(Math.abs(vals[a]-vals[b])<1e-9) dup=true;
  if(dup) continue;
  if(x.correct<0||x.correct>3){ console.error("FATAL bad index"); process.exit(1); }
  if(Math.abs(parseOpt(x.opts[x.correct])-x._cv)>1e-6){ console.error("FATAL answer mismatch:",x.q); process.exit(1); }
  seen.add(x.q);
  out.push({q:x.q, opts:x.opts, correct:x.correct, ex:x.ex});
}
if(out.length<TARGET){ console.error("FATAL could not build full batch"); process.exit(1); }

const bank = { generatedAt: new Date().toISOString(), probability: out, monthly: [] };
process.stdout.write(JSON.stringify(bank, null, 2) + "\n");
