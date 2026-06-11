// ============================================================================
//  Simulation core (no DOM). Used as-is in the browser (sim.js) and in the
//  headless test (headless-test.js), so the same code gets validated.
// ----------------------------------------------------------------------------
//  OPEN WORLD with TWO PHEROMONES and a self-emergent gradient. Each ant is
//  "dumb": it only smells pheromone with 3 antennae and heads where it smells
//  the most/least. No map, no internal vector, nothing precomputed. Everything
//  is pheromone.
//
//  Two trails, symmetric:
//   - toHome ("to home"): laid by ants LEAVING the nest. The deposit DECAYS with
//     the distance traveled from the nest => it's stronger near the nest. A
//     CARRYING ant follows it uphill and that takes it home.
//   - toFood ("to food"): laid by ants RETURNING with food. Decays with the
//     distance from the food => stronger near the food. An EXPLORER follows it
//     uphill and that takes it to the food.
//
//  An explorer with no food trail nearby walks down its own toHome (moves away
//  from the nest to explore); as soon as it picks up toFood, it climbs it to the
//  food. So everything navigates by pheromone, without knowing where anything is.
//
//  Emergence of the fast route: both trails EVAPORATE. The fast route gets
//  traveled more times per minute, receives more pheromone before evaporating
//  and gets reinforced; the slow one (mud) fades. The gradient and the deposit
//  are scaled by speed (they count distance, not steps), so mud can't fool the
//  trail just by taking more steps.
// ============================================================================

