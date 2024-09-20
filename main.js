// main.js

import p5 from 'p5';
import Ant from './classes/Ant.js';
import Food from './classes/Food.js';
import Pheromone from './classes/Pheromone.js'; // Import Pheromone class

const sketch = (p) => {
  let colony;
  let ants = [];
  let pheromones = [];
  let foodItems = [];
  let antSpawnInterval = 501; // Milliseconds (2 seconds)
  let lastSpawnTime = 0;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2); // Colony position

    spawnFood(5); // Initialize with 5 food items
  };

  p.draw = () => {
    p.background(220);
    drawColony();

    // Spawn new ants at regular intervals
    if (p.millis() - lastSpawnTime > antSpawnInterval) {
      let ant = new Ant(p, colony, ants, pheromones, foodItems, colony); // Pass colony position to ants
      ants.push(ant);
      lastSpawnTime = p.millis();
    }

    // Update and display pheromones
    for (let i = pheromones.length - 1; i >= 0; i--) {
      let pheromone = pheromones[i];
      pheromone.update();
      pheromone.display();

      // Remove weak pheromones
      if (pheromone.isWeak()) {
        pheromones.splice(i, 1);
      }
    }

    // Update and display ants
    for (let ant of ants) {
      ant.update();
      ant.display();
    }

    // Display and check food depletion
    for (let i = foodItems.length - 1; i >= 0; i--) {
      let food = foodItems[i];
      food.display();
      
      // Check if food is depleted
      if (food.isDepleted()) {
        foodItems.splice(i, 1);  // Remove the depleted food
        spawnFood(1); // Spawn a new food item
      }
    }
  };

  function drawColony() {
    p.fill(0);
    p.noStroke();
    p.ellipse(colony.x, colony.y, 30, 30);
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text('Colony', colony.x, colony.y);
  }

  function spawnFood(amount) {
    for (let i = 0; i < amount; i++) {
      let food = new Food(p, p.createVector(p.random(p.width), p.random(p.height)));
      foodItems.push(food);
    }
  }

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    colony.set(p.width / 2, p.height / 2);
  };
};

new p5(sketch);
