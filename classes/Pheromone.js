// Pheromone.js

export default class Pheromone {
  constructor(p, position, type) {
    this.p = p;
    this.position = position.copy();
    this.type = type; // e.g., 'explore', 'food' (for future use)
    this.strength = 255; // Initial strength (you can adjust)
    this.decayRate = 1; // Amount by which strength decreases each frame
  }

  update() {
    // Reduce strength over time
    this.strength -= this.decayRate;
  }

  isWeak() {
    // Check if the pheromone is too weak to keep
    return this.strength <= 0;
  }

  display() {
    // Display the pheromone as a small circle
    this.p.noStroke();
    if (this.type === 'explore') {
      this.p.fill(0, 0, 255, this.strength); // Blue color for exploration pheromones
    } else if (this.type === 'food') {
      this.p.fill(255, 0, 0, this.strength); // Red color for food pheromones
    }
    this.p.ellipse(this.position.x, this.position.y, 4, 4); // Small circle
  }
}
