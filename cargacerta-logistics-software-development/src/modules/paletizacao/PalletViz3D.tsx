/**
 * CargaCerta v2 - Visualização 3D Isométrica Profissional do Pallet
 * 
 * Renderização isométrica SVG fiel aos cálculos do algoritmo.
 * 
 * REGRAS FUNDAMENTAIS:
 * 1. O renderizador NUNCA recalcula posições — apenas consome dados do algoritmo
 * 2. Cada caixa usa coordenadas exatas (X, Y, Z) do resultado
 * 3. O padrão A/B da visualização 3D é IDÊNTICO ao da visualização 2D
 * 4. A vista superior mostra o TOPO do pallet (última camada), nunca a base
 * 
 * Correção crítica: a fórmula de profundidade (depth) foi corrigida
 * no motor isométrico para garantir que o algoritmo do pintor ordene
 * corretamente em todas as vistas.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { PalletizationResult } from '@/algorithms/paletizacao';
import { PALLET_WIDTH, PALLET_LENGTH, PALLET_HEIGHT } from '@/algorithms/paletizacao';
import {
  worldToScreen,
  generateBoxFaces,
  renderFaces,
  sortFacesByDepth,
  calculateViewport,
  getProjectedBounds,
  VIEW_PRESETS,
  type Point3D,
  type Face3D,
  type ViewPreset,
} from '@/utils/isometric';
import styles from './PaletizacaoModule.module.css';

// ===== Paleta de Cores =====

const PALETTE = {
  // Pallet PBR - madeira realista
  pallet: {
    deckTop:     { top: '#d4a853', right: '#c08d30', left: '#a67520' },
    deckBottom:  { top: '#b88035', right: '#9c6a22', left: '#825816' },
    stringer:    { top: '#b88035', right: '#9c6a22', left: '#825816' },
    block:       { top: '#c49040', right: '#a87525', left: '#8e6118' },
    edge:        '#7a5a14',
  },
  // Padrão A — Azul (Lastro Mestre original)
  patternA: {
    top:    '#60a5fa',
    right:  '#3b82f6',
    left:   '#1d4ed8',
    stroke: '#1e3a8a',
  },
  // Padrão B — Laranja (Rotação 180° do Lastro Mestre)
  patternB: {
    top:    '#fb923c',
    right:  '#f97316',
    left:   '#c2410c',
    stroke: '#7c2d12',
  },
  // Anotações
  annotation: {
    line:  '#6b7280',
    text:  '#374151',
    axisX: '#ef4444',
    axisY: '#22c55e',
    axisZ: '#3b82f6',
    cog:   '#7c3aed',
  },
};

// ===== Props =====

interface Props {
  result: PalletizationResult;
}

// ===== Componente Principal =====

export default function PalletViz3D({ result }: Props) {
  // Estado de navegação
  const [rotation, setRotation] = useState(45);
  const [preset, setPreset] = useState<ViewPreset>('iso');
  const [zoom, setZoom] = useState(1);
  const [showAxes, setShowAxes] = useState(true);
  const [showMeasures, setShowMeasures] = useState(true);
  const [showCOG, setShowCOG] = useState(true);

  const { layers, boxDims, totalHeight, totalLayers } = result;
  const boxH = boxDims.height;

  // Calcular ângulos
  const rotY = (rotation * Math.PI) / 180;
  const tilt = preset === 'iso'
    ? Math.PI / 180 * 35.264
    : preset === 'top'
    ? Math.PI / 2 - 0.02     // Vista superior — vê o TOPO da carga
    : 0.08;                   // Vistas frontais com leve inclinação

  const svgW = 720;
  const svgH = 600;

  // Calcular viewport — centralizar automaticamente
  const { scale, offsetX, offsetY } = useMemo(() => {
    const corners: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: PALLET_WIDTH, y: 0, z: 0 },
      { x: 0, y: PALLET_LENGTH, z: 0 },
      { x: PALLET_WIDTH, y: PALLET_LENGTH, z: 0 },
      { x: 0, y: 0, z: totalHeight },
      { x: PALLET_WIDTH, y: 0, z: totalHeight },
      { x: 0, y: PALLET_LENGTH, z: totalHeight },
      { x: PALLET_WIDTH, y: PALLET_LENGTH, z: totalHeight },
    ];
    const bounds = getProjectedBounds(corners, rotY, tilt);
    return calculateViewport(bounds, svgW, svgH, zoom, 90);
  }, [totalHeight, rotY, tilt, zoom]);

  // Helper: ponto 3D → tela
  const toScreen = useCallback(
    (p: Point3D) => worldToScreen(p, rotY, tilt, scale, offsetX, offsetY),
    [rotY, tilt, scale, offsetX, offsetY]
  );

  // ===== Gerar todas as faces do modelo 3D =====
  const allFaces = useMemo(() => {
    const faces: Face3D[] = [];

    // ── Pallet PBR realista ──
    const deckH = 2;
    const gap = 0.8;
    const blockH = PALLET_HEIGHT - deckH * 2;

    // Deckboards inferiores (base do pallet)
    const baseBoardW = 10;
    const baseBoardCount = Math.floor((PALLET_LENGTH + gap) / (baseBoardW + gap));
    for (let di = 0; di < baseBoardCount; di++) {
      const dy = di * (baseBoardW + gap);
      if (dy + baseBoardW > PALLET_LENGTH) break;
      faces.push(...generateBoxFaces(
        { x: 0, y: dy, z: 0 },
        { w: PALLET_WIDTH, d: baseBoardW, h: deckH },
        rotY, tilt,
        PALETTE.pallet.deckBottom,
        PALETTE.pallet.edge,
        'pallet-base'
      ));
    }

    // 3 Longarinas (stringers)
    const stringerW = 8;
    const stringerXPos = [0, (PALLET_WIDTH - stringerW) / 2, PALLET_WIDTH - stringerW];
    for (const sx of stringerXPos) {
      faces.push(...generateBoxFaces(
        { x: sx, y: 0, z: deckH },
        { w: stringerW, d: PALLET_LENGTH, h: blockH },
        rotY, tilt,
        PALETTE.pallet.stringer,
        PALETTE.pallet.edge,
        'pallet-stringer'
      ));
    }

    // 9 Blocos (3×3)
    const blockW = 10, blockD = 10;
    const blockXPos = [5, (PALLET_WIDTH - blockW) / 2, PALLET_WIDTH - blockW - 5];
    const blockYPos = [5, (PALLET_LENGTH - blockD) / 2, PALLET_LENGTH - blockD - 5];
    for (const bx of blockXPos) {
      for (const by of blockYPos) {
        faces.push(...generateBoxFaces(
          { x: bx, y: by, z: deckH },
          { w: blockW, d: blockD, h: blockH },
          rotY, tilt,
          PALETTE.pallet.block,
          PALETTE.pallet.edge,
          'pallet-block'
        ));
      }
    }

    // Deckboards superiores
    const deckBoardW = 10;
    const deckBoardCount = Math.floor((PALLET_LENGTH + gap) / (deckBoardW + gap));
    for (let di = 0; di < deckBoardCount; di++) {
      const dy = di * (deckBoardW + gap);
      if (dy + deckBoardW > PALLET_LENGTH) break;
      faces.push(...generateBoxFaces(
        { x: 0, y: dy, z: PALLET_HEIGHT - deckH },
        { w: PALLET_WIDTH, d: deckBoardW, h: deckH },
        rotY, tilt,
        PALETTE.pallet.deckTop,
        PALETTE.pallet.edge,
        'pallet-deck'
      ));
    }

    // ── Caixas por camada ──
    // Coordenadas Z exatas: PALLET_HEIGHT + (índice da camada × altura da caixa)
    // Isto garante que cada camada inicia exatamente onde a anterior termina
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const zBase = PALLET_HEIGHT + li * boxH;
      const isA = layer.pattern === 'A';
      const palette = isA ? PALETTE.patternA : PALETTE.patternB;

      for (let bi = 0; bi < layer.boxes.length; bi++) {
        const box = layer.boxes[bi];
        // Coordenadas EXATAS do algoritmo:
        //   box.x → posição X no pallet
        //   box.y → posição Y no pallet
        //   box.w → largura da caixa (eixo X)
        //   box.l → comprimento da caixa (eixo Y)
        //   zBase → base Z calculada a partir do índice da camada
        faces.push(...generateBoxFaces(
          { x: box.x, y: box.y, z: zBase },
          { w: box.w, d: box.l, h: boxH },
          rotY, tilt,
          { top: palette.top, right: palette.right, left: palette.left },
          palette.stroke,
          `layer-${li}-box-${bi}`
        ));
      }
    }

    return faces;
  }, [layers, boxH, rotY, tilt]);

  // ===== Renderizar e ordenar faces =====
  const renderedFaces = useMemo(() => {
    const rendered = renderFaces(allFaces, rotY, tilt, scale, offsetX, offsetY);
    return sortFacesByDepth(rendered);
  }, [allFaces, rotY, tilt, scale, offsetX, offsetY]);

  // ===== Sombra no chão =====
  const shadowPoints = useMemo(() => {
    const corners: Point3D[] = [
      { x: -3, y: -3, z: 0 },
      { x: PALLET_WIDTH + 3, y: -3, z: 0 },
      { x: PALLET_WIDTH + 3, y: PALLET_LENGTH + 3, z: 0 },
      { x: -3, y: PALLET_LENGTH + 3, z: 0 },
    ];
    return corners.map(c => {
      const p = toScreen(c);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' ');
  }, [toScreen]);

  // ===== Handlers =====
  const handleRotate = (deg: number) => {
    setRotation(prev => ((prev + deg) % 360 + 360) % 360);
    setPreset('iso');
  };

  const handlePreset = (p: ViewPreset) => {
    setPreset(p);
    if (p === 'iso') setRotation(45);
    else if (p === 'top') setRotation(0);
    else if (p === 'front') setRotation(0);
    else if (p === 'side') setRotation(90);
  };

  const handleZoom = (delta: number) => {
    setZoom(z => Math.max(0.3, Math.min(3, z + delta)));
  };

  const handleReset = () => {
    setRotation(45);
    setPreset('iso');
    setZoom(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0, flex: '1 1 auto' }}>
      {/* ═══ Barra de Controles ═══ */}
      <div className={styles.viz3dControls}>
        <div className={styles.ctrlGroup}>
          <span className={styles.ctrlLabel}>Rot</span>
          <button className={styles.ctrlBtn} onClick={() => handleRotate(-90)}>↶ 90°</button>
          <button className={styles.ctrlBtn} onClick={() => handleRotate(-45)}>↶</button>
          <button className={styles.ctrlBtn} onClick={() => handleRotate(45)}>↷</button>
          <button className={styles.ctrlBtn} onClick={() => handleRotate(90)}>90° ↷</button>
        </div>

        <div className={styles.ctrlGroup}>
          <span className={styles.ctrlLabel}>Vista</span>
          {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map(p => (
            <button key={p}
              className={`${styles.ctrlBtn} ${preset === p ? styles.ctrlBtnActive : ''}`}
              onClick={() => handlePreset(p)}
            >
              {VIEW_PRESETS[p].label}
            </button>
          ))}
        </div>

        <div className={styles.ctrlGroup}>
          <span className={styles.ctrlLabel}>Zoom</span>
          <button className={styles.ctrlBtn} onClick={() => handleZoom(-0.15)}>−</button>
          <span className={styles.ctrlZoomVal}>{Math.round(zoom * 100)}%</span>
          <button className={styles.ctrlBtn} onClick={() => handleZoom(0.15)}>+</button>
        </div>

        <div className={styles.ctrlGroup}>
          <button className={`${styles.ctrlBtn} ${showAxes ? styles.ctrlBtnActive : ''}`}
            onClick={() => setShowAxes(v => !v)} title="Eixos">📐</button>
          <button className={`${styles.ctrlBtn} ${showMeasures ? styles.ctrlBtnActive : ''}`}
            onClick={() => setShowMeasures(v => !v)} title="Medidas">📏</button>
          <button className={`${styles.ctrlBtn} ${showCOG ? styles.ctrlBtnActive : ''}`}
            onClick={() => setShowCOG(v => !v)} title="Centro de Gravidade">⊕</button>
          <button className={styles.ctrlBtn} onClick={handleReset} title="Resetar">🔄</button>
        </div>
      </div>

      {/* ═══ Área SVG ═══ */}
      <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '100%' }}>
          {/* Fundo */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#f8f9fb" rx={8} />

          {/* Grade sutil */}
          <pattern id="palletGrid" width={20} height={20} patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth={0.3} />
          </pattern>
          <rect x={0} y={0} width={svgW} height={svgH} fill="url(#palletGrid)" rx={8} opacity={0.4} />

          {/* Sombra no chão */}
          <polygon points={shadowPoints} fill="rgba(0,0,0,0.05)" />

          {/* Faces renderizadas (ordenadas por profundidade) */}
          {renderedFaces.map((face, i) => (
            <polygon key={i} points={face.points} fill={face.fillColor}
              stroke={face.strokeColor} strokeWidth={face.strokeWidth}
              strokeLinejoin="round" />
          ))}

          {/* Centro de gravidade */}
          {showCOG && renderCOG(toScreen, result)}

          {/* Eixos */}
          {showAxes && renderAxes(toScreen)}

          {/* Medidas */}
          {showMeasures && renderMeasurements(toScreen, result)}

          {/* Legenda */}
          {renderLegend(svgW, totalLayers)}

          {/* Indicador de rotação */}
          <g transform={`translate(20, ${svgH - 28})`}>
            <rect x={0} y={0} width={58} height={20} fill="white" stroke="#d1d5db" rx={4} opacity={0.9} />
            <text x={29} y={14} textAnchor="middle" fontSize={9} fill="#64748b" fontWeight={600}>{rotation}°</text>
          </g>
        </svg>
      </div>
    </div>
  );
}