const CONFIG = {
  W: 820, H: 600,
  CELL: 4,
  ANTS: 300,
  SPEED: 1.3,
  SENSOR_DIST: 24,     // antenna range (px): wide, so curves can be cut
  SENSOR_ANGLE: 0.5,   // separation of the side antennae (rad)
  TURN: 0.5,           // max turn while following the trail (rad)
  WANDER: 0.16,        // heading noise (exploration)
  DEPOSIT: 3.0,        // base pheromone per step (multiplied by the ant's "charge")
  CHARGE_LIFE: 800,    // steps over which the charge runs out: the ant starts with
                       // charge 1 when leaving the nest / picking up food and deposits
                       // less each step until 0. That creates the gradient (strong
                       // near the origin), Lague style.
  CELL_CAP: 80,
  // The two pheromones evaporate at OPPOSITE rates, on purpose:
  EVAP_FOOD: 0.997,     // to-food trail: fast => the slow route fades and only the
                       //   heavily repainted one (the fast one) survives => OPTIMIZES.
  EVAP_HOME: 0.9995,   // to-home trail: slow => persists and carriers ALWAYS get back
                       //   => STABLE (doesn't collapse even with few ants).
  DIFFUSE: 0.12,
  FOOD_DETECT: 110,     // if an explorer sees the food at <FOOD_DETECT (no wall), it
                       // goes STRAIGHT, overriding the trail. Smaller than NEST_DETECT
                       // on purpose: the food is the GOAL whose route we optimize, so
                       // ants must keep needing the trail on the long leg. If it were
                       // large, they'd reach the food without a trail and the route
                       // wouldn't emerge.
  SLOW_MULT: 0.30,     // speed factor on slow terrain (mud)
  // Switch between the two approaches to compare:
  //  - false/false (mine): displacement-based gradient + follow the STRONGEST trail.
  //  - true/true (yours):  CONSTANT deposit + follow the WEAKEST trail (fresh pheromone
  //    is the strongest, so going for the weak = not chasing whoever just passed by).
  FOLLOW_WEAK: false,
  CONST_DEPOSIT: false,
  REPEL_HOME: 0.5,     // explorers are slightly repelled by the "to home" trail: it
                       // pushes them to explore outward (toHome is strong near the nest)
  NEST_R: 18,
  NEST_DETECT: 110,    // if a carrier is at <NEST_DETECT from the nest and sees it (no
                       // wall in between), it goes STRAIGHT, overriding the pheromones.
                       // Keeps it from circling near home following the trail.
  SPAWN_EVERY: 10,     // steps between each new ant (released gradually, not in a
                       // wave: continuous flow => stable trail, no synchronization)
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

  // sum of pheromone in a 3x3 around a point. Walls = 0 (neutral).
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

  // nearest food cell within FOOD_DETECT (px), or null. Returns the point.
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

  // is there a wall on the segment from the ant to the point? If so, nothing can
  // be smelled that way (the wall blocks smell). Allows a wide radius without
  // "cutting through" the wall.
  wallOnSegment(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.ceil(Math.hypot(dx, dy) / CONFIG.CELL);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      if (this.wallAtPx(x0 + dx * t, y0 + dy * t)) return true;
    }
    return false;
  },

  // Turns the heading toward where ONE pheromone (its goal's) smells strongest,
  // with 3 wide-radius antennae. An antenna whose segment crosses a wall detects
  // nothing (-Infinity). If it smells nothing (trail = 0 on all three) it keeps
  // straight and the noise makes it explore.
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
    // walls = worst option (never pick them): +Inf if we seek the min, -Inf if the max
    const W = weak ? Infinity : -Infinity;
    const L = blk[0] ? W : v[0], C = blk[1] ? W : v[1], R = blk[2] ? W : v[2];
    if (weak) {            // follow the WEAKEST (center preferred on ties)
      if (C <= L && C <= R) { /* straight */ }
      else if (L < R) a.heading -= CONFIG.TURN * Math.random();
      else a.heading += CONFIG.TURN * Math.random();
    } else {               // follow the STRONGEST
      if (C >= L && C >= R) { /* straight */ }
      else if (L > R) a.heading -= CONFIG.TURN * Math.random();
      else a.heading += CONFIG.TURN * Math.random();
    }
    return Math.max(v[0], v[1], v[2]) > 0.5;   // true if there's a real trail around
  },

  // soft repulsion: turns the heading toward the side where the field smells LESS
  // (away). So explorers steer off the "to home" trail and explore outward.
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
    // charge: Lague-style pheromone "charge". Starts at 1 when leaving the nest /
    //   picking up food and runs out each step (deposits less when farther away)
    //   => strong gradient near the origin. round: metric.
    return { x: this.nest.x, y: this.nest.y, heading: Math.random() * Math.PI * 2, hasFood: false, charge: 1, round: 0 };
  },

  // Not all created at once: a target is set and step() releases them one at a
  // time every SPAWN_EVERY steps (continuous flow, no synchronized wave).
  spawnAnts(n) { this.ants = []; this.targetAnts = n; this.spawnAccum = 0; },

  setAntCount(n) {
    this.targetAnts = n;
    if (n < this.ants.length) this.ants.length = n;   // lowering the count is immediate
  },

  resetScene() {
    this.alloc();
    this.deliveries = 0;
    this.tripSamples = [];
    this.searchSamples = [];
    // Wall between nest and food: it must be skirted above or below.
    this.paintRect(380, 160, 440, 440, WALL);
    // Slow terrain covering the TOP detour. Both detours are almost the same
    // length, but the bottom one is FASTER => the colony converges on it
    // (optimizes for speed).
    this.paintRect(200, 0, 620, 158, SLOW);
    // Food on the right; nest on the left.
    this.addFoodBlob(690, 300, 12, 100000);
    this.spawnAnts(CONFIG.ANTS);
  },

  updateAnt(a) {
    a.round++;

    let directed = false;   // guided (trail or goal in sight)? then it barely zigzags
    if (a.hasFood) {
      // CARRYING: if it detects the nest (close and no wall in between), it goes
      // STRAIGHT, overriding the pheromones (avoids loops near home). Otherwise it
      // follows the trail HOME.
      const dn = Math.hypot(a.x - this.nest.x, a.y - this.nest.y);
      if (dn < CONFIG.NEST_DETECT && !this.wallOnSegment(a.x, a.y, this.nest.x, this.nest.y)) {
        a.heading = this.steerToward(a.heading, Math.atan2(this.nest.y - a.y, this.nest.x - a.x), 0.7);
        directed = true;
      } else {
        directed = this.steerToField(a, this.toHome);
      }
    } else {
      // EXPLORING: if it detects the food (close and no wall), it goes STRAIGHT.
      // Otherwise it FOLLOWS the to-food trail toward the food; only if it smells
      // no trail does it wander at random (explores).
      const food = this.findFood(a.x, a.y);
      if (food && !this.wallOnSegment(a.x, a.y, food.x, food.y)) {
        a.heading = this.steerToward(a.heading, Math.atan2(food.y - a.y, food.x - a.x), 0.7);
        directed = true;
      } else {
        directed = this.steerToField(a, this.toFood);
      }
      // soft repulsion from the home trail: explores outward, doesn't linger near the nest
      this.repelFrom(a, this.toHome, CONFIG.REPEL_HOME);
    }
    // high noise when lost (explores); reduced but NOT zero when guided: it follows
    // the trail with some slack to drift off a bit and discover shortcuts => optimizes the route.
    a.heading += (Math.random() - 0.5) * CONFIG.WANDER * (directed ? 0.5 : 1);

    // movement (mud brake)
    const here = this.idx(this.colOf(a.x), this.rowOf(a.y));
    const onSlow = this.inBounds(this.colOf(a.x), this.rowOf(a.y)) && this.terrain[here] === SLOW;
    const mult = onSlow ? CONFIG.SLOW_MULT : 1;
    const stepLen = CONFIG.SPEED * mult;
    let nx = a.x + Math.cos(a.heading) * stepLen;
    let ny = a.y + Math.sin(a.heading) * stepLen;
    if (nx < 1 || nx > CONFIG.W - 1) { a.heading = Math.PI - a.heading; nx = a.x; }
    if (ny < 1 || ny > CONFIG.H - 1) { a.heading = -a.heading; ny = a.y; }

    if (this.wallAtPx(nx, ny)) {
      a.heading += Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;   // bounce
    } else {
      a.x = nx; a.y = ny;
    }
    // the charge runs out with each step (Lague style): deposits less when farther away
    if (a.charge > 0) a.charge = Math.max(0, a.charge - 1 / CONFIG.CHARGE_LIFE);

    // food / nest
    const ci = this.idx(this.colOf(a.x), this.rowOf(a.y));
    if (!a.hasFood) {
      if (this.inBounds(this.colOf(a.x), this.rowOf(a.y)) && this.food[ci] > 0) {
        this.food[ci] -= 1; a.hasFood = true; a.heading += Math.PI;
        this.searchSamples.push(a.round);
        if (this.searchSamples.length > 200) this.searchSamples.shift();
        a.charge = 1;   // recharge: new gradient origin (the food)
      }
    } else if (Math.hypot(a.x - this.nest.x, a.y - this.nest.y) < CONFIG.NEST_R) {
      a.hasFood = false; this.deliveries++;
      this.tripSamples.push(a.round);
      if (this.tripSamples.length > 200) this.tripSamples.shift();
      a.heading += Math.PI; a.round = 0;
      a.charge = 1;   // recharge: new gradient origin (the nest)
    }

    // Lague-style DEPOSIT: carriers lay toFood, explorers toHome. The amount is
    // DEPOSIT * charge (decays with steps from the origin) and is scaled by speed
    // (mult), so mud doesn't over-accumulate from taking more steps; its penalty is
    // that it burns the charge faster => the far end of the slow route stays faint.
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
    // releases ants gradually up to the target (one every SPAWN_EVERY steps)
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
