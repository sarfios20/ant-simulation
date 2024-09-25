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
