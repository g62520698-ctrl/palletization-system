/**
 * CargaCerta v2 - Motor de Projeção Isométrica
 * 
 * Sistema de renderização isométrica por SVG dedicado à visualização
 * de pallets e caixas. Consome exclusivamente os dados do algoritmo
 * de paletização sem recalcular posições.
 * 
 * Coordenadas do mundo real:
 *   X → largura (esquerda para direita)
 *   Y → comprimento (frente para trás)
 *   Z → altura (baixo para cima)
 * 
 * Câmera: posição definida por (rotY, tilt)
 *   rotY  → rotação horizontal em torno do eixo Z
 *   tilt  → inclinação vertical (0 = frontal, π/2 = vista superior)
 * 
 * Profundidade (depth): representa a distância ao longo da direção
 * de visão. Valores MENORES = mais distante da câmera (desenhado primeiro).
 * Valores MAIORES = mais próximo da câmera (desenhado por último, sobre os demais).
 */

// ===== Tipos =====

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
  depth: number;
}

export interface Face3D {
  vertices: Point3D[];
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  depth: number;
  group?: string;
}

export interface RenderedFace {
  points: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  depth: number;
  group?: string;
}

// ===== Projeção =====

/**
 * Projeta um ponto 3D para coordenadas de tela 2D.
 * 
 * A profundidade (depth) é calculada como a distância ao longo da
 * direção da câmera. O algoritmo do pintor ordena por depth
 * crescente (menor = mais longe = desenhado primeiro).
 * 
 * Fórmula corrigida: depth = -(y1·cosT - z1·sinT)
 * Isto garante que:
 *   - Na vista isométrica: caixas traseiras são desenhadas primeiro
 *   - Na vista superior: camadas inferiores são desenhadas primeiro
 *   - Na vista frontal: caixas distantes são desenhadas primeiro
 */
export function projectPoint(point: Point3D, rotY: number, tilt: number): Point2D {
  const { x, y, z } = point;
  const cosR = Math.cos(rotY);
  const sinR = Math.sin(rotY);
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  // Rotação horizontal (em torno do eixo Z)
  const x1 = x * cosR - y * sinR;
  const y1 = x * sinR + y * cosR;
  const z1 = z;

  // Projeção com inclinação
  const screenX = x1;
  const screenY = -(y1 * sinT + z1 * cosT);

  // Profundidade corrigida: negativa da fórmula original
  // Garante que objetos mais próximos da câmera tenham depth MAIOR
  // e sejam desenhados POR ÚLTIMO (sobre os objetos distantes)
  const depth = -(y1 * cosT - z1 * sinT);

  return { x: screenX, y: screenY, depth };
}

/**
 * Transforma um ponto 3D para coordenadas SVG de tela
 */
export function worldToScreen(
  point: Point3D,
  rotY: number,
  tilt: number,
  scale: number,
  offsetX: number,
  offsetY: number
): Point2D {
  const p = projectPoint(point, rotY, tilt);
  return {
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
    depth: p.depth,
  };
}

// ===== Visibilidade de Faces =====

/**
 * Verifica se uma face é visível dado o vetor normal e os ângulos de câmera.
 * Uma face é visível quando sua normal aponta para a câmera.
 */
export function isFaceVisible(
  nx: number, ny: number, nz: number,
  rotY: number, tilt: number
): boolean {
  const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

  // Direção da câmera no espaço do mundo (aponta da câmera para a cena)
  const camDirX = sinR * cosT;
  const camDirY = cosR * cosT;
  const camDirZ = -sinT;

  // Face visível se normal aponta PARA a câmera (contra a direção de visão)
  return nx * (-camDirX) + ny * (-camDirY) + nz * (-camDirZ) > 0.001;
}

// ===== Geração de Faces de uma Caixa =====

/**
 * Gera as faces visíveis de uma caixa retangular.
 * 
 * Iluminação direcional simulada:
 *   - Topo: face mais clara (iluminada de cima)
 *   - Direita: face com luminosidade média
 *   - Esquerda: face mais escura (sombra)
 */
