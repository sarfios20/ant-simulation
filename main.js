// main.js

import p5 from 'p5';
import Ant from './classes/Ant.js';

const sketch = (p) => {
  let colony;
  let ants = [];
  let numAnts = 100; // Adjust as desired

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2);

    // Create ant objects
    for (let i = 0; i < numAnts; i++) {
      // Pass the ants array and p instance to each ant
      let ant = new Ant(p, colony, ants);
      ants.push(ant);
    }
  };

  p.draw = () => {
    p.background(220);
    drawColony();

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
