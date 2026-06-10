import type { BoxDimensions, PalletDimensions, PlacedBox, LayerPattern, PalletConfig, ReliabilityScore } from './types';

const DEFAULT_PALLET: PalletDimensions = {
  length: 120,
  width: 100,
  maxHeight: 170,
  palletHeight: 15,
};

// ─── Pattern Generation ──────────────────────────────────────────────

/**
 * Generate all viable interlocked layer patterns.
 * Each pattern contains mixed orientations for internal locking.
 */
function generateAllPatterns(
  box: BoxDimensions,
  pallet: PalletDimensions
): LayerPattern[] {
  const patterns: LayerPattern[] = [];
  const pL = pallet.length;
  const pW = pallet.width;
  const bL = Math.max(box.length, box.width);
  const bW = Math.min(box.length, box.width);

  // If square box, only uniform pattern is possible
  if (Math.abs(bL - bW) < 0.01) {
    const p = fillUniform(bL, bW, pL, pW);
    if (p) patterns.push(p);
    return patterns;
  }

  // Strategy 1: Alternating row orientations
  // Each row is filled uniformly but adjacent rows alternate L/T
  for (let startT = 0; startT <= 1; startT++) {
    const p = fillAlternatingRows(bL, bW, pL, pW, startT === 1);
    if (p && p.boxCount > 0 && p.hasInterlocking) patterns.push(p);
  }

  // Strategy 2: Split pallet horizontally into 2 zones
  // Use box-aligned split points for optimal fills
  const hSplitPoints = new Set<number>();
  for (let n = 1; n <= Math.floor(pW / bW); n++) hSplitPoints.add(n * bW);
  for (let n = 1; n <= Math.floor(pW / bL); n++) hSplitPoints.add(n * bL);
  for (const splitY of hSplitPoints) {
    if (splitY >= pW * 0.15 && splitY <= pW * 0.85) {
      const p = fillSplitHorizontal(bL, bW, pL, pW, splitY);
      if (p && p.boxCount > 0 && p.hasInterlocking) patterns.push(p);
    }
  }

  // Strategy 3: Split pallet vertically into 2 zones
  const vSplitPoints = new Set<number>();
  for (let n = 1; n <= Math.floor(pL / bL); n++) vSplitPoints.add(n * bL);
  for (let n = 1; n <= Math.floor(pL / bW); n++) vSplitPoints.add(n * bW);
  for (const splitX of vSplitPoints) {
    if (splitX >= pL * 0.15 && splitX <= pL * 0.85) {
      const p = fillSplitVertical(bL, bW, pL, pW, splitX);
      if (p && p.boxCount > 0 && p.hasInterlocking) patterns.push(p);
    }
  }

  // Strategy 4: 4-block checkerboard pattern with box-aligned splits
  for (const splitX of vSplitPoints) {
    if (splitX < pL * 0.25 || splitX > pL * 0.75) continue;
    for (const splitY of hSplitPoints) {
      if (splitY < pW * 0.25 || splitY > pW * 0.75) continue;
      const p = fillCheckerboard(bL, bW, pL, pW, splitX, splitY);
      if (p && p.boxCount > 0 && p.hasInterlocking) patterns.push(p);
    }
  }

  // Strategy 5: Optimal row-fit alternating
  // Find the best row heights that fit evenly
  const p5a = fillOptimalAlternating(bL, bW, pL, pW);
  if (p5a) patterns.push(...p5a);

  // Strategy 6: Pinwheel / column-column
  const pw = fillPinwheel(bL, bW, pL, pW);
  if (pw && pw.boxCount > 0 && pw.hasInterlocking) patterns.push(pw);

  // Fallback: uniform patterns (no interlocking, but works for any box)
  const u1 = fillUniform(bL, bW, pL, pW);
  if (u1) patterns.push(u1);
  const u2 = fillUniform(bW, bL, pL, pW);
  if (u2) patterns.push(u2);

  // Deduplicate
  return deduplicatePatterns(patterns);
}