export function generateBoxFaces(
  origin: Point3D,
  size: { w: number; d: number; h: number },
  rotY: number,
  tilt: number,
  colors: { top: string; right: string; left: string },
  strokeColor: string,
  group?: string
): Face3D[] {
  const { x: ox, y: oy, z: oz } = origin;
  const { w, d, h } = size;

  // 8 vértices do paralelepípedo
  const v: Point3D[] = [
    { x: ox,     y: oy,     z: oz },     // 0: inferior esquerdo traseiro
    { x: ox + w, y: oy,     z: oz },     // 1: inferior direito traseiro
    { x: ox + w, y: oy + d, z: oz },     // 2: inferior direito frontal
    { x: ox,     y: oy + d, z: oz },     // 3: inferior esquerdo frontal
    { x: ox,     y: oy,     z: oz + h }, // 4: superior esquerdo traseiro
    { x: ox + w, y: oy,     z: oz + h }, // 5: superior direito traseiro
    { x: ox + w, y: oy + d, z: oz + h }, // 6: superior direito frontal
    { x: ox,     y: oy + d, z: oz + h }, // 7: superior esquerdo frontal
  ];

  // 6 faces com vértices, normais e cores de iluminação
  const faceDefs = [
    { idx: [4, 5, 6, 7], nx: 0,  ny: 0,  nz: 1,  color: colors.top },   // Topo (+Z)
    { idx: [0, 3, 2, 1], nx: 0,  ny: 0,  nz: -1, color: colors.left },  // Base (-Z)
    { idx: [1, 2, 6, 5], nx: 1,  ny: 0,  nz: 0,  color: colors.right }, // Direita (+X)
    { idx: [0, 4, 7, 3], nx: -1, ny: 0,  nz: 0,  color: colors.left },  // Esquerda (-X)
    { idx: [3, 7, 6, 2], nx: 0,  ny: 1,  nz: 0,  color: colors.right }, // Frontal (+Y)
    { idx: [0, 1, 5, 4], nx: 0,  ny: -1, nz: 0,  color: colors.left },  // Traseira (-Y)
  ];

  const faces: Face3D[] = [];

  for (const fd of faceDefs) {
    if (!isFaceVisible(fd.nx, fd.ny, fd.nz, rotY, tilt)) continue;

    const vertices = fd.idx.map(i => v[i]);
    const avgDepth = fd.idx.reduce((sum, i) => {
      const p = projectPoint(v[i], rotY, tilt);
      return sum + p.depth;
    }, 0) / 4;

    faces.push({
      vertices,
      fillColor: fd.color,
      strokeColor,
      strokeWidth: 0.6,
      depth: avgDepth,
      group,
    });
  }

  return faces;
}

// ===== Renderização de Faces =====

/**
 * Converte faces 3D em faces renderizáveis 2D
 */
export function renderFaces(
  faces: Face3D[],
  rotY: number,
  tilt: number,
  scale: number,
  offsetX: number,
  offsetY: number
): RenderedFace[] {
  return faces.map(face => {
    const points = face.vertices.map(v => {
      const p = worldToScreen(v, rotY, tilt, scale, offsetX, offsetY);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' ');

    return {
      points,
      fillColor: face.fillColor,
      strokeColor: face.strokeColor,
      strokeWidth: face.strokeWidth,
      depth: face.depth,
      group: face.group,
    };
  });
}

/**
 * Ordena faces pelo algoritmo do pintor (trás para frente).
 * Menor depth = mais distante = desenhado primeiro.
 * Maior depth = mais próximo = desenhado por último (sobre os demais).
 */
export function sortFacesByDepth<T extends { depth: number }>(faces: T[]): T[] {
  return [...faces].sort((a, b) => a.depth - b.depth);
}

// ===== Auto-Centralização =====

/**
 * Calcula escala e offsets para centralizar o modelo no viewport SVG
 */
export function calculateViewport(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  svgWidth: number,
  svgHeight: number,
  zoom: number,
  padding: number = 80
): { scale: number; offsetX: number; offsetY: number } {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const availW = svgWidth - padding * 2;
  const availH = svgHeight - padding * 2;

  const scale = Math.min(availW / rangeX, availH / rangeY) * zoom;
  const offsetX = svgWidth / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const offsetY = svgHeight / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;

  return { scale, offsetX, offsetY };
}

/**
 * Calcula os bounds projetados de um conjunto de pontos 3D
 */
export function getProjectedBounds(
  points: Point3D[],
  rotY: number,
  tilt: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    const proj = projectPoint(p, rotY, tilt);
    minX = Math.min(minX, proj.x);
    maxX = Math.max(maxX, proj.x);
    minY = Math.min(minY, proj.y);
    maxY = Math.max(maxY, proj.y);
  }

  return { minX, maxX, minY, maxY };
}

// ===== Ângulos Pré-definidos =====

export const VIEW_PRESETS = {
  iso:   { rotY: Math.PI / 4,                    tilt: Math.PI / 180 * 35.264, label: 'Isométrica' },
  top:   { rotY: 0,                               tilt: Math.PI / 2 - 0.02,     label: 'Superior' },
  front: { rotY: 0,                               tilt: 0.08,                   label: 'Frontal' },
  side:  { rotY: Math.PI / 2,                     tilt: 0.08,                   label: 'Lateral' },
} as const;

export type ViewPreset = keyof typeof VIEW_PRESETS;
