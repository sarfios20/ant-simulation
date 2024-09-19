// main.js

import p5 from 'p5';
import Ant from './classes/Ant.js';
import Pheromone from './classes/Pheromone.js'; // Import Pheromone class
import Food from './classes/Food.js'; // Import Food class

const sketch = (p) => {
  let colony; // Colony will be a p5.Vector
  let ants = [];
  let pheromones = [];
  let foodItems = []; // Array to store food objects
  let numAnts = 10; // Adjust as desired

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);

    // Make sure colony is initialized as a p5.Vector
    colony = p.createVector(p.width / 2, p.height / 2); // Colony position

    // Create ant objects and pass the colony vector
    for (let i = 0; i < numAnts; i++) {
      let ant = new Ant(p, colony, ants, pheromones, foodItems, colony.copy()); // Pass colony as p5.Vector
      ants.push(ant);
    }

    // Create some initial food at random positions
    for (let i = 0; i < 5; i++) {
      let food = new Food(p, p.createVector(p.random(p.width), p.random(p.height)));
      foodItems.push(food);
    }
  };

  p.draw = () => {
    p.background(220);
    drawColony();

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

    // Update and display food
    for (let food of foodItems) {
      food.display();
    }

    // Update and display ants
    for (let ant of ants) {
      ant.update();
      ant.display();
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

  // Add new food on mouse press
  p.mousePressed = () => {
    let food = new Food(p, p.createVector(p.mouseX, p.mouseY));
    foodItems.push(food);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    colony.set(p.width / 2, p.height / 2);
  };
};

new p5(sketch);