// Fill entire layer with alternating row orientations
function fillAlternatingRows(
  bL: number, bW: number,
  pL: number, pW: number,
  startTransverse: boolean
): LayerPattern | null {
  const boxes: PlacedBox[] = [];
  let y = 0;
  let row = 0;

  while (y < pW - 0.01) {
    const isT = (row % 2 === 0) !== startTransverse;
    const rL = isT ? bW : bL; // box length in row direction (x)
    const rW = isT ? bL : bW; // box depth in column direction (y)

    if (y + rW > pW + 0.01) {
      // Try the other orientation to fill remaining space
      const altRL = isT ? bL : bW;
      const altRW = isT ? bW : bL;
      if (y + altRW <= pW + 0.01) {
        let x = 0;
        while (x + altRL <= pL + 0.01) {
          boxes.push({ x, y, w: altRL, h: altRW, orientation: isT ? 'L' : 'T' });
          x += altRL;
        }
      }
      break;
    }

    let x = 0;
    while (x + rL <= pL + 0.01) {
      boxes.push({ x, y, w: rL, h: rW, orientation: isT ? 'T' : 'L' });
      x += rL;
    }

    y += rW;
    row++;
  }

  return createPattern(boxes, pL, pW);
}

// Split pallet horizontally into two zones
function fillSplitHorizontal(
  bL: number, bW: number,
  pL: number, pW: number,
  splitY: number
): LayerPattern | null {
  const boxes: PlacedBox[] = [];

  // Top zone: L orientation
  fillZone(boxes, 0, 0, pL, splitY, bL, bW, 'L');
  // Bottom zone: T orientation
  fillZone(boxes, 0, splitY, pL, pW - splitY, bW, bL, 'T');

  return createPattern(boxes, pL, pW);
}

// Split pallet vertically into two zones
function fillSplitVertical(
  bL: number, bW: number,
  pL: number, pW: number,
  splitX: number
): LayerPattern | null {
  const boxes: PlacedBox[] = [];

  // Left zone: L orientation
  fillZone(boxes, 0, 0, splitX, pW, bL, bW, 'L');
  // Right zone: T orientation
  fillZone(boxes, splitX, 0, pL - splitX, pW, bW, bL, 'T');

  return createPattern(boxes, pL, pW);
}

// 4-block checkerboard
function fillCheckerboard(
  bL: number, bW: number,
  pL: number, pW: number,
  splitX: number, splitY: number
): LayerPattern | null {
  const boxes: PlacedBox[] = [];

  // TL: L
  fillZone(boxes, 0, 0, splitX, splitY, bL, bW, 'L');
  // TR: T
  fillZone(boxes, splitX, 0, pL - splitX, splitY, bW, bL, 'T');
  // BL: T
  fillZone(boxes, 0, splitY, splitX, pW - splitY, bW, bL, 'T');
  // BR: L
  fillZone(boxes, splitX, splitY, pL - splitX, pW - splitY, bL, bW, 'L');

  return createPattern(boxes, pL, pW);
}

// Try to find optimal alternating row configuration
function fillOptimalAlternating(
  bL: number, bW: number,
  pL: number, pW: number
): LayerPattern[] {
  const results: LayerPattern[] = [];

  // How many rows of each type can fit?
  // L rows: height = bW, T rows: height = bL
  // Try all combinations of nL rows + nT rows where nL*bW + nT*bL <= pW
  const maxLRows = Math.floor(pW / bW);
  const maxTRows = Math.floor(pW / bL);

  for (let nL = 0; nL <= maxLRows; nL++) {
    for (let nT = 0; nT <= maxTRows; nT++) {
      if (nL === 0 && nT === 0) continue;
      if (nL === 0 || nT === 0) continue; // Must have interlocking

      const totalHeight = nL * bW + nT * bL;
      if (totalHeight > pW + 0.01) continue;
      if (totalHeight < pW * 0.7) continue; // Minimum coverage

      // Arrange rows alternating as much as possible
      const boxes: PlacedBox[] = [];
      let y = 0;
      let remainL = nL;
      let remainT = nT;
      let toggle = remainL >= remainT;

      while (remainL > 0 || remainT > 0) {
        if (toggle && remainL > 0) {
          // Place L row
          let x = 0;
          while (x + bL <= pL + 0.01) {
            boxes.push({ x, y, w: bL, h: bW, orientation: 'L' });
            x += bL;
          }
          y += bW;
          remainL--;
        } else if (remainT > 0) {
          // Place T row
          let x = 0;
          while (x + bW <= pL + 0.01) {
            boxes.push({ x, y, w: bW, h: bL, orientation: 'T' });
            x += bW;
          }
          y += bL;
          remainT--;
        } else if (remainL > 0) {
          let x = 0;
          while (x + bL <= pL + 0.01) {
            boxes.push({ x, y, w: bL, h: bW, orientation: 'L' });
            x += bL;
          }
          y += bW;
          remainL--;
        }
        toggle = !toggle;
      }

      const p = createPattern(boxes, pL, pW);
      if (p && p.hasInterlocking) results.push(p);
    }
  }

  return results;
}