// ===== Sub-componentes de Renderização =====

/** Eixos X, Y, Z */
function renderAxes(toScreen: (p: Point3D) => { x: number; y: number }) {
  const axisLen = 20;
  const o = toScreen({ x: 0, y: 0, z: 0 });
  const xE = toScreen({ x: axisLen, y: 0, z: 0 });
  const yE = toScreen({ x: 0, y: axisLen, z: 0 });
  const zE = toScreen({ x: 0, y: 0, z: axisLen });

  return (
    <g opacity={0.55}>
      <line x1={o.x} y1={o.y} x2={xE.x} y2={xE.y} stroke={PALETTE.annotation.axisX} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={o.x} y1={o.y} x2={yE.x} y2={yE.y} stroke={PALETTE.annotation.axisY} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={o.x} y1={o.y} x2={zE.x} y2={zE.y} stroke={PALETTE.annotation.axisZ} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={o.x} cy={o.y} r={2.5} fill="#334155" />
      <text x={xE.x + 8} y={xE.y + 2} fontSize={10} fill={PALETTE.annotation.axisX} fontWeight={700}>X</text>
      <text x={yE.x + 8} y={yE.y + 2} fontSize={10} fill={PALETTE.annotation.axisY} fontWeight={700}>Y</text>
      <text x={zE.x + 8} y={zE.y + 2} fontSize={10} fill={PALETTE.annotation.axisZ} fontWeight={700}>Z</text>
    </g>
  );
}

