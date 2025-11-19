import { DataPoint, PointClass } from '../types';

/**
 * Radial Basis Function Kernel: K(x, x') = exp(-gamma * ||x - x'||^2)
 */
export const rbfKernel = (x1: number, y1: number, x2: number, y2: number, gamma: number): number => {
  const distSq = (x1 - x2) ** 2 + (y1 - y2) ** 2;
  return Math.exp(-gamma * distSq);
};

/**
 * Calculates the decision function value at a specific coordinate.
 * Ideally, an SVM solves for weights (alphas). For this educational viz,
 * we use a Kernel Density/Parzen Window approach where every point is a support vector with weight 1.
 * This provides an immediate visual intuition of "influence fields" without solving quadratic programming.
 */
export const calculateDecisionValue = (
  x: number, 
  y: number, 
  points: DataPoint[], 
  gamma: number
): number => {
  let sum = 0;
  for (const point of points) {
    // Contribution: Label (+1 or -1) * Gaussian Similarity
    sum += point.label * rbfKernel(x, y, point.x, point.y, gamma);
  }
  return sum;
};

/**
 * Maps a decision value to a color for the heatmap.
 */
export const decisionToColor = (value: number): string => {
  // Softmax-ish normalization for color intensity
  const intensity = Math.min(Math.abs(value), 1);
  
  if (value > 0.05) {
    // Blue territory
    return `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`; 
  } else if (value < -0.05) {
    // Red territory
    return `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
  } else {
    // Decision Boundary (Near 0)
    return `rgba(255, 255, 255, 0.8)`; 
  }
};