// Pinwheel pattern
function fillPinwheel(
  bL: number, bW: number,
  pL: number, pW: number
): LayerPattern | null {
  const unitSize = bL + bW;
  if (unitSize > pL || unitSize > pW) return null;

  const boxes: PlacedBox[] = [];
  let uy = 0;

  while (uy + unitSize <= pW + 0.01) {
    let ux = 0;
    while (ux + unitSize <= pL + 0.01) {
      // 4 boxes in pinwheel arrangement
      boxes.push({ x: ux, y: uy, w: bL, h: bW, orientation: 'L' });
      boxes.push({ x: ux + bL, y: uy, w: bW, h: bL, orientation: 'T' });
      boxes.push({ x: ux + bW, y: uy + bW, w: bL, h: bW, orientation: 'L' });
      boxes.push({ x: ux, y: uy + bW, w: bW, h: bL, orientation: 'T' });
      ux += unitSize;
    }
    uy += unitSize;
  }

  // Fill remaining space with whatever fits
  // Right strip
  const usedX = Math.floor(pL / unitSize) * unitSize;
  if (usedX < pL) {
    const remW = pL - usedX;
    let y = 0;
    if (remW >= bW) {
      while (y + bL <= pW + 0.01) {
        boxes.push({ x: usedX, y, w: bW, h: bL, orientation: 'T' });
        y += bL;
      }
    } else if (remW >= bL) {
      while (y + bW <= pW + 0.01) {
        boxes.push({ x: usedX, y, w: bL, h: bW, orientation: 'L' });
        y += bW;
      }
    }
  }

  // Bottom strip
  const usedY = Math.floor(pW / unitSize) * unitSize;
  if (usedY < pW) {
    const remH = pW - usedY;
    let x = 0;
    if (remH >= bW) {
      while (x + bL <= usedX + 0.01) {
        boxes.push({ x, y: usedY, w: bL, h: bW, orientation: 'L' });
        x += bL;
      }
    } else if (remH >= bL) {
      while (x + bW <= usedX + 0.01) {
        boxes.push({ x, y: usedY, w: bW, h: bL, orientation: 'T' });
        x += bW;
      }
    }
  }

  // Check for overlaps
  if (hasOverlaps(boxes)) return null;
  // Check bounds
  for (const b of boxes) {
    if (b.x + b.w > pL + 0.01 || b.y + b.h > pW + 0.01) return null;
    if (b.x < -0.01 || b.y < -0.01) return null;
  }

  return createPattern(boxes, pL, pW);
}

// Fill a rectangular zone with boxes of given orientation
function fillZone(
  boxes: PlacedBox[],
  startX: number, startY: number,
  zoneW: number, zoneH: number,
  boxW: number, boxH: number,
  orientation: 'L' | 'T'
) {
  let y = startY;
  while (y + boxH <= startY + zoneH + 0.01) {
    let x = startX;
    while (x + boxW <= startX + zoneW + 0.01) {
      boxes.push({ x, y, w: boxW, h: boxH, orientation });
      x += boxW;
    }
    y += boxH;
  }
}

// Fill entire pallet uniformly (single orientation)
function fillUniform(
  bL: number, bW: number,
  pL: number, pW: number
): LayerPattern | null {
  const boxes: PlacedBox[] = [];
  let y = 0;
  while (y + bW <= pW + 0.01) {
    let x = 0;
    while (x + bL <= pL + 0.01) {
      boxes.push({ x, y, w: bL, h: bW, orientation: 'L' });
      x += bL;
    }
    y += bW;
  }
  return createPattern(boxes, pL, pW);
}

// ─── Pattern Utilities ───────────────────────────────────────────────

function createPattern(boxes: PlacedBox[], pL: number, pW: number): LayerPattern | null {
  if (boxes.length === 0) return null;

  // Validate no overlaps
  if (hasOverlaps(boxes)) return null;

  // Validate bounds
  for (const b of boxes) {
    if (b.x < -0.01 || b.y < -0.01 || b.x + b.w > pL + 0.01 || b.y + b.h > pW + 0.01) {
      return null;
    }
  }

  const hasL = boxes.some(b => b.orientation === 'L');
  const hasT = boxes.some(b => b.orientation === 'T');

  const totalArea = boxes.reduce((s, b) => s + b.w * b.h, 0);
  const coverage = totalArea / (pL * pW);

  return {
    boxes,
    boxCount: boxes.length,
    coverage,
    hasInterlocking: hasL && hasT,
  };
}

