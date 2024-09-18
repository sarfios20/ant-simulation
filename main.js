// main.js

import p5 from 'p5';
import Ant from './classes/Ant.js';
import Pheromone from './classes/Pheromone.js'; // Import Pheromone class

const sketch = (p) => {
  let colony;
  let ants = [];
  let pheromones = [];
  let numAnts = 50; // Adjust as desired

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2); // Colony position

    // Create ant objects
    for (let i = 0; i < numAnts; i++) {
      let ant = new Ant(p, colony, ants, pheromones, colony); // Pass colony position to ants
      ants.push(ant);
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

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    colony.set(p.width / 2, p.height / 2);
  };
};

new p5(sketch);
