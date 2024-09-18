// classes/Ant.js

export default class Ant {
  constructor(p, position) {
    this.p = p; // Pass the p5 instance
    this.position = position.copy();
    this.size = 5;
    this.speed = 1;
  }

  update() {
    let angle = this.p.random(this.p.TWO_PI);
    let step = this.p.createVector(this.p.cos(angle), this.p.sin(angle));
    step.mult(this.speed);
    this.position.add(step);

    // Keep within canvas
    this.position.x = this.p.constrain(this.position.x, 0, this.p.width);
    this.position.y = this.p.constrain(this.position.y, 0, this.p.height);
  }

  display() {
    this.p.fill(50);
    this.p.noStroke();
    this.p.ellipse(this.position.x, this.position.y, this.size, this.size);
  }
}
