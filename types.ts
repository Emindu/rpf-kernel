export enum PointClass {
  RED = -1,
  BLUE = 1
}

export interface DataPoint {
  id: string;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  label: PointClass;
}

export interface KernelConfig {
  gamma: number;
  elevation: number; // For visualizing the lift
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}