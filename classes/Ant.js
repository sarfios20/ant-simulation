// Ant.js

import p5 from 'p5';
import Pheromone from './Pheromone.js'; // Import Pheromone class

const PHEROMONE_DECAY = 100;

export default class Ant {
  constructor(
    p,
    position,
    ants,
    pheromones,
    foodItems,
    colony,
  ) {
    this.p = p; // Reference to p5.js instance
    this.position = position.copy();
    this.size = 5;
    this.velocity = p5.Vector.random2D().mult(simulationState.ants.speed); // Use speed from simulationState
    this.noiseOffset = this.p.random(1000);

    this.ants = ants;
    this.pheromones = pheromones;
    this.foodItems = foodItems;
    this.colony = colony.copy();

    this.depositInterval = 10; // Pheromone deposit interval
    this.depositCounter = 0;

    // Track current pheromone strength (from simulationState)
    this.currentPheromoneStrength = simulationState.pheromones.initialStrength;

    // Dynamic values for perception and steering forces from simulationState
    this.perceptionRadius = simulationState.ants.perceptionRadius;
    this.randomSteerWeight = simulationState.ants.steeringForces.random;
    this.avoidanceForceWeight = simulationState.ants.steeringForces.avoidance;
    this.pheromoneAvoidanceForceWeight = simulationState.ants.steeringForces.pheromoneAvoidance;
    this.colonyAttractionForceWeight = simulationState.ants.steeringForces.colonyAttraction;

    this.targetFood = null;
    this.returning = false;
    this.followingFoodPheromone = false;
    this.foundFood = false;
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
    directionToFood.setMag(simulationState.ants.speed); // Use dynamic speed
    this.velocity = directionToFood;
    this.position.add(this.velocity);

    let d = this.p.dist(this.position.x, this.position.y, this.targetFood.position.x, this.targetFood.position.y);
    if (d < this.size / 2 + this.targetFood.size / 2) {
      this.targetFood.reduceFood(10); // Reduce the food amount by 10
      this.returning = true; // Switch to return mode
      this.targetFood = null; // Clear the food target
      this.foundFood = true; // Mark that the ant found food
    }
  }

  followFoodPheromone() {
    let strongestFoodPheromone = null;
    let highestStrength = -Infinity;

    // Find the strongest food pheromone within perception radius
    for (let pheromone of this.pheromones) {
      let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
      if (d < this.perceptionRadius && pheromone.type === 'food') {
        if (pheromone.strength > highestStrength) {
          highestStrength = pheromone.strength;
          strongestFoodPheromone = pheromone;
        }
      }
    }

    if (strongestFoodPheromone) {
      let directionToPheromone = p5.Vector.sub(strongestFoodPheromone.position, this.position);
      directionToPheromone.setMag(simulationState.ants.speed);

      let noiseAngle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 0.1;
      let noiseVector = this.p.createVector(this.p.cos(noiseAngle), this.p.sin(noiseAngle)).mult(0.2);

      this.velocity = p5.Vector.add(directionToPheromone, noiseVector);
      this.position.add(this.velocity);
      this.noiseOffset += 0.01;

      this.checkForFood(); // Continue checking for food while following the pheromone
    } else {
      this.followingFoodPheromone = false;
      this.standardMovement(); // No food pheromone detected, return to random movement
    }
  }

  returnToColony() {
    let distToColony = this.p.dist(this.position.x, this.position.y, this.colony.x, this.colony.y);

    if (distToColony < this.perceptionRadius) {
      // Head directly to the colony if it's within perception radius
      let directionToColony = p5.Vector.sub(this.colony, this.position);
      directionToColony.setMag(simulationState.ants.speed);
      this.velocity = directionToColony;
      this.position.add(this.velocity);

      // Remove the ant when it reaches the colony
      if (distToColony < this.size / 2 + 15) {
        this.ants.splice(this.ants.indexOf(this), 1); 
      }
    } else {
      // Follow the strongest explorer pheromone
      let strongestExplorerPheromone = null;
      let highestStrength = -Infinity;

      // Look for the strongest 'explore' pheromone within the ant's perception range
      for (let pheromone of this.pheromones) {
        let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
        if (d < this.perceptionRadius && pheromone.type === 'explore') {
          if (pheromone.strength > highestStrength) {
            highestStrength = pheromone.strength;
            strongestExplorerPheromone = pheromone;
          }
        }
      }

      if (strongestExplorerPheromone) {
        // Move towards the strongest explorer pheromone
        let directionToPheromone = p5.Vector.sub(strongestExplorerPheromone.position, this.position);
        directionToPheromone.setMag(simulationState.ants.speed);

        let noiseAngle = this.p.noise(this.noiseOffset) * this.p.TWO_PI * 0.1;
        let noiseVector = this.p.createVector(this.p.cos(noiseAngle), this.p.sin(noiseAngle)).mult(0.2);

        this.velocity = p5.Vector.add(directionToPheromone, noiseVector);
        this.position.add(this.velocity);
        this.noiseOffset += 0.01;
      } else {
        // If no pheromones are found, move randomly
        this.standardMovement();
      }
    }
  }

  standardMovement() {
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

    steering.setMag(simulationState.ants.speed);
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
    if (this.returning) {
      if (this.foundFood) {
        // Drop food pheromones if the ant found food
        let pheromone = new Pheromone(this.p, this.position, 'food', this.currentPheromoneStrength); 
        this.pheromones.push(pheromone);
        
        // Reduce strength for the next pheromone drop
        this.currentPheromoneStrength -= PHEROMONE_DECAY;
        if (this.currentPheromoneStrength <= 0) {
          this.currentPheromoneStrength = 0; // Prevent negative strength
        }
      }
    } else {
      // While exploring, reduce pheromone strength gradually for explorer pheromones
      let pheromone = new Pheromone(this.p, this.position, 'explore', this.currentPheromoneStrength);
      this.pheromones.push(pheromone);
  
      // Reduce strength for the next explorer pheromone
      this.currentPheromoneStrength -= PHEROMONE_DECAY;
      
      // If pheromone strength reaches 0, the ant starts returning
      if (this.currentPheromoneStrength <= 0) {
        this.returning = true;
        this.targetFood = null;
        this.foundFood = false;
      }
    }
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
        let d = this.p.dist(this.position.x, this.position.y, pheromone.position.x, pheromone.position.y);
        if (d < this.perceptionRadius && d > 0) { // Added d > 0 check
          let diff = p5.Vector.sub(this.position, pheromone.position);
          diff.normalize();
          diff.div(d); // Weight by distance
          diff.mult(pheromone.strength / simulationState.pheromones.initialStrength);
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
    let attractionForce = directionToColony.mult(simulationState.ants.steeringForces.colonyAttraction);

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
