// Ant.js

import p5 from 'p5';
import Pheromone from './Pheromone.js'; // Import Pheromone class

export default class Ant {
  constructor(
    p,
    position,
    ants,
    pheromones,
    foodItems,
    colony, // Colony should be a p5.Vector
    colonyAttractionStrength = 0.1,
    randomSteerWeight = 1.0,
    avoidanceForceWeight = 1.5,
    pheromoneAvoidanceForceWeight = 3.0,
    colonyAttractionForceWeight = 0.5
  ) {
    this.p = p;
    this.position = position.copy(); // Copy the starting position
    this.size = 5;
    this.speed = 1.5;
    this.perceptionRadius = 35;
    this.ants = ants;
    this.pheromones = pheromones;
    this.foodItems = foodItems;
    this.colony = colony.copy(); // Ensure colony is copied correctly as p5.Vector
    this.velocity = p5.Vector.random2D().mult(this.speed);
    this.noiseOffset = this.p.random(1000); // For Perlin noise

    // Add a deposit counter and interval
    this.depositInterval = 10;
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

    // Target food (null initially)
    this.targetFood = null;
    this.returning = false; // Indicates if the ant is in return mode
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
    if (this.returning) {
      // In return mode, follow pheromones back to the colony
      this.returnToColony();
    } else {
      // Check for food first
      this.checkForFood();

      if (this.targetFood) {
        // If there's target food, move towards it
        this.moveToFood();
      } else {
        // Standard movement logic using forces
        this.standardMovement();
      }
    }
  }

  checkForFood() {
    for (let food of this.foodItems) {
      let d = this.p.dist(this.position.x, this.position.y, food.position.x, food.position.y);
      if (d < this.perceptionRadius) {
        this.targetFood = food;
        break;
      }
    }
  }

  moveToFood() {
    let directionToFood = p5.Vector.sub(this.targetFood.position, this.position);
    directionToFood.setMag(this.speed);
    this.velocity = directionToFood;
    this.position.add(this.velocity);

    let d = this.p.dist(this.position.x, this.position.y, this.targetFood.position.x, this.targetFood.position.y);
    if (d < this.size / 2 + this.targetFood.size / 2) {
      // When the ant reaches the food, switch to return mode
      this.returning = true;
      this.targetFood = null; // Clear the food target
    }
  }

  returnToColony() {
    let distToColony = this.p.dist(this.position.x, this.position.y, this.colony.x, this.colony.y);

    // If the colony is within the perception radius, go straight to it
    if (distToColony < this.perceptionRadius) {
      let directionToColony = p5.Vector.sub(this.colony, this.position);
      directionToColony.setMag(this.speed);
      this.velocity = directionToColony;
      this.position.add(this.velocity);

      if (distToColony < this.size / 2 + 15) {
        // De-spawn the ant when it reaches the colony
        this.ants.splice(this.ants.indexOf(this), 1); // Remove the ant from the array
      }
    } else {
      let weakestPheromone = null;
      let weakestStrength = Infinity;

      // Find the weakest pheromone within perception range
      for (let pheromone of this.pheromones) {
        let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
        if (d < this.perceptionRadius && pheromone.type === 'explore') {
          if (pheromone.strength < weakestStrength) {
            weakestStrength = pheromone.strength;
            weakestPheromone = pheromone;
          }
        }
      }

      if (weakestPheromone) {
        // Follow the weakest pheromone (indicating it's closer to the colony)
        let directionToPheromone = p5.Vector.sub(weakestPheromone.position, this.position);
        directionToPheromone.setMag(this.speed);

        // Add some noise for randomness
        let noiseAngle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 0.1;
        let noiseVector = this.p.createVector(this.p.cos(noiseAngle), this.p.sin(noiseAngle)).mult(0.2);

        // Combine direction and noise
        this.velocity = p5.Vector.add(directionToPheromone, noiseVector);
        this.position.add(this.velocity);
        this.noiseOffset += 0.01;
      } else {
        // If no pheromone found, move randomly
        this.standardMovement();
      }
    }
  }

  standardMovement() {
    let angle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 4;
    this.randomSteer = this.p.createVector(this.p.cos(angle), this.p.sin(angle));
    this.noiseOffset += 0.01;

    this.avoidanceForce = this.avoidOthers();
    this.pheromoneAvoidanceForce = this.avoidPheromones();
    this.colonyAttractionForce = this.attractToColony();

    if (this.randomSteer.mag() > 0) this.randomSteer.normalize();
    if (this.avoidanceForce.mag() > 0) this.avoidanceForce.normalize();
    if (this.pheromoneAvoidanceForce.mag() > 0) this.pheromoneAvoidanceForce.normalize();
    if (this.colonyAttractionForce.mag() > 0) this.colonyAttractionForce.normalize();

    let weightedRandomSteer = this.randomSteer.copy().mult(this.randomSteerWeight);
    let weightedAvoidanceForce = this.avoidanceForce.copy().mult(this.avoidanceForceWeight);
    let weightedPheromoneAvoidanceForce = this.pheromoneAvoidanceForce.copy().mult(this.pheromoneAvoidanceForceWeight);
    let weightedColonyAttractionForce = this.colonyAttractionForce.copy().mult(this.colonyAttractionForceWeight);

    let steering = this.p.createVector(0, 0);
    steering.add(weightedRandomSteer);
    steering.add(weightedAvoidanceForce);
    steering.add(weightedPheromoneAvoidanceForce);
    steering.add(weightedColonyAttractionForce);

    steering.setMag(this.speed);
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
      let randomSteerScale = this.randomSteer.mag() * 50;
      let avoidanceForceScale = this.avoidanceForce.mag() * 50;
      let pheromoneAvoidanceForceScale = this.pheromoneAvoidanceForce.mag() * 50;
      let colonyAttractionForceScale = this.colonyAttractionForce.mag() * 50;

      this.p.stroke(0, 0, 255);
      this.drawVector(this.velocity, this.position, 10);

      this.p.stroke(128, 0, 128);
      this.drawVector(this.randomSteer, this.position, randomSteerScale);

      this.p.stroke(255, 0, 0);
      this.drawVector(this.avoidanceForce, this.position, avoidanceForceScale);

      this.p.stroke(255, 165, 0);
      this.drawVector(this.pheromoneAvoidanceForce, this.position, pheromoneAvoidanceForceScale);

      this.p.stroke(0, 255, 0);
      this.drawVector(this.colonyAttractionForce, this.position, colonyAttractionForceScale);
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
