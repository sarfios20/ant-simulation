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
    this.foodItems = foodItems;
    this.colony = colony.copy();
    this.velocity = p5.Vector.random2D().mult(this.speed);
    this.noiseOffset = this.p.random(1000);

    this.depositInterval = 10; // Pheromone deposit interval
    this.depositCounter = 0;

    // Force weights
    this.randomSteerWeight = randomSteerWeight;
    this.avoidanceForceWeight = avoidanceForceWeight;
    this.pheromoneAvoidanceForceWeight = pheromoneAvoidanceForceWeight;
    this.colonyAttractionForceWeight = colonyAttractionForceWeight;

    this.colonyAttractionStrength = colonyAttractionStrength;

    // Force vectors
    this.randomSteer = this.p.createVector(0, 0);
    this.avoidanceForce = this.p.createVector(0, 0);
    this.pheromoneAvoidanceForce = this.p.createVector(0, 0);
    this.colonyAttractionForce = this.p.createVector(0, 0);

    this.targetFood = null;
    this.returning = false;
    this.followingFoodPheromone = false; // Following food pheromone back to food
  }

  update() {
    this.move();
    this.edges();

    // Deposit pheromones at intervals
    this.depositCounter++;
    if (this.depositCounter >= this.depositInterval) {
      this.depositPheromone();
      this.depositCounter = 0;
    }
  }

  move() {
    if (this.returning) {
      this.returnToColony();
    } else if (this.followingFoodPheromone) {
      this.followFoodPheromone();
    } else {
      this.checkForFood();
      if (this.targetFood) {
        this.moveToFood();
      } else {
        this.standardMovement();
      }
    }
  }

  checkForFood() {
    for (let food of this.foodItems) {
      let d = this.p.dist(this.position.x, this.position.y, food.position.x, food.position.y);
      if (d < this.perceptionRadius) {
        this.targetFood = food;
        this.followingFoodPheromone = false; // Stop following pheromone if food is detected
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
      this.returning = true; // Switch to return mode
      this.targetFood = null; // Clear the food target
    }
  }

  followFoodPheromone() {
    let weakestFoodPheromone = null;
    let weakestStrength = Infinity;

    // Find the weakest food pheromone within perception radius
    for (let pheromone of this.pheromones) {
      let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
      if (d < this.perceptionRadius && pheromone.type === 'food') {
        if (pheromone.strength < weakestStrength) {
          weakestStrength = pheromone.strength;
          weakestFoodPheromone = pheromone;
        }
      }
    }

    if (weakestFoodPheromone) {
      // Follow the weakest food pheromone
      let directionToPheromone = p5.Vector.sub(weakestFoodPheromone.position, this.position);
      directionToPheromone.setMag(this.speed);

      // Add randomness to the movement
      let noiseAngle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 0.1;
      let noiseVector = this.p.createVector(this.p.cos(noiseAngle), this.p.sin(noiseAngle)).mult(0.2);

      this.velocity = p5.Vector.add(directionToPheromone, noiseVector);
      this.position.add(this.velocity);
      this.noiseOffset += 0.01;

      // Check for food while following the pheromone
      this.checkForFood();
    } else {
      // No food pheromones detected, return to random movement
      this.followingFoodPheromone = false;
      this.standardMovement();
    }
  }

  returnToColony() {
    let distToColony = this.p.dist(this.position.x, this.position.y, this.colony.x, this.colony.y);

    if (distToColony < this.perceptionRadius) {
      let directionToColony = p5.Vector.sub(this.colony, this.position);
      directionToColony.setMag(this.speed);
      this.velocity = directionToColony;
      this.position.add(this.velocity);

      if (distToColony < this.size / 2 + 15) {
        this.ants.splice(this.ants.indexOf(this), 1); // Remove the ant when it reaches the colony
      }
    } else {
      let weakestPheromone = null;
      let weakestStrength = Infinity;

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
        let directionToPheromone = p5.Vector.sub(weakestPheromone.position, this.position);
        directionToPheromone.setMag(this.speed);

        let noiseAngle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 0.1;
        let noiseVector = this.p.createVector(this.p.cos(noiseAngle), this.p.sin(noiseAngle)).mult(0.2);

        this.velocity = p5.Vector.add(directionToPheromone, noiseVector);
        this.position.add(this.velocity);
        this.noiseOffset += 0.01;
      } else {
        this.standardMovement();
      }
    }
  }

  standardMovement() {
    // Detect food pheromones during exploration
    let detectedFoodPheromone = this.detectFoodPheromone();
    if (detectedFoodPheromone) {
      this.followingFoodPheromone = true;
      this.followFoodPheromone();
      return;
    }

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

  detectFoodPheromone() {
    for (let pheromone of this.pheromones) {
      let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
      if (d < this.perceptionRadius && pheromone.type === 'food') {
        return pheromone;
      }
    }
    return null;
  }

  depositPheromone() {
    let pheromoneType = this.returning ? 'food' : 'explore';
    let pheromone = new Pheromone(this.p, this.position, pheromoneType);
    this.pheromones.push(pheromone);
  }

  avoidOthers() {
    let total = 0;
    let steering = this.p.createVector(0, 0);

    for (let other of this.ants) {
      if (other !== this) {
        let d = this.p.dist(this.position.x, this.position.y, other.position.x, other.position.y);
        if (d < this.perceptionRadius) {
          let diff = p5.Vector.sub(this.position, other.position);
          diff.normalize();
          diff.div(d);
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
        let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
        if (d < this.perceptionRadius) {
          let diff = p5.Vector.sub(this.position, pheromone.position);
          diff.normalize();
          diff.div(d);
          diff.mult(pheromone.strength / 1000);
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

  edges() {
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
