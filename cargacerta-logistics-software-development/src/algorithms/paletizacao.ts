/**
 * CargaCerta v2 - Algoritmo de Paletização PBR
 * 
 * Algoritmo determinístico de paletização que:
 * 1. Gera um ÚNICO Lastro Mestre (melhor arranjo)
 * 2. Deriva o Padrão B por transformação geométrica (rotação 180°)
 * 3. Alterna camadas A/B/A/B para amarração
 * 
 * Base: Pallet PBR 100×120cm, altura 15cm
 */

// ===== Constantes =====
export const PALLET_WIDTH = 100;   // cm (eixo X)
export const PALLET_LENGTH = 120;  // cm (eixo Y)
export const PALLET_HEIGHT = 15;   // cm

// ===== Tipos =====

export interface LayerBox {
  x: number;       // posição X no pallet
  y: number;       // posição Y no pallet
  w: number;       // largura da caixa no pallet (eixo X)
  l: number;       // comprimento da caixa no pallet (eixo Y)
  orientIdx: number; // índice da orientação (0 ou 1)
}

export interface Layer {
  boxes: LayerBox[];
  quantity: number;
  pattern: 'A' | 'B';
  zIndex: number;   // índice da camada (0 = base)
}

export interface PalletizationResult {
  masterLayer: LayerBox[];
  patternA: LayerBox[];
  patternB: LayerBox[];
  layers: Layer[];
  boxesPerLayer: number;
  totalBoxes: number;
  totalLayers: number;
  totalWeight: number;
  totalHeight: number;
  coverage: number;
  volumeEfficiency: number;
  cogX: number;
  cogY: number;
  stabilityIndex: number;
  interlockingType: string;
  boxDims: { length: number; width: number; height: number; weight: number };
  maxHeight: number;
  maxWeight: number;
}

// ===== Geração do Lastro Mestre =====

interface CandidateArrangement {
  boxes: LayerBox[];
  score: number;
}

/**
 * Gera todas as disposições possíveis para um lastro e seleciona a melhor.
 */
function generateMasterLayer(boxL: number, boxW: number): LayerBox[] {
  const candidates: CandidateArrangement[] = [];

  // Duas orientações básicas da caixa no pallet
  const orientations = [
    { bw: boxL, bl: boxW, idx: 0 }, // Caixa: comprimento ao longo de X, largura ao longo de Y
    { bw: boxW, bl: boxL, idx: 1 }, // Caixa: largura ao longo de X, comprimento ao longo de Y
  ];

  // 1) Arranjos homogêneos (todas as caixas na mesma orientação)
  for (const orient of orientations) {
    const cols = Math.floor(PALLET_WIDTH / orient.bw);
    const rows = Math.floor(PALLET_LENGTH / orient.bl);
    if (cols > 0 && rows > 0) {
      const boxes = createGridBoxes(cols, rows, orient.bw, orient.bl, orient.idx, 0, 0);
      candidates.push({ boxes, score: 0 });
    }
  }

  // 2) Arranjos mistos por linhas (seção 1 com orient A, seção 2 com orient B)
  for (let n1 = 1; n1 <= Math.floor(PALLET_LENGTH / orientations[0].bl); n1++) {
    const usedY = n1 * orientations[0].bl;
    const remainY = PALLET_LENGTH - usedY;
    const n2 = Math.floor(remainY / orientations[1].bl);
    if (n2 > 0) {
      const cols1 = Math.floor(PALLET_WIDTH / orientations[0].bw);
      const cols2 = Math.floor(PALLET_WIDTH / orientations[1].bw);
      const boxes = [
        ...createGridBoxes(cols1, n1, orientations[0].bw, orientations[0].bl, 0, 0, 0),
        ...createGridBoxes(cols2, n2, orientations[1].bw, orientations[1].bl, 1, 0, usedY),
      ];
      candidates.push({ boxes, score: 0 });
    }
  }

  // 3) Arranjos mistos por linhas (seção 1 com orient B, seção 2 com orient A)
  for (let n1 = 1; n1 <= Math.floor(PALLET_LENGTH / orientations[1].bl); n1++) {
    const usedY = n1 * orientations[1].bl;
    const remainY = PALLET_LENGTH - usedY;
    const n2 = Math.floor(remainY / orientations[0].bl);
    if (n2 > 0) {
      const cols1 = Math.floor(PALLET_WIDTH / orientations[1].bw);
      const cols2 = Math.floor(PALLET_WIDTH / orientations[0].bw);
      const boxes = [
        ...createGridBoxes(cols1, n1, orientations[1].bw, orientations[1].bl, 1, 0, 0),
        ...createGridBoxes(cols2, n2, orientations[0].bw, orientations[0].bl, 0, 0, usedY),
      ];
      candidates.push({ boxes, score: 0 });
    }
  }

  // 4) Arranjos mistos por colunas (seção 1 com orient A, seção 2 com orient B)
  for (let n1 = 1; n1 <= Math.floor(PALLET_WIDTH / orientations[0].bw); n1++) {
    const usedX = n1 * orientations[0].bw;
    const remainX = PALLET_WIDTH - usedX;
    const n2 = Math.floor(remainX / orientations[1].bw);
    if (n2 > 0) {
      const rows1 = Math.floor(PALLET_LENGTH / orientations[0].bl);
      const rows2 = Math.floor(PALLET_LENGTH / orientations[1].bl);
      const boxes = [
        ...createGridBoxes(n1, rows1, orientations[0].bw, orientations[0].bl, 0, 0, 0),
        ...createGridBoxes(n2, rows2, orientations[1].bw, orientations[1].bl, 1, usedX, 0),
      ];
      candidates.push({ boxes, score: 0 });
    }
  }

  // 5) Arranjos mistos por colunas (seção 1 com orient B, seção 2 com orient A)
  for (let n1 = 1; n1 <= Math.floor(PALLET_WIDTH / orientations[1].bw); n1++) {
    const usedX = n1 * orientations[1].bw;
    const remainX = PALLET_WIDTH - usedX;
    const n2 = Math.floor(remainX / orientations[0].bw);
    if (n2 > 0) {
      const rows1 = Math.floor(PALLET_LENGTH / orientations[1].bl);
      const rows2 = Math.floor(PALLET_LENGTH / orientations[0].bl);
      const boxes = [
        ...createGridBoxes(n1, rows1, orientations[1].bw, orientations[1].bl, 1, 0, 0),
        ...createGridBooks(n2, rows2, orientations[0].bw, orientations[0].bl, 0, usedX, 0),
      ];
      candidates.push({ boxes, score: 0 });
    }
  }

  // Pontuar e selecionar o melhor arranjo
  for (const candidate of candidates) {
    candidate.score = scoreArrangement(candidate.boxes);
  }

  candidates.sort((a, b) => b.score - a.score);
  
  return candidates.length > 0 ? candidates[0].boxes : [];
}

