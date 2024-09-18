// Ant.js

import p5 from 'p5';

export default class Ant {
  constructor(p, position, ants) {
    this.p = p; // Reference to the p5 instance
    this.position = position.copy();
    this.size = 5;
    this.speed = 1.5; // Adjust as needed
    this.perceptionRadius = 25; // Adjust as needed
    this.ants = ants; // Reference to all ants
    this.velocity = p5.Vector.random2D().mult(this.speed); // Corrected line
    this.noiseOffset = this.p.random(1000); // For Perlin noise
  }

  update() {
    this.move();
    this.edges();
  }

  move() {
    // Calculate movement using Perlin noise for smoothness
    let angle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 4;
    let randomSteer = this.p.createVector(this.p.cos(angle), this.p.sin(angle));

    // Update noise offset
    this.noiseOffset += 0.01;

    // Get avoidance vector
    let avoidance = this.avoidOthers();

    // Combine random steering and avoidance
    let steering = randomSteer.add(avoidance);

    // Limit the steering force
    steering.setMag(this.speed);

    // Update velocity and position
    this.velocity = steering;
    this.position.add(this.velocity);
  }

  avoidOthers() {
    let total = 0;
    let steering = this.p.createVector(0, 0);
  
    for (let other of this.ants) {
      if (other !== this) {
        let d = this.p.dist(
          this.position.x,
          this.position.y,
          other.position.x,
          other.position.y
        );
        if (d < this.perceptionRadius) {
          let diff = p5.Vector.sub(this.position, other.position);
          diff.normalize();
          diff.div(d); // Weight by distance
          steering.add(diff);
          total++;
        }
      }
    }
  
    if (total > 0) {
      steering.div(total);
      // Optional: amplify the avoidance force
      steering.mult(1.5);
    }
  
    return steering;
  }
  

  edges() {
    // Keep ants within the canvas boundaries
    if (this.position.x > this.p.width) this.position.x = 0;
    if (this.position.x < 0) this.position.x = this.p.width;
    if (this.position.y > this.p.height) this.position.y = 0;
    if (this.position.y < 0) this.position.y = this.p.height;
  }

  display() {
    this.p.fill(50);
    this.p.noStroke();
    this.p.ellipse(this.position.x, this.position.y, this.size, this.size);
  }
}