function hasOverlaps(boxes: PlacedBox[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x < b.x + b.w - 0.01 && a.x + a.w > b.x + 0.01 &&
          a.y < b.y + b.h - 0.01 && a.y + a.h > b.y + 0.01) {
        return true;
      }
    }
  }
  return false;
}

function deduplicatePatterns(patterns: LayerPattern[]): LayerPattern[] {
  const seen = new Set<string>();
  const result: LayerPattern[] = [];

  for (const p of patterns) {
    const sorted = [...p.boxes].sort((a, b) => a.x - b.x || a.y - b.y);
    const sig = sorted.map(b =>
      `${Math.round(b.x * 10)},${Math.round(b.y * 10)},${Math.round(b.w * 10)},${Math.round(b.h * 10)},${b.orientation}`
    ).join('|');
    if (!seen.has(sig)) {
      seen.add(sig);
      result.push(p);
    }
  }

  return result;
}

// ─── Layer Rotation ──────────────────────────────────────────────────

function rotateLayer180(pattern: LayerPattern, pL: number, pW: number): LayerPattern {
  const boxes: PlacedBox[] = pattern.boxes.map(b => ({
    x: pL - b.x - b.w,
    y: pW - b.y - b.h,
    w: b.w,
    h: b.h,
    orientation: b.orientation,
  }));

  return {
    boxes,
    boxCount: pattern.boxCount,
    coverage: pattern.coverage,
    hasInterlocking: pattern.hasInterlocking,
  };
}

// ─── Structural Validation ───────────────────────────────────────────

function calculateLayerSupport(upper: LayerPattern, lower: LayerPattern): number {
  let totalSupport = 0;
  let totalArea = 0;

  for (const uBox of upper.boxes) {
    const boxArea = uBox.w * uBox.h;
    totalArea += boxArea;

    let supportedArea = 0;
    for (const lBox of lower.boxes) {
      const overlapX = Math.max(0, Math.min(uBox.x + uBox.w, lBox.x + lBox.w) - Math.max(uBox.x, lBox.x));
      const overlapY = Math.max(0, Math.min(uBox.y + uBox.h, lBox.y + lBox.h) - Math.max(uBox.y, lBox.y));
      supportedArea += overlapX * overlapY;
    }

    totalSupport += Math.min(supportedArea, boxArea);
  }

  return totalArea > 0 ? totalSupport / totalArea : 0;
}

function checkMinimumSupport(
  upper: LayerPattern,
  lower: LayerPattern,
  minSupport: number = 0.7
): { valid: boolean; worstSupport: number } {
  let worstSupport = 1;

  for (const uBox of upper.boxes) {
    const boxArea = uBox.w * uBox.h;
    let supportedArea = 0;

    for (const lBox of lower.boxes) {
      const overlapX = Math.max(0, Math.min(uBox.x + uBox.w, lBox.x + lBox.w) - Math.max(uBox.x, lBox.x));
      const overlapY = Math.max(0, Math.min(uBox.y + uBox.h, lBox.y + lBox.h) - Math.max(uBox.y, lBox.y));
      supportedArea += overlapX * overlapY;
    }

    const support = Math.min(supportedArea / boxArea, 1);
    worstSupport = Math.min(worstSupport, support);
  }

  return { valid: worstSupport >= minSupport, worstSupport };
}

// Calculate how well edges cross between layers (interlocking quality)
function calculateEdgeCrossingScore(layerA: LayerPattern, layerB: LayerPattern): number {
  // Collect internal edges (seams between boxes) for each layer
  const seamsA = getSeams(layerA);
  const seamsB = getSeams(layerB);

  if (seamsB.length === 0) return 0;

  let crossings = 0;
  for (const sB of seamsB) {
    for (const sA of seamsA) {
      if (seamsCross(sA, sB)) {
        crossings++;
        break;
      }
    }
  }

  return crossings / seamsB.length;
}

interface Seam {
  x1: number; y1: number; x2: number; y2: number;
  isVertical: boolean;
}