/**
 * Cria caixas em formato de grade
 */
function createGridBoxes(
  cols: number,
  rows: number,
  bw: number,
  bl: number,
  orientIdx: number,
  offsetX: number,
  offsetY: number
): LayerBox[] {
  const boxes: LayerBox[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      boxes.push({
        x: offsetX + c * bw,
        y: offsetY + r * bl,
        w: bw,
        l: bl,
        orientIdx,
      });
    }
  }
  return boxes;
}

/**
 * Alias para corrigir nome no passo 5
 */
function createGridBooks(
  cols: number,
  rows: number,
  bw: number,
  bl: number,
  orientIdx: number,
  offsetX: number,
  offsetY: number
): LayerBox[] {
  return createGridBoxes(cols, rows, bw, bl, orientIdx, offsetX, offsetY);
}

/**
 * Pontuação composta do arranjo.
 * Prioridade: quantidade > cobertura > centro de gravidade > estabilidade
 */
function scoreArrangement(boxes: LayerBox[]): number {
  if (boxes.length === 0) return -Infinity;

  const quantity = boxes.length;
  const totalBoxArea = boxes.reduce((sum, b) => sum + b.w * b.l, 0);
  const palletArea = PALLET_WIDTH * PALLET_LENGTH;
  const coverage = totalBoxArea / palletArea;

  // Centro de gravidade
  const cogX = boxes.reduce((sum, b) => sum + b.x + b.w / 2, 0) / quantity;
  const cogY = boxes.reduce((sum, b) => sum + b.y + b.l / 2, 0) / quantity;
  const idealCx = PALLET_WIDTH / 2;
  const idealCy = PALLET_LENGTH / 2;
  const cogDist = Math.sqrt((cogX - idealCx) ** 2 + (cogY - idealCy) ** 2);
  const maxCogDist = Math.sqrt(idealCx ** 2 + idealCy ** 2);
  const cogScore = 1 - cogDist / maxCogDist;

  // Score composto: quantidade domina, cobertura e COG desempatam
  return quantity * 10000 + coverage * 100 + cogScore * 10;
}

// ===== Geração do Padrão B =====

/**
 * Gera o Padrão B a partir do Padrão A (Lastro Mestre)
 * usando rotação de 180° em torno do centro do pallet.
 * 
 * Mantém: mesma quantidade, mesma ocupação, mesmo formato,
 * mesmos espaços vazios, mesmo centro de gravidade.
 */
function generatePatternB(patternA: LayerBox[]): LayerBox[] {
  return patternA.map((box) => ({
    x: PALLET_WIDTH - box.x - box.w,
    y: PALLET_LENGTH - box.y - box.l,
    w: box.w,
    l: box.l,
    orientIdx: box.orientIdx,
  }));
}

// ===== Cálculo de Estabilidade =====

/**
 * Calcula o índice de estabilidade (0-100)
 * Considera: cobertura, distribuição de peso, COG, altura, amarração
 */
