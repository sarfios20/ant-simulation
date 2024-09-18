// Ant.js

import p5 from 'p5';
import Pheromone from './Pheromone.js'; // Import Pheromone class

export default class Ant {
  constructor(
    p,
    position,
    ants,
    pheromones,
    colony,
    colonyAttractionStrength = 0.1 // Default weaker attraction
  ) {
    this.p = p; // Reference to the p5 instance
    this.position = position.copy();
    this.size = 5;
    this.speed = 1.5; // Adjust as needed
    this.perceptionRadius = 25; // Adjust as needed
    this.ants = ants; // Reference to all ants
    this.pheromones = pheromones; // Reference to all pheromones
    this.colony = colony.copy(); // Colony position reference
    this.velocity = p5.Vector.random2D().mult(this.speed);
    this.noiseOffset = this.p.random(1000); // For Perlin noise

    // Add a deposit counter and interval
    this.depositInterval = 10; // Number of frames between deposits
    this.depositCounter = 0;

    // Colony attraction strength (adjustable)
    this.colonyAttractionStrength = colonyAttractionStrength;
  }

  update() {
    this.move();
    this.edges();

    // Increment the deposit counter
    this.depositCounter++;
    if (this.depositCounter >= this.depositInterval) {
      this.depositPheromone();
      this.depositCounter = 0;
    }
  }

  move() {
    // Calculate movement using Perlin noise for smoothness
    let angle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 4;
    let randomSteer = this.p.createVector(this.p.cos(angle), this.p.sin(angle));

    // Update noise offset
    this.noiseOffset += 0.01;

    // Get avoidance vectors
    let avoidance = this.avoidOthers();
    let pheromoneAvoidance = this.avoidPheromones();

    // Add a bias towards the colony
    let colonyAttraction = this.attractToColony();

    // Combine all steering vectors
    let steering = randomSteer
      .add(avoidance)
      .add(pheromoneAvoidance)
      .add(colonyAttraction);

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
      steering.mult(1.5); // Adjust the avoidance strength as needed
    }

    return steering;
  }

  avoidPheromones() {
    let total = 0;
    let steering = this.p.createVector(0, 0);

    for (let pheromone of this.pheromones) {
      if (pheromone.type === 'explore') {
        let d = this.p.dist(
          this.position.x,
          this.position.y,
          pheromone.position.x,
          pheromone.position.y
        );
        if (d < this.perceptionRadius) {
          let diff = p5.Vector.sub(this.position, pheromone.position);
          diff.normalize();
          diff.div(d); // Weight by distance
          diff.mult(pheromone.strength / 255); // Weight by pheromone strength
          steering.add(diff);
          total++;
        }
      }
    }

    if (total > 0) {
      steering.div(total);
      steering.mult(1.0); // Adjust the pheromone avoidance strength as needed
    }

    return steering;
  }

  attractToColony() {
    let directionToColony = p5.Vector.sub(this.colony, this.position);
    let distanceToColony = directionToColony.mag();

    // Normalize the direction vector
    directionToColony.normalize();

    // Scale the attraction by the colonyAttractionStrength
    let attractionForce = directionToColony.mult(this.colonyAttractionStrength);

    return attractionForce;
  }

  depositPheromone() {
    // Create a new exploration pheromone at the current position
    let pheromone = new Pheromone(this.p, this.position, 'explore');
    this.pheromones.push(pheromone);
  }

  edges() {
    // Keep ants within the canvas boundaries (screen wrapping)
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
