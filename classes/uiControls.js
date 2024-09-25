// uiControls.js
export function setupUIControls() {
  document.getElementById('pause-btn').addEventListener('click', () => pauseSimulation());
  document.getElementById('play-btn').addEventListener('click', () => setSimulationSpeed(1));
  document.getElementById('fast-forward-btn').addEventListener('click', () => setSimulationSpeed(2));
}

function pauseSimulation() {
  window.simulationPaused = true;
}

function setSimulationSpeed(speed) {
  window.simulationSpeed = speed;
  window.simulationPaused = false;
}
