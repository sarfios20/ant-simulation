// uiControls.js

export function setupUIControls() {
  // Ant Behavior Controls
  setupSlider('speed-slider', 'ants.speed');
  setupSlider('perception-slider', 'ants.perceptionRadius');
  setupSlider('max-ants-slider', 'ants.maxAnts');
  setupSlider('random-steer-slider', 'ants.steeringForces.random');
  setupSlider('avoidance-steer-slider', 'ants.steeringForces.avoidance');
  setupSlider('pheromone-avoidance-steer-slider', 'ants.steeringForces.pheromoneAvoidance');
  setupSlider('colony-attraction-slider', 'ants.steeringForces.colonyAttraction');

  // Pheromone Settings
  setupSlider('pheromone-decay-slider', 'pheromones.decayRate');
  setupSlider('pheromone-strength-slider', 'pheromones.initialStrength');

  // Food Controls
  setupFoodControls();

  // Simulation Speed Controls
  document.getElementById('pause-btn').addEventListener('click', () => pauseSimulation());
  document.getElementById('play-btn').addEventListener('click', () => setSimulationSpeed(1));
  document.getElementById('fast-forward-btn').addEventListener('click', () => setSimulationSpeed(2));
}

// Helper function to bind sliders to simulationState properties
function setupSlider(sliderId, statePath) {
  const slider = document.getElementById(sliderId);
  if (slider) {
    slider.addEventListener('input', (event) => {
      const value = parseFloat(event.target.value);
      setSimulationStateValue(statePath, value);
    });
  }
}

// Helper function to update simulationState based on path (e.g., 'ants.speed')
function setSimulationStateValue(path, value) {
  const keys = path.split('.');
  let state = simulationState;
  for (let i = 0; i < keys.length - 1; i++) {
    state = state[keys[i]];
  }
  state[keys[keys.length - 1]] = value;
}

function pauseSimulation() {
  simulationState.simulationPaused = true;
}

function setSimulationSpeed(speed) {
  simulationState.simulationSpeed = speed;
  simulationState.simulationPaused = false;
}

// --- Food Controls Section ---

function setupFoodControls() {
  const addFoodButton = document.getElementById('add-food-btn');
  const removeFoodButton = document.getElementById('remove-food-btn');
  const foodAmountSlider = document.getElementById('food-amount-slider');

  let placingFood = false;
  let removingFood = false;

  // Handle Add Food Mode
  addFoodButton.addEventListener('click', () => {
    placingFood = !placingFood; // Toggle food placement mode
    removingFood = false; // Ensure removal mode is off when adding food

    if (placingFood) {
      addFoodButton.style.backgroundColor = '#646cff'; // Highlight active mode
      removeFoodButton.style.backgroundColor = ''; // Reset removal button color
      document.body.style.cursor = 'crosshair'; // Change cursor to indicate food placement mode
    } else {
      addFoodButton.style.backgroundColor = ''; // Reset button color
      document.body.style.cursor = ''; // Reset cursor
    }
  });

  // Handle Remove Food Mode
  removeFoodButton.addEventListener('click', () => {
    removingFood = !removingFood; // Toggle food removal mode
    placingFood = false; // Ensure placement mode is off when removing food

    if (removingFood) {
      removeFoodButton.style.backgroundColor = '#646cff'; // Highlight active mode
      addFoodButton.style.backgroundColor = ''; // Reset add food button color
      document.body.style.cursor = 'pointer'; // Change cursor to indicate food removal mode
    } else {
      removeFoodButton.style.backgroundColor = ''; // Reset button color
      document.body.style.cursor = ''; // Reset cursor
    }
  });

  // Expose event listeners to interact with `main.js`
  window.addEventListener('click', (event) => {
    if (placingFood) {
      const foodAmount = parseInt(foodAmountSlider.value);
      window.spawnFoodAt(event.clientX, event.clientY, foodAmount);
    } else if (removingFood) {
      window.removeFoodAt(event.clientX, event.clientY);
    }
  });
}
