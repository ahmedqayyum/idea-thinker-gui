/**
 * Pre-computed positions for the skeleton canvas DAG.
 * 4 default cards arranged left-to-right.
 */
export const SKELETON_POSITIONS = [
  { id: 'idea',               x: 80,   y: 200 },
  { id: 'resource_finder',    x: 430,  y: 200 },
  { id: 'experiment_runner',  x: 780,  y: 200 },
  { id: 'quality_evaluation', x: 1130, y: 200 },
];

export const SKELETON_EDGES = [
  { source: 'idea',              target: 'resource_finder' },
  { source: 'resource_finder',   target: 'experiment_runner' },
  { source: 'experiment_runner',  target: 'quality_evaluation' },
];