function getSeams(pattern: LayerPattern): Seam[] {
  // Find edges that are shared between two adjacent boxes (internal seams)
  const edges: { x1: number; y1: number; x2: number; y2: number; isVert: boolean }[] = [];

  for (const b of pattern.boxes) {
    // Right edge
    edges.push({ x1: b.x + b.w, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, isVert: true });
    // Bottom edge
    edges.push({ x1: b.x, y1: b.y + b.h, x2: b.x + b.w, y2: b.y + b.h, isVert: false });
    // Left edge
    edges.push({ x1: b.x, y1: b.y, x2: b.x, y2: b.y + b.h, isVert: true });
    // Top edge
    edges.push({ x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, isVert: false });
  }

  // Keep only internal edges (those that appear at the boundary of two boxes)
  const seams: Seam[] = [];
  const seen = new Set<string>();

  for (const e of edges) {
    const key = `${e.x1.toFixed(1)},${e.y1.toFixed(1)},${e.x2.toFixed(1)},${e.y2.toFixed(1)},${e.isVert}`;
    if (seen.has(key)) {
      seams.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, isVertical: e.isVert });
    }
    seen.add(key);
  }

  return seams;
}

function seamsCross(s1: Seam, s2: Seam): boolean {
  if (s1.isVertical === s2.isVertical) return false;

  const vert = s1.isVertical ? s1 : s2;
  const horiz = s1.isVertical ? s2 : s1;

  const vx = vert.x1;
  const vyMin = Math.min(vert.y1, vert.y2);
  const vyMax = Math.max(vert.y1, vert.y2);
  const hy = horiz.y1;
  const hxMin = Math.min(horiz.x1, horiz.x2);
  const hxMax = Math.max(horiz.x1, horiz.x2);

  return vx > hxMin + 0.1 && vx < hxMax - 0.1 && hy > vyMin + 0.1 && hy < vyMax - 0.1;
}

// ─── Center of Gravity ──────────────────────────────────────────────

