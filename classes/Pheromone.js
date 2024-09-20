// Pheromone.js

export default class Pheromone {
  constructor(p, position, type, strength = 1000) {
    this.p = p;
    this.position = position.copy();
    this.type = type; // 'explore' for exploring pheromones, 'food' for food pheromones
    this.strength = strength; // Custom strength
    this.decayRate = 1; // Decay over time
  }

  update() {
    this.strength -= this.decayRate;
  }

  isWeak() {
    return this.strength <= 0;
  }

  display() {
    this.p.noStroke();
    if (this.type === 'explore') {
      this.p.fill(0, 0, 255, this.strength); // Blue for explore pheromones
    } else if (this.type === 'food') {
      this.p.fill(255, 0, 0, this.strength); // Red for food pheromones
    }
    this.p.ellipse(this.position.x, this.position.y, 4, 4); // Small circle
  }
}
