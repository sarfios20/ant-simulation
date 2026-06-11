// ============================================================================
//  Capa de presentacion: render + interfaz. Toda la simulacion vive en core.js
//  (objeto global `Sim`). Aqui solo dibujamos el estado y atendemos controles.
// ============================================================================

const canvas = document.getElementById('canvas');
canvas.width = CONFIG.W;
canvas.height = CONFIG.H;
const ctx = canvas.getContext('2d');

// buffer offscreen a resolucion de rejilla (se escala al canvas)
let off, offctx, offimg, offdata;
function allocOffscreen() {
  off = document.createElement('canvas');
  off.width = Sim.cols; off.height = Sim.rows;
  offctx = off.getContext('2d');
  offimg = offctx.createImageData(Sim.cols, Sim.rows);
  offdata = offimg.data;
}

// estado de la UI
let paused = false;
let speed = 1;
let tool = 'wall';
let brush = 4;
let drawing = false;

// ---------------------------------------------------------------------------
//  render
// ---------------------------------------------------------------------------
function render() {
  const N = Sim.N, t = Sim.terrain, toFood = Sim.toFood, toHome = Sim.toHome, food = Sim.food;
  for (let i = 0; i < N; i++) {
    const p = i * 4;
    let r = 17, g = 19, b = 27;
    const tt = t[i];
    if (tt === Sim.WALL) { r = 64; g = 66; b = 78; }
    else {
      if (tt === Sim.SLOW) { r += 26; g += 17; b += 5; }        // tinte calido del barro
      let f = toFood[i] / 15; if (f > 1) f = 1;                  // rastro a comida (verde)
      let h = toHome[i] / 15; if (h > 1) h = 1;                  // rastro a casa (azul)
      r += f * 40 + h * 20; g += f * 210 + h * 90; b += f * 40 + h * 225;
      if (food[i] > 0) { r = 70; g = 235; b = 95; }              // comida
    }
    offdata[p] = r > 255 ? 255 : r;
    offdata[p + 1] = g > 255 ? 255 : g;
    offdata[p + 2] = b > 255 ? 255 : b;
    offdata[p + 3] = 255;
  }
  offctx.putImageData(offimg, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, CONFIG.W, CONFIG.H);

  // nido
  ctx.beginPath();
  ctx.arc(Sim.nest.x, Sim.nest.y, CONFIG.NEST_R, 0, Math.PI * 2);
  ctx.fillStyle = '#6d4c33'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#2c1d12'; ctx.stroke();

  // hormigas
  for (const a of Sim.ants) {
    ctx.fillStyle = a.hasFood ? '#ffb347' : '#e9ecf5';
    ctx.fillRect(a.x - 1.5, a.y - 1.5, 3, 3);
  }
}

// ---------------------------------------------------------------------------
//  bucle + HUD
// ---------------------------------------------------------------------------
const elDeliveries = document.getElementById('m-deliveries');
const elTrip = document.getElementById('m-trip');
const elAnts = document.getElementById('m-ants');
let hudClock = 0;

function updateHud() {
  elDeliveries.textContent = Sim.deliveries;
  elAnts.textContent = Sim.ants.length;
  const avg = Sim.avgTrip();
  elTrip.textContent = isNaN(avg) ? '—' : Math.round(avg) + ' pasos';
}

function loop() {
  if (!paused) for (let i = 0; i < speed; i++) Sim.step();
  render();
  if (++hudClock % 12 === 0) updateHud();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
//  interaccion con el lienzo (pincel)
// ---------------------------------------------------------------------------
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CONFIG.W / rect.width),
    y: (e.clientY - rect.top) * (CONFIG.H / rect.height),
  };
}

function paint(pos) {
  if (tool === 'food') { Sim.addFoodBlob(pos.x, pos.y, brush * CONFIG.CELL, 100000); return; }
  const cc = Sim.colOf(pos.x), cr = Sim.rowOf(pos.y);
  for (let dr = -brush; dr <= brush; dr++)
    for (let dc = -brush; dc <= brush; dc++) {
      if (dc * dc + dr * dr > brush * brush) continue;
      const c = cc + dc, r = cr + dr;
      if (!Sim.inBounds(c, r)) continue;
      const i = Sim.idx(c, r);
      if (tool === 'wall') { Sim.terrain[i] = Sim.WALL; Sim.toFood[i] = 0; }
      else if (tool === 'slow') Sim.terrain[i] = Sim.SLOW;
      else if (tool === 'erase') { Sim.terrain[i] = Sim.FREE; Sim.food[i] = 0; }
    }
}

canvas.addEventListener('mousedown', e => { drawing = true; paint(canvasPos(e)); });
canvas.addEventListener('mousemove', e => { if (drawing) paint(canvasPos(e)); });
window.addEventListener('mouseup', () => { drawing = false; });

// ---------------------------------------------------------------------------
//  controles
// ---------------------------------------------------------------------------
document.querySelectorAll('.tool').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tool = btn.dataset.tool;
  });
});

document.getElementById('brush').addEventListener('input', e => brush = +e.target.value);

document.getElementById('btn-pause').addEventListener('click', e => {
  paused = !paused;
  e.target.textContent = paused ? 'Reanudar' : 'Pausa';
});

document.getElementById('btn-speed').addEventListener('click', e => {
  const s = [1, 2, 4, 8];
  speed = s[(s.indexOf(speed) + 1) % s.length];
  e.target.textContent = speed + '×';
});

document.getElementById('btn-reset').addEventListener('click', () => {
  Sim.resetScene();
  allocOffscreen();
  paused = false;
  document.getElementById('btn-pause').textContent = 'Pausa';
});

document.getElementById('btn-clear-walls').addEventListener('click', () => {
  for (let i = 0; i < Sim.N; i++) if (Sim.terrain[i] !== Sim.FREE) Sim.terrain[i] = Sim.FREE;
});

document.getElementById('btn-clear-trails').addEventListener('click', () => { Sim.toFood.fill(0); });

document.getElementById('p-ants').addEventListener('input', e => {
  const n = +e.target.value;
  document.getElementById('v-ants').textContent = n;
  Sim.setAntCount(n);
});

document.getElementById('p-evap').addEventListener('input', e => {
  CONFIG.EVAP = +e.target.value / 1000;
  document.getElementById('v-evap').textContent = CONFIG.EVAP.toFixed(3);
});

document.getElementById('p-diff').addEventListener('input', e => {
  CONFIG.DIFFUSE = +e.target.value / 100;
  document.getElementById('v-diff').textContent = CONFIG.DIFFUSE.toFixed(2);
});

// arranque
Sim.resetScene();
allocOffscreen();
loop();
