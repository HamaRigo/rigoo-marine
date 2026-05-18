// Computed once at module load so every component that imports this
// gets the same offset — guaranteeing all rmWave animations are in phase.
const PERIOD_MS = 5000;
export const WAVE_DELAY = `${-(Date.now() % PERIOD_MS)}ms`;
