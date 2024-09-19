// main.js

import p5 from 'p5';
import Ant from './classes/Ant.js';
import Pheromone from './classes/Pheromone.js'; // Import Pheromone class

const sketch = (p) => {
  let colony;
  let ants = [];
  let pheromones = [];
  let foodItems = [];
  let numAnts = 0; // Start with 0 ants
  let antSpawnInterval = 2000; // Milliseconds (2 seconds)
  let lastSpawnTime = 0;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2); // Colony position

    // Add multiple green food items at random positions
    for (let i = 0; i < 5; i++) {  // Add 5 food items (adjust as needed)
      let food = {
        position: p.createVector(p.random(p.width), p.random(p.height)),
        size: 15 // Food size (adjust as needed)
      };
      foodItems.push(food);
    }
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

    // Display food items in green
    for (let food of foodItems) {
      p.fill(0, 255, 0); // Green color for food
      p.noStroke();
      p.ellipse(food.position.x, food.position.y, food.size, food.size);
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

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    colony.set(p.width / 2, p.height / 2);
  };
};

new p5(sketch);
