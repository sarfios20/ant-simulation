// Verificacion headless (sin DOM, mismo core.js que el navegador). Mundo abierto con
// muro: mide si el rastro toFood se concentra en el rodeo RAPIDO (abajo) frente al
// LENTO (arriba, barro), a lo largo del tiempo, y si arranca sin sesgo (emergencia).
const { Sim } = require('./core.js');

// masa de toFood en cada rodeo, en la franja a la altura del muro.
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
console.log('fase  entregas  rodeo_arriba(lento)  rodeo_abajo(rapido)  cuotaRapida');
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
console.log(`\nEntregas totales: ${Sim.deliveries}`);
console.log(`Pico de toFood: ${maxTrail.toFixed(1)}`);
console.log(`Media ultimas 3 fases  arriba(lento)=${top.toFixed(0)}  abajo(rapido)=${bottom.toFixed(0)}  cuotaRapida=${share.toFixed(0)}%`);

const forms = maxTrail > 5 && Sim.deliveries > 300;
const prefersFast = bottom > top * 1.8;
console.log(`\n${forms ? 'OK' : 'FALLO'}: ${forms ? 'se forma rastro y entregan comida' : 'no se forma rastro util'}`);
console.log(`${prefersFast ? 'OK' : 'AVISO'}: ${prefersFast ? 'el rastro converge a la ruta rapida' : 'el rastro no domina la ruta rapida'}`);