/** Linhas de medida */
function renderMeasurements(
  toScreen: (p: Point3D) => { x: number; y: number },
  result: PalletizationResult
) {
  const elements: React.ReactElement[] = [];

  // Largura (X)
  const wL = toScreen({ x: 0, y: 0, z: PALLET_HEIGHT + 4 });
  const wR = toScreen({ x: PALLET_WIDTH, y: 0, z: PALLET_HEIGHT + 4 });
  const wM = toScreen({ x: PALLET_WIDTH / 2, y: 0, z: PALLET_HEIGHT + 12 });
  elements.push(
    <g key="w" opacity={0.75}>
      <line x1={wL.x} y1={wL.y} x2={wR.x} y2={wR.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <line x1={wL.x} y1={wL.y - 4} x2={wL.x} y2={wL.y + 4} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <line x1={wR.x} y1={wR.y - 4} x2={wR.x} y2={wR.y + 4} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <text x={wM.x} y={wM.y} textAnchor="middle" fontSize={10} fill={PALETTE.annotation.text} fontWeight={600}>
        {PALLET_WIDTH} cm
      </text>
    </g>
  );

  // Comprimento (Y)
  const dF = toScreen({ x: -4, y: 0, z: PALLET_HEIGHT });
  const dB = toScreen({ x: -4, y: PALLET_LENGTH, z: PALLET_HEIGHT });
  const dM = toScreen({ x: -16, y: PALLET_LENGTH / 2, z: PALLET_HEIGHT });
  elements.push(
    <g key="d" opacity={0.75}>
      <line x1={dF.x} y1={dF.y} x2={dB.x} y2={dB.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <line x1={dF.x - 4} y1={dF.y} x2={dF.x + 4} y2={dF.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <line x1={dB.x - 4} y1={dB.y} x2={dB.x + 4} y2={dB.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <text x={dM.x} y={dM.y} textAnchor="middle" fontSize={10} fill={PALETTE.annotation.text} fontWeight={600}>
        {PALLET_LENGTH} cm
      </text>
    </g>
  );

  // Altura total (Z)
  const hB = toScreen({ x: PALLET_WIDTH + 5, y: 0, z: 0 });
  const hT = toScreen({ x: PALLET_WIDTH + 5, y: 0, z: result.totalHeight });
  const hM = toScreen({ x: PALLET_WIDTH + 18, y: 0, z: result.totalHeight / 2 });
  elements.push(
    <g key="h" opacity={0.75}>
      <line x1={hB.x} y1={hB.y} x2={hT.x} y2={hT.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} strokeDasharray="4,3" />
      <line x1={hB.x - 4} y1={hB.y} x2={hB.x + 4} y2={hB.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <line x1={hT.x - 4} y1={hT.y} x2={hT.x + 4} y2={hT.y} stroke={PALETTE.annotation.line} strokeWidth={0.8} />
      <text x={hM.x} y={hM.y} textAnchor="middle" fontSize={10} fill={PALETTE.annotation.text} fontWeight={600}>
        {result.totalHeight} cm
      </text>
    </g>
  );

  // Marcas de camadas
  if (result.totalLayers <= 10) {
    for (let li = 0; li < result.totalLayers; li++) {
      const zLevel = PALLET_HEIGHT + li * result.boxDims.height;
      const mkL = toScreen({ x: PALLET_WIDTH + 3, y: 0, z: zLevel });
      const mkR = toScreen({ x: PALLET_WIDTH + 7, y: 0, z: zLevel });
      elements.push(
        <g key={`lm-${li}`} opacity={0.35}>
          <line x1={mkL.x} y1={mkL.y} x2={mkR.x} y2={mkR.y}
            stroke={PALETTE.annotation.line} strokeWidth={0.6} />
        </g>
      );
    }
  }

  return <g>{elements}</g>;
}

/** Centro de gravidade */
function renderCOG(
  toScreen: (p: Point3D) => { x: number; y: number },
  result: PalletizationResult
) {
  const cogZ = PALLET_HEIGHT + (result.totalLayers * result.boxDims.height) / 2;
  const cogPt = toScreen({ x: result.cogX, y: result.cogY, z: cogZ });
  const groundPt = toScreen({ x: result.cogX, y: result.cogY, z: 0 });

  return (
    <g opacity={0.7}>
      {/* Linha vertical do CG */}
      <line x1={cogPt.x} y1={cogPt.y} x2={groundPt.x} y2={groundPt.y}
        stroke={PALETTE.annotation.cog} strokeWidth={1} strokeDasharray="4,3" />
      {/* Marcador no topo */}
      <circle cx={cogPt.x} cy={cogPt.y} r={4.5} fill={PALETTE.annotation.cog} stroke="white" strokeWidth={1.5} />
      <circle cx={cogPt.x} cy={cogPt.y} r={1.5} fill="white" />
      {/* Marcador no piso */}
      <circle cx={groundPt.x} cy={groundPt.y} r={3} fill={PALETTE.annotation.cog} fillOpacity={0.3} stroke={PALETTE.annotation.cog} strokeWidth={0.6} />
      {/* Label */}
      <text x={cogPt.x + 10} y={cogPt.y - 3} fontSize={8} fill={PALETTE.annotation.cog} fontWeight={700}>
        CG ({result.cogX.toFixed(0)}, {result.cogY.toFixed(0)})
      </text>
    </g>
  );
}

/** Legenda de amarração A/B */
function renderLegend(svgW: number, totalLayers: number) {
  return (
    <g transform={`translate(${svgW - 162}, 12)`}>
      <rect x={0} y={0} width={150} height={90} fill="white" stroke="#d1d5db" rx={6} opacity={0.94} />

      <text x={12} y={18} fontSize={10} fill="#1e293b" fontWeight={700} letterSpacing="0.05em">AMARRAÇÃO</text>
      <text x={12} y={30} fontSize={8} fill="#6b7280">{totalLayers} camadas · A/B alternado</text>

      {/* Padrão A */}
      <rect x={12} y={40} width={18} height={13} fill={PALETTE.patternA.top} stroke={PALETTE.patternA.stroke} strokeWidth={0.6} rx={2} />
      <rect x={30} y={40} width={18} height={13} fill={PALETTE.patternA.right} stroke={PALETTE.patternA.stroke} strokeWidth={0.6} rx={2} />
      <text x={54} y={50} fontSize={10} fill="#1e293b" fontWeight={600}>Padrão A</text>
      <text x={54} y={60} fontSize={8} fill="#6b7280">Lastro Mestre</text>

      {/* Padrão B */}
      <rect x={12} y={68} width={18} height={13} fill={PALETTE.patternB.top} stroke={PALETTE.patternB.stroke} strokeWidth={0.6} rx={2} />
      <rect x={30} y={68} width={18} height={13} fill={PALETTE.patternB.right} stroke={PALETTE.patternB.stroke} strokeWidth={0.6} rx={2} />
      <text x={54} y={78} fontSize={10} fill="#1e293b" fontWeight={600}>Padrão B</text>
      <text x={54} y={88} fontSize={8} fill="#6b7280">Rotação 180°</text>

      {/* Seta de intertravamento */}
      <line x1={115} y1={53} x2={115} y2={68} stroke="#9ca3af" strokeWidth={1} />
      <polygon points="111,68 115,75 119,68" fill="#9ca3af" />
      <text x={130} y={66} fontSize={8} fill="#6b7280" fontWeight={700}>A/B</text>
    </g>
  );
}
