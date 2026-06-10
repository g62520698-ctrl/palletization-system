export interface BoxDimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
  weight?: number; // kg
}

export interface PalletDimensions {
  length: number; // cm
  width: number;  // cm
  maxHeight: number; // cm (including pallet height)
  palletHeight: number; // cm
}

export interface PlacedBox {
  x: number;
  y: number;
  w: number; // width as placed
  h: number; // depth as placed
  orientation: 'L' | 'T'; // Longitudinal or Transversal
}

export interface LayerPattern {
  boxes: PlacedBox[];
  boxCount: number;
  coverage: number; // 0-1
  hasInterlocking: boolean;
}

export interface PalletConfig {
  layers: LayerPattern[];
  totalBoxes: number;
  totalHeight: number;
  layerCount: number;
  reliability: ReliabilityScore;
  utilization: number;
  approved: boolean;
  rejectionReasons: string[];
}

export interface ReliabilityScore {
  total: number;
  internalInterlocking: number;
  layerInterlocking: number;
  supportArea: number;
  weightDistribution: number;
  centerOfGravity: number;
  heightScore: number;
  label: string;
}

export type QualityLevel = 'high' | 'medium' | 'low';

export interface DeviceProfile {
  quality: QualityLevel;
  isMobile: boolean;
  isTablet: boolean;
  pixelRatio: number;
}
