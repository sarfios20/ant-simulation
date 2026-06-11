// ============================================================================
//  Nucleo de la simulacion (sin DOM). Se usa igual en el navegador (sim.js)
//  y en el test headless (headless-test.js), asi se valida el mismo codigo.
// ----------------------------------------------------------------------------
//  MUNDO ABIERTO con DOS FEROMONAS y gradiente auto-emergente. Cada hormiga es
//  "tonta": solo huele feromona en 3 antenas y va hacia donde mas/menos huele.
//  No hay mapa, ni vector interno, ni nada precalculado. Todo es feromona.
//
//  Dos rastros, simetricos:
//   - toHome ("a casa"): lo dejan las que SALEN del nido. El deposito DECAE con la
//     distancia recorrida desde el nido => es mas fuerte cerca del nido. Una hormiga
//     CARGADA lo sigue cuesta arriba y eso la lleva a casa.
//   - toFood ("a comida"): lo dejan las que VUELVEN con comida. Decae con la distancia
//     desde la comida => mas fuerte cerca de la comida. Una EXPLORADORA lo sigue cuesta
//     arriba y eso la lleva a la comida.
//
//  Una exploradora sin rastro de comida cerca baja su propio toHome (se aleja del nido
//  a explorar); en cuanto pilla el toFood, lo sube hasta la comida. Asi navega todo por
//  feromona, sin saber donde esta nada.
//
//  Emergencia de la ruta rapida: ambos rastros se EVAPORAN. La ruta rapida se recorre
//  mas veces por minuto, recibe mas feromona antes de evaporarse y se refuerza; la lenta
//  (barro) se desvanece. El gradiente y el deposito se escalan por la velocidad (cuentan
//  distancia, no pasos), asi el barro no engana al rastro solo por dar mas pasos.
// ============================================================================

const CONFIG = {
  W: 820, H: 600,
  CELL: 4,
  ANTS: 300,
  SPEED: 1.3,
  SENSOR_DIST: 24,     // alcance de las antenas (px): amplio, para poder atajar curvas
  SENSOR_ANGLE: 0.5,   // separacion de las antenas laterales (rad)
  TURN: 0.5,           // giro maximo al seguir el rastro (rad)
  WANDER: 0.16,        // ruido de rumbo (exploracion)
  DEPOSIT: 3.0,        // feromona base por paso (se multiplica por la "carga" de la hormiga)
  CHARGE_LIFE: 800,    // pasos en los que se gasta la carga: la hormiga arranca con carga 1
                       // al salir del nido / coger comida y suelta menos cada paso hasta 0.
                       // Eso crea el gradiente (fuerte cerca del origen) al estilo Lague.
  CELL_CAP: 80,
  // Las dos feromonas evaporan a ritmos OPUESTOS, a proposito:
  EVAP_FOOD: 0.997,     // rastro a comida: rapido => la ruta lenta se desvanece y solo
                       //   sobrevive la que se repinta mucho (la rapida) => OPTIMIZA.
  EVAP_HOME: 0.9995,   // rastro a casa: lento => persiste y las cargadas vuelven SIEMPRE
                       //   => ESTABLE (no colapsa aunque haya pocas hormigas).
  DIFFUSE: 0.12,
  FOOD_DETECT: 110,     // si la exploradora ve la comida a <FOOD_DETECT (sin muro), va
                       // DIRECTA, por encima del rastro. Menor que NEST_DETECT a proposito:
                       // la comida es la META cuya ruta optimizamos, asi que las hormigas
                       // deben seguir necesitando el rastro en el trayecto largo. Si fuera
                       // grande, llegarian a la comida sin rastro y la ruta no emergeria.
  SLOW_MULT: 0.30,     // factor de velocidad en terreno lento (barro)
  // Interruptor de las dos approaches a comparar:
  //  - false/false (mia): gradiente por desplazamiento + seguir el rastro mas FUERTE.
  //  - true/true (tuya):  deposito CONSTANTE + seguir el rastro mas DEBIL (la feromona
  //    fresca es la mas fuerte, asi que ir a lo debil = no perseguir a quien acaba de pasar).
  FOLLOW_WEAK: false,
  CONST_DEPOSIT: false,
  REPEL_HOME: 0.5,     // las exploradoras se repelen un poco del rastro "a casa": las
                       // empuja a explorar hacia afuera (el toHome es fuerte cerca del nido)
  NEST_R: 18,
  NEST_DETECT: 110,    // si la cargada esta a <NEST_DETECT del nido y lo ve (sin muro
                       // de por medio), va DIRECTA, por encima de las feromonas. Asi no
                       // se queda dando vueltas cerca de casa siguiendo el rastro.
  SPAWN_EVERY: 10,     // pasos entre cada nueva hormiga (las suelta poco a poco, no en
                       // oleada: flujo continuo => rastro estable, sin sincronizacion)
};

