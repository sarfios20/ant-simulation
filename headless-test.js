// Headless check (no DOM, same core.js as the browser). Open world with a wall:
// measures whether the toFood trail concentrates on the FAST detour (bottom)
// versus the SLOW one (top, mud) over time, and whether it starts unbiased (emergence).
const { Sim } = require('./core.js');

// mass of toFood on each detour, in the band at the wall's height.
function routeMass(half) {
  const c0 = Sim.colOf(300), c1 = Sim.colOf(520);
  const r0 = half === 'top' ? Sim.rowOf(35) : Sim.rowOf(450);
  const r1 = half === 'top' ? Sim.rowOf(155) : Sim.rowOf(565);
  let m = 0;
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++)
      m += Sim.toFood[Sim.idx(c, r)];
  return m;
}

Sim.resetScene();
console.log('phase  deliveries  top_detour(slow)  bottom_detour(fast)  fastShare');
let prev = 0;
const finals = [];
for (let phase = 0; phase < 12; phase++) {
  for (let i = 0; i < 4000; i++) Sim.step();
  const top = routeMass('top'), bottom = routeMass('bottom');
  finals.push({ top, bottom });
  const share = bottom / (top + bottom + 1e-9) * 100;
  console.log(`  ${String(phase).padStart(2)}    ${String(Sim.deliveries - prev).padStart(4)}        ${top.toFixed(0).padStart(6)}              ${bottom.toFixed(0).padStart(6)}          ${share.toFixed(0)}%`);
  prev = Sim.deliveries;
}

const last3 = finals.slice(-3);
const top = last3.reduce((s, f) => s + f.top, 0) / 3;
const bottom = last3.reduce((s, f) => s + f.bottom, 0) / 3;
const maxTrail = Math.max(...Sim.toFood);
const share = bottom / (top + bottom + 1e-9) * 100;
console.log(`\nTotal deliveries: ${Sim.deliveries}`);
console.log(`Peak toFood: ${maxTrail.toFixed(1)}`);
console.log(`Avg. last 3 phases  top(slow)=${top.toFixed(0)}  bottom(fast)=${bottom.toFixed(0)}  fastShare=${share.toFixed(0)}%`);

const forms = maxTrail > 5 && Sim.deliveries > 300;
const prefersFast = bottom > top * 1.8;
console.log(`\n${forms ? 'OK' : 'FAIL'}: ${forms ? 'a trail forms and food gets delivered' : 'no useful trail forms'}`);
console.log(`${prefersFast ? 'OK' : 'WARN'}: ${prefersFast ? 'the trail converges on the fast route' : 'the trail does not dominate the fast route'}`);
