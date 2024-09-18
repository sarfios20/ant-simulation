import p5 from 'p5';
import Ant from './classes/Ant.js';

const sketch = (p) => {
  let colony;
  let ants = [];
  let numAnts = 50;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    colony = p.createVector(p.width / 2, p.height / 2);

    for (let i = 0; i < numAnts; i++) {
      ants.push(new Ant(p, colony));
    }
  };

  p.draw = () => {
    p.background(220);
    drawColony();

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
