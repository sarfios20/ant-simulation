import p5 from 'p5';
import Ant from './classes/Ant.js';
import Food from './classes/Food.js';
import { setupUIControls } from './classes/uiControls.js'; 

// Global object to store all state
const simulationState = {
  ants: {
    speed: 1.5,
    perceptionRadius: 35,
    maxAnts: 100,
    steeringForces: {
      random: 1.0,
      avoidance: 1.5,
      pheromoneAvoidance: 3.0,
      colonyAttraction: 0.5,
    },
  },
  pheromones: {
    decayRate: 5,
    initialStrength: 5000,
  },
  // General simulation controls
  simulationSpeed: 1,
  simulationPaused: false,
};

window.simulationState = simulationState; // Expose simulationState globally for UI access

let colony;
let ants = [];
let pheromones = [];
let foodItems = [];
let antSpawnInterval = 500; // Milliseconds between new ant spawns
let lastSpawnTime = 0;

let placingFood = false;
let removingFood = false;

const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2); // Set colony position at center

    spawnFood(5); // Initialize the simulation with 5 food items

    // Setup the UI controls for pause, play, and speed
    setupUIControls();
  };

  p.draw = () => {
    if (simulationState.simulationPaused) return; // Stop updates when paused

    // Adjust simulation updates based on speed
    for (let i = 0; i < simulationState.simulationSpeed; i++) {
      updateSimulation();
    }
  };

  // Handle food placement/removal click with canvas-relative coordinates
  p.mousePressed = () => {
    if (placingFood || removingFood) {
      // Get the exact bounding rectangle of the canvas
      const canvasPosition = p.canvas.getBoundingClientRect();
      // Adjust the position relative to the canvas
      const adjustedX = p.mouseX - canvasPosition.left;
      const adjustedY = p.mouseY - canvasPosition.top;

      if (placingFood) {
        const foodAmount = parseInt(document.getElementById('food-amount-slider').value);
        spawnFoodAt(adjustedX, adjustedY, foodAmount); // Use adjusted coordinates
      } else if (removingFood) {
        removeFoodAt(adjustedX, adjustedY); // Use adjusted coordinates
      }
    }
  };

  function updateSimulation() {
    p.background(220); // Clear background
    drawColony(); // Draw the colony

    // Spawn new ants at regular intervals, respecting maxAnts limit
    if (p.millis() - lastSpawnTime > antSpawnInterval && ants.length < simulationState.ants.maxAnts) {
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

  // --- Modified function for food placement ---

  // This function now adjusts the mouse coordinates using canvas bounds
  function spawnFoodAt(x, y, amount) {
    const canvasPosition = p.canvas.getBoundingClientRect();
    const adjustedX = x - canvasPosition.left;
    const adjustedY = y - canvasPosition.top;

    let food = new Food(p, p.createVector(adjustedX, adjustedY), amount);
    foodItems.push(food);
  }

  // Expose spawnFoodAt to the global window object for use by uiControls
  window.spawnFoodAt = spawnFoodAt;

  // Removes food at a given position (x, y) if the click is close to any existing food
  function removeFoodAt(x, y) {
    const canvasPosition = p.canvas.getBoundingClientRect();
    const adjustedX = x - canvasPosition.left;
    const adjustedY = y - canvasPosition.top;

    for (let i = foodItems.length - 1; i >= 0; i--) {
      let food = foodItems[i];
      let d = p.dist(adjustedX, adjustedY, food.position.x, food.position.y);
      if (d < food.size / 2) {
        foodItems.splice(i, 1); // Remove the food if clicked within its radius
        break;
      }
    }
  }

  // Expose removeFoodAt to the global window object for use by uiControls
  window.removeFoodAt = removeFoodAt;

  // Handle window resize
  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    colony.set(p.width / 2, p.height / 2); // Adjust colony to the center on resize
  };
};

// Initialize the p5.js sketch
new p5(sketch);