function calculateStabilityIndex(
  coverage: number,
  cogX: number,
  cogY: number,
  totalHeight: number,
  totalLayers: number
): number {
  // 1) Cobertura da base (0-25 pontos)
  const coverageScore = Math.min(25, (coverage / 100) * 25);

  // 2) Distribuição de peso / COG (0-25 pontos)
  const idealCx = PALLET_WIDTH / 2;
  const idealCy = PALLET_LENGTH / 2;
  const cogDist = Math.sqrt((cogX - idealCx) ** 2 + (cogY - idealCy) ** 2);
  const maxCogDist = Math.sqrt(idealCx ** 2 + idealCy ** 2);
  const weightScore = Math.max(0, (1 - cogDist / maxCogDist)) * 25;

  // 3) Relação altura/base (0-25 pontos)
  const baseMin = Math.min(PALLET_WIDTH, PALLET_LENGTH);
  const ratio = totalHeight / baseMin;
  const heightScore = Math.max(0, (1 - ratio / 2.5)) * 25;

  // 4) Qualidade da amarração (0-25 pontos)
  const interlockScore = totalLayers > 1 ? 25 : 15;

  return Math.round(
    Math.min(100, Math.max(0, coverageScore + weightScore + heightScore + interlockScore))
  );
}

// ===== Função Principal =====

/**
 * Calcula a paletização completa para o pallet PBR.
 */
export function calculatePalletization(
  boxLength: number,
  boxWidth: number,
  boxHeight: number,
  boxWeight: number,
  maxHeight: number,
  maxWeight: number
): PalletizationResult | null {
  if (boxLength <= 0 || boxWidth <= 0 || boxHeight <= 0 || boxWeight <= 0) return null;
  if (maxHeight <= PALLET_HEIGHT || maxWeight <= 0) return null;

  // Verificar se a caixa cabe no pallet em pelo menos uma orientação
  const fitsOrient1 = boxLength <= PALLET_WIDTH && boxWidth <= PALLET_LENGTH;
  const fitsOrient2 = boxWidth <= PALLET_WIDTH && boxLength <= PALLET_LENGTH;
  if (!fitsOrient1 && !fitsOrient2) return null;

  // Etapa 1: Gerar o Lastro Mestre
  const masterLayer = generateMasterLayer(boxLength, boxWidth);
  if (masterLayer.length === 0) return null;

  // Etapa 2: Gerar Padrão B (rotação 180°)
  const patternA = [...masterLayer];
  const patternB = generatePatternB(masterLayer);

  // Etapa 3: Calcular número de camadas
  const availableHeight = maxHeight - PALLET_HEIGHT;
  const layersByHeight = Math.floor(availableHeight / boxHeight);
  const layersByWeight = Math.floor(maxWeight / (masterLayer.length * boxWeight));
  const totalLayers = Math.max(1, Math.min(layersByHeight, layersByWeight));

  if (totalLayers <= 0) return null;

  // Etapa 4: Montar camadas A/B/A/B
  const layers: Layer[] = [];
  for (let i = 0; i < totalLayers; i++) {
    layers.push({
      boxes: i % 2 === 0 ? patternA : patternB,
      quantity: masterLayer.length,
      pattern: i % 2 === 0 ? 'A' : 'B',
      zIndex: i,
    });
  }

  // Cálculos finais
  const boxesPerLayer = masterLayer.length;
  const totalBoxes = boxesPerLayer * totalLayers;
  const totalWeight = totalBoxes * boxWeight;
  const totalHeight = PALLET_HEIGHT + totalLayers * boxHeight;

  // Cobertura
  const boxArea = masterLayer.reduce((sum, b) => sum + b.w * b.l, 0);
  const palletArea = PALLET_WIDTH * PALLET_LENGTH;
  const coverage = (boxArea / palletArea) * 100;

  // Eficiência volumétrica
  const boxVol = boxLength * boxWidth * boxHeight;
  const usedVol = totalBoxes * boxVol;
  const palletVol = PALLET_WIDTH * PALLET_LENGTH * availableHeight;
  const volumeEfficiency = palletVol > 0 ? (usedVol / palletVol) * 100 : 0;

  // Centro de gravidade (X, Y)
  const cogX = masterLayer.reduce((sum, b) => sum + b.x + b.w / 2, 0) / boxesPerLayer;
  const cogY = masterLayer.reduce((sum, b) => sum + b.y + b.l / 2, 0) / boxesPerLayer;

  // Índice de estabilidade
  const stabilityIndex = calculateStabilityIndex(coverage, cogX, cogY, totalHeight, totalLayers);

  return {
    masterLayer,
    patternA,
    patternB,
    layers,
    boxesPerLayer,
    totalBoxes,
    totalLayers,
    totalWeight,
    totalHeight,
    coverage,
    volumeEfficiency,
    cogX,
    cogY,
    stabilityIndex,
    interlockingType: 'Rotação 180°',
    boxDims: { length: boxLength, width: boxWidth, height: boxHeight, weight: boxWeight },
    maxHeight,
    maxWeight,
  };
}