function calculateCOGScore(pattern: LayerPattern, pL: number, pW: number): number {
  const centerX = pL / 2;
  const centerY = pW / 2;

  let totalWeight = 0;
  let cogX = 0;
  let cogY = 0;

  for (const b of pattern.boxes) {
    const w = b.w * b.h;
    cogX += (b.x + b.w / 2) * w;
    cogY += (b.y + b.h / 2) * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return 0;

  cogX /= totalWeight;
  cogY /= totalWeight;

  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const dist = Math.sqrt((cogX - centerX) ** 2 + (cogY - centerY) ** 2);

  return Math.max(0, 1 - (dist / maxDist) * 3); // Amplify penalty
}

// ─── Reliability Score ───────────────────────────────────────────────

function calculateReliability(
  pattern: LayerPattern,
  rotatedPattern: LayerPattern,
  pallet: PalletDimensions,
  layerCount: number,
  boxHeight: number
): ReliabilityScore {
  const pL = pallet.length;
  const pW = pallet.width;

  // 1. Internal interlocking
  const internalInterlocking = pattern.hasInterlocking ? 95 : 25;

  // 2. Layer interlocking (edge crossing between A and rotated A)
  const crossScore = calculateEdgeCrossingScore(pattern, rotatedPattern);
  const layerInterlocking = Math.round(Math.min(crossScore * 120, 100));

  // 3. Support area
  const supportAB = calculateLayerSupport(rotatedPattern, pattern);
  const supportBA = calculateLayerSupport(pattern, rotatedPattern);
  const avgSupport = (supportAB + supportBA) / 2;
  const supportArea = Math.round(avgSupport * 100);

  // 4. Weight distribution (symmetry)
  const cogA = calculateCOGScore(pattern, pL, pW);
  const cogB = calculateCOGScore(rotatedPattern, pL, pW);
  const weightDistribution = Math.round(((cogA + cogB) / 2) * 100);

  // 5. Center of gravity
  const centerOfGravity = Math.round(((cogA + cogB) / 2) * 100);

  // 6. Height score
  const totalH = layerCount * boxHeight;
  const maxUsable = pallet.maxHeight - pallet.palletHeight;
  const hRatio = totalH / maxUsable;
  const heightScore = hRatio <= 1 ? Math.round((1 - hRatio * 0.25) * 100) : 0;

  // Weighted total
  const total = Math.round(
    internalInterlocking * 0.22 +
    layerInterlocking * 0.18 +
    supportArea * 0.22 +
    weightDistribution * 0.13 +
    centerOfGravity * 0.10 +
    heightScore * 0.15
  );

  let label: string;
  if (total >= 90) label = 'Excelente';
  else if (total >= 80) label = 'Muito Boa';
  else if (total >= 70) label = 'Boa';
  else if (total >= 60) label = 'Aceitável';
  else label = 'Não Recomendada';

  return {
    total: Math.min(100, Math.max(0, total)),
    internalInterlocking,
    layerInterlocking,
    supportArea,
    weightDistribution,
    centerOfGravity,
    heightScore,
    label,
  };
}

// ─── Main Entry Point ────────────────────────────────────────────────

export function calculatePalletization(
  box: BoxDimensions,
  pallet: PalletDimensions = DEFAULT_PALLET
): PalletConfig | null {
  if (box.length <= 0 || box.width <= 0 || box.height <= 0) return null;

  const pL = pallet.length;
  const pW = pallet.width;
  const usableHeight = pallet.maxHeight - pallet.palletHeight;

  // Basic feasibility check
  if (box.height > usableHeight) return null;
  const minBoxDim = Math.min(box.length, box.width);
  const maxPalletDim = Math.max(pL, pW);
  if (minBoxDim > maxPalletDim) return null;

  // Generate candidate patterns
  const candidates = generateAllPatterns(box, pallet);
  if (candidates.length === 0) return null;

  let bestConfig: PalletConfig | null = null;
  let bestRankScore = -Infinity;

  for (const pattern of candidates) {
    if (pattern.boxCount === 0) continue;

    // Create rotated (180°) variant
    const rotated = rotateLayer180(pattern, pL, pW);

    // Layer count
    const maxLayers = Math.floor(usableHeight / box.height);
    if (maxLayers === 0) continue;

    const layerCount = maxLayers;
    const totalHeight = layerCount * box.height;

    // Build alternating layers
    const layers: LayerPattern[] = [];
    for (let i = 0; i < layerCount; i++) {
      layers.push(i % 2 === 0 ? { ...pattern } : { ...rotated });
    }

    // Calculate reliability
    const reliability = calculateReliability(pattern, rotated, pallet, layerCount, box.height);

    // Validation pipeline
    const rejectionReasons: string[] = [];
    let approved = true;

    // 1. Support validation (for multi-layer)
    if (layerCount > 1) {
      const supportAB = checkMinimumSupport(rotated, pattern, 0.70);
      const supportBA = checkMinimumSupport(pattern, rotated, 0.70);

      if (!supportAB.valid) {
        rejectionReasons.push(
          `Apoio estrutural insuficiente: ${(supportAB.worstSupport * 100).toFixed(0)}% (mínimo: 70%)`
        );
        approved = false;
      }
      if (!supportBA.valid) {
        rejectionReasons.push(
          `Apoio na camada invertida insuficiente: ${(supportBA.worstSupport * 100).toFixed(0)}% (mínimo: 70%)`
        );
        approved = false;
      }
    }

    // 2. Coverage validation
    if (pattern.coverage < 0.50) {
      rejectionReasons.push(`Aproveitamento inferior a 50% (${(pattern.coverage * 100).toFixed(1)}%)`);
      approved = false;
    }

    // 3. Height validation
    if (totalHeight > usableHeight + 0.01) {
      rejectionReasons.push('Altura máxima excedida');
      approved = false;
    }

    // 4. Reliability validation
    if (reliability.total < 40) {
      rejectionReasons.push(`Índice de confiabilidade muito baixo (${reliability.total})`);
      approved = false;
    }

    const totalBoxes = pattern.boxCount * layerCount;
    const utilization = pattern.coverage;

    // Ranking: prioritize approved configs, then reliability, then utilization
    // Priority: Security > Stability > Weight distribution > Operability > Utilization > Quantity
    const rankScore =
      (approved ? 100000 : 0) +
      reliability.total * 500 +
      (pattern.hasInterlocking ? 5000 : 0) +
      utilization * 200 +
      totalBoxes * 0.5;

    if (rankScore > bestRankScore) {
      bestRankScore = rankScore;
      bestConfig = {
        layers,
        totalBoxes,
        totalHeight,
        layerCount,
        reliability,
        utilization,
        approved,
        rejectionReasons,
      };
    }
  }

  return bestConfig;
}

export { DEFAULT_PALLET };
