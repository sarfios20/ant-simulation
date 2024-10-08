// Terrain.js

export default class Terrain {
  constructor(p, position, radius, speedMultiplier = 0.5) {
    this.p = p;
    this.position = position.copy();
    this.radius = radius; 
    this.speedMultiplier = speedMultiplier;
  }

  render() {
    this.p.fill(150, 100, 50, 150); // Brownish color for mud terrain with some transparency
    this.p.noStroke();
    this.p.ellipse(this.position.x, this.position.y, this.radius * 2, this.radius * 2); // Draw roundish shape
  }

  // Method to check if an ant is inside the terrain area
  isAntInside(antPosition) {
    // Calculate the distance between the ant and the terrain's center
    let distanceToCenter = this.p.dist(antPosition.x, antPosition.y, this.position.x, this.position.y);
    
    // If the distance is less than the radius, the ant is inside the terrain
    return distanceToCenter < this.radius;
  }

  // Method to get the speed multiplier for ants in this terrain
  getSpeedMultiplier() {
    return this.speedMultiplier;
  }
}
