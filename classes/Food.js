// Food.js

export default class Food {
  constructor(p, position, foodAmount = 100) {
    this.p = p;
    this.position = position.copy();
    this.size = 10; // Size of the food
    this.foodAmount = foodAmount; // Add food amount to the class
  }

  reduceFood(amount) {
    this.foodAmount -= amount;
  }

  isDepleted() {
    return this.foodAmount <= 0;
  }

  display() {
    this.p.fill(0, 255, 0); // Green color for food
    this.p.noStroke();
    this.p.ellipse(this.position.x, this.position.y, this.size, this.size);
  }
}
