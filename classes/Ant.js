// Ant.js

import p5 from 'p5';
import Pheromone from './Pheromone.js'; // Import Pheromone class

export default class Ant {
  // Visualization and logging flags
  static showPerceptionRadius = true;
  static showForces = true;
  static showForceValues = false;
  static logForceValues = false;

  constructor(
    p,
    position,
    ants,
    pheromones,
    colony,
    colonyAttractionStrength = 0.1,
    randomSteerWeight = 1.0,
    avoidanceForceWeight = 1.5,
    pheromoneAvoidanceForceWeight = 3.0,
    colonyAttractionForceWeight = 0.5
  ) {
    this.p = p; 
    this.position = position.copy();
    this.size = 5;
    this.speed = 1.5; 
    this.perceptionRadius = 35;
    this.ants = ants; 
    this.pheromones = pheromones;
    this.colony = colony.copy();
    this.velocity = p5.Vector.random2D().mult(this.speed);
    this.noiseOffset = this.p.random(1000); // For Perlin noise

    // Add a deposit counter and interval
    this.depositInterval = 10; // Number of frames between deposits
    this.depositCounter = 0;

    // Force weights
    this.randomSteerWeight = randomSteerWeight;
    this.avoidanceForceWeight = avoidanceForceWeight;
    this.pheromoneAvoidanceForceWeight = pheromoneAvoidanceForceWeight;
    this.colonyAttractionForceWeight = colonyAttractionForceWeight;

    // Colony attraction strength
    this.colonyAttractionStrength = colonyAttractionStrength;

    // Initialize force vectors
    this.randomSteer = this.p.createVector(0, 0);
    this.avoidanceForce = this.p.createVector(0, 0);
    this.pheromoneAvoidanceForce = this.p.createVector(0, 0);
    this.colonyAttractionForce = this.p.createVector(0, 0);

    // For logging force contributions
    this.forceContributions = {
      randomSteerPercent: 0,
      avoidanceForcePercent: 0,
      pheromoneAvoidanceForcePercent: 0,
      colonyAttractionForcePercent: 0,
    };
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
    this.randomSteer = this.p.createVector(this.p.cos(angle), this.p.sin(angle));

    // Update noise offset
    this.noiseOffset += 0.01;

    // Get avoidance vectors
    this.avoidanceForce = this.avoidOthers();
    this.pheromoneAvoidanceForce = this.avoidPheromones();
    this.colonyAttractionForce = this.attractToColony();

    // Normalize all forces to ensure equal contribution when magnitudes are similar
    if (this.randomSteer.mag() > 0) this.randomSteer.normalize();
    if (this.avoidanceForce.mag() > 0) this.avoidanceForce.normalize();
    if (this.pheromoneAvoidanceForce.mag() > 0) this.pheromoneAvoidanceForce.normalize();
    if (this.colonyAttractionForce.mag() > 0) this.colonyAttractionForce.normalize();

    // Apply the multipliers (weights) defined in the constructor after normalization
    let weightedRandomSteer = this.randomSteer.copy().mult(this.randomSteerWeight);
    let weightedAvoidanceForce = this.avoidanceForce.copy().mult(this.avoidanceForceWeight);
    let weightedPheromoneAvoidanceForce = this.pheromoneAvoidanceForce.copy().mult(this.pheromoneAvoidanceForceWeight);
    let weightedColonyAttractionForce = this.colonyAttractionForce.copy().mult(this.colonyAttractionForceWeight);

    // Calculate total steering by summing all forces
    let steering = this.p.createVector(0, 0);
    steering.add(weightedRandomSteer);
    steering.add(weightedAvoidanceForce);
    steering.add(weightedPheromoneAvoidanceForce);
    steering.add(weightedColonyAttractionForce);

    // Limit the steering force (optional, if needed)
    steering.setMag(this.speed);

    // Update velocity and position
    this.velocity = steering.copy();
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
          diff.mult(pheromone.strength / 1000); // Weight by pheromone strength
          steering.add(diff);
          total++;
        }
      }
    }

    if (total > 0) {
      steering.div(total);
    }

    return steering;
  }

  attractToColony() {
    let directionToColony = p5.Vector.sub(this.colony, this.position);
    directionToColony.normalize();
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
    // Draw the ant
    this.p.fill(50);
    this.p.noStroke();
    this.p.ellipse(this.position.x, this.position.y, this.size, this.size);

    // Visualize perception radius
    if (Ant.showPerceptionRadius) {
      this.p.noFill();
      this.p.stroke(0, 255, 0, 100); // Green color with some transparency
      this.p.ellipse(this.position.x, this.position.y, this.perceptionRadius * 2);
    }

    // Visualize forces
    if (Ant.showForces) {
      // Scaling factors based on magnitudes
      let randomSteerScale = this.randomSteer.mag() * 50;
      let avoidanceForceScale = this.avoidanceForce.mag() * 50;
      let pheromoneAvoidanceForceScale = this.pheromoneAvoidanceForce.mag() * 50;
      let colonyAttractionForceScale = this.colonyAttractionForce.mag() * 50;

      // Draw velocity vector (resulting movement) in Blue
      this.p.stroke(0, 0, 255);
      this.drawVector(this.velocity, this.position, 10);

      // Draw individual force vectors with different colors
      // Random Steering (Purple)
      this.p.stroke(128, 0, 128);
      this.drawVector(this.randomSteer, this.position, randomSteerScale);

      // Avoidance Force (Red)
      this.p.stroke(255, 0, 0);
      this.drawVector(this.avoidanceForce, this.position, avoidanceForceScale);

      // Pheromone Avoidance Force (Orange)
      this.p.stroke(255, 165, 0);
      this.drawVector(
        this.pheromoneAvoidanceForce,
        this.position,
        pheromoneAvoidanceForceScale
      );

      // Colony Attraction Force (Green)
      this.p.stroke(0, 255, 0);
      this.drawVector(
        this.colonyAttractionForce,
        this.position,
        colonyAttractionForceScale
      );
    }

    // Display force contributions
    if (Ant.showForceValues) {
      // Set text properties
      this.p.fill(0);
      this.p.noStroke();
      this.p.textSize(10);

      // Prepare the text
      let info = `RS: ${this.forceContributions.randomSteerPercent.toFixed(1)}%
AF: ${this.forceContributions.avoidanceForcePercent.toFixed(1)}%
PAF: ${this.forceContributions.pheromoneAvoidanceForcePercent.toFixed(1)}%
CA: ${this.forceContributions.colonyAttractionForcePercent.toFixed(1)}%`;

      // Display the text near the ant
      this.p.text(info, this.position.x + 10, this.position.y - 10);
    }
  }

  drawVector(vec, pos, scale) {
    this.p.push();
    this.p.strokeWeight(2);
    this.p.translate(pos.x, pos.y);
    this.p.line(0, 0, vec.x * scale, vec.y * scale);
    this.p.pop();
  }
}
