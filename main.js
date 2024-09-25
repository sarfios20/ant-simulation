import p5 from 'p5';
import Ant from './classes/Ant.js';
import Food from './classes/Food.js';
import Pheromone from './classes/Pheromone.js';
import { setupUIControls } from './classes/uiControls.js'; // Import UI controls

// Global variables for simulation speed and pause state
window.simulationSpeed = 1;
window.simulationPaused = false;

const sketch = (p) => {
  let colony;
  let ants = [];
  let pheromones = [];
  let foodItems = [];
  let antSpawnInterval = 500; // Milliseconds between new ant spawns
  let lastSpawnTime = 0;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2); // Set colony position at center

    spawnFood(5); // Initialize the simulation with 5 food items

    // Setup the UI controls for pause, play, and speed
    setupUIControls();
  };

  p.draw = () => {
    if (window.simulationPaused) return; // Stop updates when paused

    // Adjust simulation updates based on speed
    for (let i = 0; i < window.simulationSpeed; i++) {
      updateSimulation();
    }
  };

  function updateSimulation() {
    p.background(220); // Clear background
    drawColony(); // Draw the colony

    // Spawn new ants at regular intervals
    if (p.millis() - lastSpawnTime > antSpawnInterval) {
      let ant = new Ant(p, colony, ants, pheromones, foodItems, colony);
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

    // Display and check for food depletion
    for (let i = foodItems.length - 1; i >= 0; i--) {
      let food = foodItems[i];
      food.display();

      // Remove depleted food and spawn new food
      if (food.isDepleted()) {
        foodItems.splice(i, 1);
        spawnFood(1);
      }
    }
  }

  function drawColony() {
    p.fill(0);
    p.noStroke();
    p.ellipse(colony.x, colony.y, 30, 30); // Draw the colony circle
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text('Colony', colony.x, colony.y); // Label the colony
  }

  function spawnFood(amount) {
    for (let i = 0; i < amount; i++) {
      let food = new Food(p, p.createVector(p.random(p.width), p.random(p.height)));
      foodItems.push(food);
    }
  }

  // Handle window resize
  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    colony.set(p.width / 2, p.height / 2); // Adjust colony to the center on resize
  };
};

// Initialize the p5.js sketch
new p5(sketch);
