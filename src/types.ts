export type CircleShapeType = 'circle' | 'semicircle';
export type SemicircleDirection = 'top' | 'bottom' | 'left' | 'right';

export interface CircleItem {
  id: string;
  cx: number; // in grid units or canvas pixels
  cy: number;
  radius: number; // in grid units or canvas pixels
  color: string;
  strokeWidth: number;
  showCenter: boolean;
  showRadius: boolean;
  showDiameter: boolean;
  label?: string;
  isFilled?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  shapeType?: CircleShapeType;
  semiDirection?: SemicircleDirection;
}

export type ToolMode = 'compass' | 'select' | 'fill' | 'ruler' | 'eraser';

export type CompassDrawMode = 'auto' | 'manual'; // auto: click to draw full circle animated, manual: drag to rotate

export interface GridConfig {
  gridSize: number; // pixels per grid cell, default 30px (e.g. 1cm)
  subDivisions: number; // 2 or 5
  snapToGrid: boolean;
  showCoordinates: boolean;
  gridColor: 'blue' | 'slate' | 'green';
}

export interface SavedCanvas {
  id: string;
  title: string;
  circles: CircleItem[];
  savedAt: string;
  thumbnail?: string;
}