const FREE = 0, WALL = 1, SLOW = 2;

const Sim = {
  CONFIG, FREE, WALL, SLOW,
  cols: 0, rows: 0, N: 0,
  toFood: null, toHome: null, scratch: null, terrain: null, food: null,
  ants: [],
  nest: { x: 160, y: 300 },
  deliveries: 0,
  tripSamples: [],
  searchSamples: [],

  idx(c, r) { return r * this.cols + c; },
  colOf(x) { return (x / CONFIG.CELL) | 0; },
  rowOf(y) { return (y / CONFIG.CELL) | 0; },
  inBounds(c, r) { return c >= 0 && c < this.cols && r >= 0 && r < this.rows; },

  wallAtPx(x, y) {
    const c = this.colOf(x), r = this.rowOf(y);
    if (!this.inBounds(c, r)) return true;
    return this.terrain[this.idx(c, r)] === WALL;
  },

  // suma de feromona en 3x3 alrededor de un punto. Muros = 0 (neutro).
  sample(field, x, y) {
    const cc = this.colOf(x), cr = this.rowOf(y);
    let sum = 0;
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const c = cc + dc, r = cr + dr;
        if (!this.inBounds(c, r)) continue;
        const i = this.idx(c, r);
        if (this.terrain[i] !== WALL) sum += field[i];
      }
    return sum;
  },

  // celda de comida mas cercana dentro de FOOD_DETECT (px), o null. Devuelve el punto.
  findFood(x, y) {
    const rc = Math.ceil(CONFIG.FOOD_DETECT / CONFIG.CELL), cc = this.colOf(x), cr = this.rowOf(y);
    const r2 = CONFIG.FOOD_DETECT * CONFIG.FOOD_DETECT;
    let bestD2 = Infinity, bx = 0, by = 0;
    for (let dr = -rc; dr <= rc; dr++)
      for (let dc = -rc; dc <= rc; dc++) {
        const c = cc + dc, r = cr + dr;
        if (!this.inBounds(c, r)) continue;
        if (this.food[this.idx(c, r)] <= 0) continue;
        const fx = (c + 0.5) * CONFIG.CELL, fy = (r + 0.5) * CONFIG.CELL;
        const d2 = (fx - x) * (fx - x) + (fy - y) * (fy - y);
        if (d2 < r2 && d2 < bestD2) { bestD2 = d2; bx = fx; by = fy; }
      }
    return bestD2 < Infinity ? { x: bx, y: by } : null;
  },

  steerToward(h, t, amt) {
    let d = t - h;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return h + d * amt;
  },

  // hay un muro en el segmento de la hormiga hasta el punto? Si lo hay, por ahi no se
  // huele nada (el muro tapa el olfato). Permite radio amplio sin "atajar" por el muro.
  wallOnSegment(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.ceil(Math.hypot(dx, dy) / CONFIG.CELL);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      if (this.wallAtPx(x0 + dx * t, y0 + dy * t)) return true;
    }
    return false;
  },

  // Gira el rumbo hacia donde mas huele UNA feromona (la de su meta), con 3 antenas de
  // radio amplio. La antena cuyo segmento cruza un muro no detecta nada (-Infinity).
  // Si no huele nada (rastro = 0 en las tres) sigue recto y el ruido la hace explorar.
  steerToField(a, field) {
    const d = CONFIG.SENSOR_DIST, ang = CONFIG.SENSOR_ANGLE, weak = CONFIG.FOLLOW_WEAK;
    const hs = [a.heading - ang, a.heading, a.heading + ang];
    const v = [0, 0, 0], blk = [false, false, false];
    for (let k = 0; k < 3; k++) {
      const px = a.x + Math.cos(hs[k]) * d, py = a.y + Math.sin(hs[k]) * d;
      if (this.wallOnSegment(a.x, a.y, px, py)) blk[k] = true;
      else v[k] = this.sample(field, px, py);
    }
    if (blk[0] && blk[1] && blk[2]) { a.heading += Math.PI * 0.5 + (Math.random() - 0.5); return false; }
    // muros = peor opcion (nunca elegirlos): +Inf si buscamos el minimo, -Inf si el maximo
    const W = weak ? Infinity : -Infinity;
    const L = blk[0] ? W : v[0], C = blk[1] ? W : v[1], R = blk[2] ? W : v[2];
    if (weak) {            // seguir el mas DEBIL (centro preferido en empate)
      if (C <= L && C <= R) { /* recto */ }
      else if (L < R) a.heading -= CONFIG.TURN * Math.random();
      else a.heading += CONFIG.TURN * Math.random();
    } else {               // seguir el mas FUERTE
      if (C >= L && C >= R) { /* recto */ }
      else if (L > R) a.heading -= CONFIG.TURN * Math.random();
      else a.heading += CONFIG.TURN * Math.random();
    }
    return Math.max(v[0], v[1], v[2]) > 0.5;   // true si hay un rastro de verdad alrededor
  },

  // repulsion suave: gira el rumbo hacia el lado donde MENOS huele el campo (away).
  // Para que las exploradoras se aparten del rastro "a casa" y exploren hacia afuera.
  repelFrom(a, field, w) {
    if (w <= 0) return;
    const d = CONFIG.SENSOR_DIST, ang = CONFIG.SENSOR_ANGLE;
    const hl = a.heading - ang, hr = a.heading + ang;
    const pl = this.wallOnSegment(a.x, a.y, a.x + Math.cos(hl) * d, a.y + Math.sin(hl) * d) ? 0 : this.sample(field, a.x + Math.cos(hl) * d, a.y + Math.sin(hl) * d);
    const pr = this.wallOnSegment(a.x, a.y, a.x + Math.cos(hr) * d, a.y + Math.sin(hr) * d) ? 0 : this.sample(field, a.x + Math.cos(hr) * d, a.y + Math.sin(hr) * d);
    if (pl > pr) a.heading += w * CONFIG.TURN * Math.random();
    else if (pr > pl) a.heading -= w * CONFIG.TURN * Math.random();
  },

  alloc() {
    this.cols = Math.ceil(CONFIG.W / CONFIG.CELL);
    this.rows = Math.ceil(CONFIG.H / CONFIG.CELL);
    this.N = this.cols * this.rows;
    this.toFood = new Float32Array(this.N);
    this.toHome = new Float32Array(this.N);
    this.scratch = new Float32Array(this.N);
    this.terrain = new Uint8Array(this.N);
    this.food = new Float32Array(this.N);
  },

  paintRect(x0, y0, x1, y1, type) {
    for (let r = this.rowOf(y0); r <= this.rowOf(y1); r++)
      for (let c = this.colOf(x0); c <= this.colOf(x1); c++)
        if (this.inBounds(c, r)) this.terrain[this.idx(c, r)] = type;
  },

  addFoodBlob(cx, cy, radiusPx, amount) {
    const rc = Math.ceil(radiusPx / CONFIG.CELL), cc = this.colOf(cx), cr = this.rowOf(cy);
    for (let dr = -rc; dr <= rc; dr++)
      for (let dc = -rc; dc <= rc; dc++) {
        if (dc * dc + dr * dr > rc * rc) continue;
        const c = cc + dc, r = cr + dr;
        if (this.inBounds(c, r)) { this.food[this.idx(c, r)] += amount; this.terrain[this.idx(c, r)] = FREE; }
      }
  },

  newAnt() {
    // charge: "carga" de feromona estilo Lague. Arranca en 1 al salir del nido / coger
    //   comida y se gasta cada paso (deposita menos al alejarse) => gradiente fuerte
    //   cerca del origen. round: metrica.
    return { x: this.nest.x, y: this.nest.y, heading: Math.random() * Math.PI * 2, hasFood: false, charge: 1, round: 0 };
  },

  // No se crean todas de golpe: se fija un objetivo y step() las va soltando de a una
  // cada SPAWN_EVERY pasos (flujo continuo, sin oleada sincronizada).
  spawnAnts(n) { this.ants = []; this.targetAnts = n; this.spawnAccum = 0; },

  setAntCount(n) {
    this.targetAnts = n;
    if (n < this.ants.length) this.ants.length = n;   // bajar el numero es inmediato
  },

  resetScene() {
    this.alloc();
    this.deliveries = 0;
    this.tripSamples = [];
    this.searchSamples = [];
    // Muro entre nido y comida: hay que rodearlo por arriba o por abajo.
    this.paintRect(380, 160, 440, 440, WALL);
    // Terreno lento cubriendo el rodeo de ARRIBA. Ambos rodeos miden casi lo mismo,
    // pero el de abajo es mas RAPIDO => la colonia converge a el (optimiza por velocidad).
    this.paintRect(200, 0, 620, 158, SLOW);
    // Comida a la derecha; nido a la izquierda.
    this.addFoodBlob(690, 300, 12, 100000);
    this.spawnAnts(CONFIG.ANTS);
  },

  updateAnt(a) {
    a.round++;

    let directed = false;   // va guiada (rastro o meta a la vista)? entonces apenas zigzaguea
    if (a.hasFood) {
      // CARGADA: si detecta el nido (cerca y sin muro de por medio), va DIRECTA, por
      // encima de las feromonas (evita loops cerca de casa). Si no, sigue el rastro a CASA.
      const dn = Math.hypot(a.x - this.nest.x, a.y - this.nest.y);
      if (dn < CONFIG.NEST_DETECT && !this.wallOnSegment(a.x, a.y, this.nest.x, this.nest.y)) {
        a.heading = this.steerToward(a.heading, Math.atan2(this.nest.y - a.y, this.nest.x - a.x), 0.7);
        directed = true;
      } else {
        directed = this.steerToField(a, this.toHome);
      }
    } else {
      // EXPLORANDO: si detecta la comida (cerca y sin muro), va DIRECTA. Si no, SIGUE el
      // rastro a COMIDA hacia la comida; solo si no huele rastro vaga al azar (explora).
      const food = this.findFood(a.x, a.y);
      if (food && !this.wallOnSegment(a.x, a.y, food.x, food.y)) {
        a.heading = this.steerToward(a.heading, Math.atan2(food.y - a.y, food.x - a.x), 0.7);
        directed = true;
      } else {
        directed = this.steerToField(a, this.toFood);
      }
      // repulsion suave del rastro a casa: explora hacia afuera, no se queda cerca del nido
      this.repelFrom(a, this.toHome, CONFIG.REPEL_HOME);
    }
    // ruido alto si va perdida (explora); reducido pero NO nulo si va guiada: sigue el
    // rastro pero con margen para salirse un poco y descubrir atajos => optimiza la ruta.
    a.heading += (Math.random() - 0.5) * CONFIG.WANDER * (directed ? 0.5 : 1);

    // movimiento (freno en barro)
    const here = this.idx(this.colOf(a.x), this.rowOf(a.y));
    const onSlow = this.inBounds(this.colOf(a.x), this.rowOf(a.y)) && this.terrain[here] === SLOW;
    const mult = onSlow ? CONFIG.SLOW_MULT : 1;
    const stepLen = CONFIG.SPEED * mult;
    let nx = a.x + Math.cos(a.heading) * stepLen;
    let ny = a.y + Math.sin(a.heading) * stepLen;
    if (nx < 1 || nx > CONFIG.W - 1) { a.heading = Math.PI - a.heading; nx = a.x; }
    if (ny < 1 || ny > CONFIG.H - 1) { a.heading = -a.heading; ny = a.y; }

    if (this.wallAtPx(nx, ny)) {
      a.heading += Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;   // rebote
    } else {
      a.x = nx; a.y = ny;
    }
    // la carga se gasta con cada paso (estilo Lague): deposita menos al alejarse
    if (a.charge > 0) a.charge = Math.max(0, a.charge - 1 / CONFIG.CHARGE_LIFE);

    // comida / nido
    const ci = this.idx(this.colOf(a.x), this.rowOf(a.y));
    if (!a.hasFood) {
      if (this.inBounds(this.colOf(a.x), this.rowOf(a.y)) && this.food[ci] > 0) {
        this.food[ci] -= 1; a.hasFood = true; a.heading += Math.PI;
        this.searchSamples.push(a.round);
        if (this.searchSamples.length > 200) this.searchSamples.shift();
        a.charge = 1;   // recarga: nuevo origen del gradiente (la comida)
      }
    } else if (Math.hypot(a.x - this.nest.x, a.y - this.nest.y) < CONFIG.NEST_R) {
      a.hasFood = false; this.deliveries++;
      this.tripSamples.push(a.round);
      if (this.tripSamples.length > 200) this.tripSamples.shift();
      a.heading += Math.PI; a.round = 0;
      a.charge = 1;   // recarga: nuevo origen del gradiente (el nido)
    }

    // DEPOSITO estilo Lague: el cargado deja toFood, el explorador toHome. La cantidad
    // es DEPOSIT * carga (decae con los pasos desde el origen) y se escala por velocidad
    // (mult), asi el barro no acumula de mas por dar mas pasos; su penalizacion es que
    // gasta la carga mas rapido => el extremo lejano de la ruta lenta queda poco marcado.
    if (this.inBounds(this.colOf(a.x), this.rowOf(a.y))) {
      const di = this.idx(this.colOf(a.x), this.rowOf(a.y));
      if (this.terrain[di] !== WALL) {
        const g = CONFIG.CONST_DEPOSIT ? 1 : a.charge;
        if (g > 0) {
          const field = a.hasFood ? this.toFood : this.toHome;
          field[di] = Math.min(CONFIG.CELL_CAP, field[di] + CONFIG.DEPOSIT * g * mult);
        }
      }
    }
  },

  processField(field, evap) {
    const diff = CONFIG.DIFFUSE, cols = this.cols, rows = this.rows, t = this.terrain, sc = this.scratch;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (t[i] === WALL) { field[i] = 0; sc[i] = 0; continue; }
        const v = field[i];
        const up = r > 0 && t[i - cols] !== WALL ? field[i - cols] : v;
        const down = r < rows - 1 && t[i + cols] !== WALL ? field[i + cols] : v;
        const left = c > 0 && t[i - 1] !== WALL ? field[i - 1] : v;
        const right = c < cols - 1 && t[i + 1] !== WALL ? field[i + 1] : v;
        const avg = (up + down + left + right) * 0.25;
        let nv = (v + diff * (avg - v)) * evap;
        if (nv < 0.02) nv = 0;
        sc[i] = nv;
      }
    }
    field.set(sc);
  },

  step() {
    // suelta hormigas poco a poco hasta el objetivo (una cada SPAWN_EVERY pasos)
    if (this.ants.length < this.targetAnts && ++this.spawnAccum >= CONFIG.SPAWN_EVERY) {
      this.spawnAccum = 0;
      this.ants.push(this.newAnt());
    }
    for (const a of this.ants) this.updateAnt(a);
    this.processField(this.toFood, CONFIG.EVAP_FOOD);
    this.processField(this.toHome, CONFIG.EVAP_HOME);
  },

  avgTrip() {
    if (!this.tripSamples.length) return NaN;
    let s = 0; for (const v of this.tripSamples) s += v;
    return s / this.tripSamples.length;
  },

  avgSearch() {
    if (!this.searchSamples.length) return NaN;
    let s = 0; for (const v of this.searchSamples) s += v;
    return s / this.searchSamples.length;
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { Sim, CONFIG, FREE, WALL, SLOW };
