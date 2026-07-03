/**
 * CargaCerta v2 - Visualização 3D Isométrica do Endereçamento
 * 
 * Renderização isométrica SVG profissional que mostra claramente:
 * - Quantidade de caixas por coluna, linha e nível
 * - Preenchimento completo do endereço
 * - Espaços vazios restantes
 * - Sobreposição correta entre camadas
 * - Proporções reais das caixas
 * 
 * Consome exclusivamente os dados do algoritmo sem recalcular.
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { AddressingResult } from '@/algorithms/enderecamento';
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
import styles from './EnderecamentoModule.module.css';

interface Props {
  result: AddressingResult;
}

// Cores por camada Z — paleta profissional com contraste forte
const LAYER_PALETTE = [
  { top: '#60a5fa', right: '#3b82f6', left: '#1d4ed8', stroke: '#1e3a8a' },  // Azul
  { top: '#4ade80', right: '#22c55e', left: '#15803d', stroke: '#14532d' },  // Verde
  { top: '#fbbf24', right: '#f59e0b', left: '#b45309', stroke: '#78350f' },  // Amarelo
  { top: '#f87171', right: '#ef4444', left: '#b91c1c', stroke: '#7f1d1d' },  // Vermelho
  { top: '#c084fc', right: '#a855f7', left: '#7e22ce', stroke: '#581c87' },  // Roxo
  { top: '#fb923c', right: '#f97316', left: '#c2410c', stroke: '#7c2d12' },  // Laranja
];

// Cor do endereço (container)
const ADDRESS_COLOR = {
  edge: '#94a3b8',
  fill: { top: 'rgba(226,232,240,0.15)', right: 'rgba(203,213,225,0.12)', left: 'rgba(148,163,184,0.10)' },
  floor: 'rgba(241,245,249,0.4)',
};

export default function AddressViz3D({ result }: Props) {
  const [rotation, setRotation] = useState(45);
  const [preset, setPreset] = useState<ViewPreset>('iso');
  const [zoom, setZoom] = useState(1);
  const [showAxes, setShowAxes] = useState(true);
  const [showMeasures, setShowMeasures] = useState(true);

  const { addressDims, boxes, fitX, fitY, fitZ } = result;
  const aL = addressDims.length;   // dimensão X
  const aW = addressDims.width;    // dimensão Y
  const aH = addressDims.height;   // dimensão Z

  // Calcular ângulos
  const rotY = (rotation * Math.PI) / 180;
  const tilt = preset === 'iso'
    ? Math.PI / 180 * 35.264
    : preset === 'top'
    ? Math.PI / 2 - 0.02
    : 0.08;

  const svgW = 680;
  const svgH = 560;

  // Calcular viewport — centralizar automaticamente
  const { scale, offsetX, offsetY } = useMemo(() => {
    const corners: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: aL, y: 0, z: 0 },
      { x: 0, y: aW, z: 0 },
      { x: aL, y: aW, z: 0 },
      { x: 0, y: 0, z: aH },
      { x: aL, y: 0, z: aH },
      { x: 0, y: aW, z: aH },
      { x: aL, y: aW, z: aH },
    ];
    const bounds = getProjectedBounds(corners, rotY, tilt);
    return calculateViewport(bounds, svgW, svgH, zoom, 80);
  }, [aL, aW, aH, rotY, tilt, zoom]);

  // Helper: ponto 3D → tela
  const toScreen = useCallback(
    (p: Point3D) => worldToScreen(p, rotY, tilt, scale, offsetX, offsetY),
    [rotY, tilt, scale, offsetX, offsetY]
  );

  // ===== Gerar todas as faces =====
  const renderedFaces = useMemo(() => {
    const faces: Face3D[] = [];

    // 1) Piso do endereço (base)
    faces.push(...generateBoxFaces(
      { x: 0, y: 0, z: -0.5 },
      { w: aL, d: aW, h: 0.5 },
      rotY, tilt,
      { top: ADDRESS_COLOR.floor, right: 'rgba(203,213,225,0.15)', left: 'rgba(148,163,184,0.10)' },
      'rgba(148,163,184,0.3)',
      'address-floor'
    ));

    // 2) Caixas agrupadas por camada Z — coordenadas exatas do algoritmo
    const zLayers = new Map<number, typeof boxes>();
    for (const box of boxes) {
      const zKey = box.z;
      if (!zLayers.has(zKey)) zLayers.set(zKey, []);
      zLayers.get(zKey)!.push(box);
    }
    const sortedZKeys = [...zLayers.keys()].sort((a, b) => a - b);

    for (const zKey of sortedZKeys) {
      const layerBoxes = zLayers.get(zKey)!;
      const colorIdx = sortedZKeys.indexOf(zKey) % LAYER_PALETTE.length;
      const colors = LAYER_PALETTE[colorIdx];

      for (const box of layerBoxes) {
        // Usar coordenadas exatas: box.x, box.y, box.z do algoritmo
        // Dimensões: box.l (comprimento/X), box.w (largura/Y), box.h (altura/Z)
        faces.push(...generateBoxFaces(
          { x: box.x, y: box.y, z: box.z },
          { w: box.l, d: box.w, h: box.h },
          rotY, tilt,
          { top: colors.top, right: colors.right, left: colors.left },
          colors.stroke,
          `layer-${zKey}`
        ));
      }
    }

    // 3) Arestas do endereço (wireframe) — desenhado por último para ficar sobreposto
    // Gerar como faces muito finas para entrar no sistema de ordenação
    const edgeFaces = generateBoxFaces(
      { x: 0, y: 0, z: 0 },
      { w: aL, d: aW, h: aH },
      rotY, tilt,
      { top: 'rgba(0,0,0,0)', right: 'rgba(0,0,0,0)', left: 'rgba(0,0,0,0)' },
      ADDRESS_COLOR.edge,
      'address-edge'
    );
    // Forçar arestas a serem desenhadas por último (depth muito alto)
    for (const f of edgeFaces) {
      f.depth = 100000;
      f.strokeWidth = 1.2;
      f.fillColor = 'rgba(0,0,0,0)'; // Transparente — apenas arestas
    }
    faces.push(...edgeFaces);

    // Renderizar e ordenar
    const rendered = renderFaces(faces, rotY, tilt, scale, offsetX, offsetY);
    return sortFacesByDepth(rendered);
  }, [boxes, aL, aW, aH, rotY, tilt, scale, offsetX, offsetY]);

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

  // ===== Linhas de grade no piso =====
  const floorGrid = useMemo(() => {
    if (!boxes.length) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const box0 = boxes[0];

    // Linhas verticais (colunas X)
    for (let ix = 0; ix <= fitX; ix++) {
      const p1 = toScreen({ x: ix * box0.l, y: 0, z: 0 });
      const p2 = toScreen({ x: ix * box0.l, y: aW, z: 0 });
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }

    // Linhas horizontais (linhas Y)
    for (let iy = 0; iy <= fitY; iy++) {
      const p1 = toScreen({ x: 0, y: iy * box0.w, z: 0 });
      const p2 = toScreen({ x: aL, y: iy * box0.w, z: 0 });
      lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }

    return lines;
  }, [boxes, fitX, fitY, aL, aW, toScreen]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ═══ Barra de Controles ═══ */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={styles.viewBtn} onClick={() => handleRotate(-90)} title="Girar -90°">↶ 90°</button>
        <button className={styles.viewBtn} onClick={() => handleRotate(-45)} title="Girar -45°">↶</button>
        <button className={styles.viewBtn} onClick={() => handleRotate(45)} title="Girar +45°">↷</button>
        <button className={styles.viewBtn} onClick={() => handleRotate(90)} title="Girar +90°">90° ↷</button>
        <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        {(Object.keys(VIEW_PRESETS) as ViewPreset[]).map(vt => (
          <button key={vt}
            className={`${styles.viewBtn} ${preset === vt ? styles.viewBtnActive : ''}`}
            onClick={() => handlePreset(vt)}
          >
            {VIEW_PRESETS[vt].label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className={styles.viewBtn} onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}>−</button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className={styles.viewBtn} onClick={() => setZoom(z => Math.min(3, z + 0.2))}>+</button>
          <button className={styles.viewBtn} onClick={() => { setZoom(1); setRotation(45); setPreset('iso'); }}>🔄</button>
        </div>
      </div>

      {/* ═══ Área SVG ═══ */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '100%' }}>
          {/* Fundo */}
          <rect x={0} y={0} width={svgW} height={svgH} fill="#f8f9fb" rx={8} />

          {/* Grade de referência sutil */}
          <pattern id="addrGrid" width={20} height={20} patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth={0.3} />
          </pattern>
          <rect x={0} y={0} width={svgW} height={svgH} fill="url(#addrGrid)" rx={8} opacity={0.4} />

          {/* Grade do piso */}
          {floorGrid.map((l, i) => (
            <line key={`grid${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#cbd5e1" strokeWidth={0.4} strokeDasharray="4,3" />
          ))}

          {/* Faces renderizadas (ordenadas por profundidade) */}
          {renderedFaces.map((face, i) => (
            <polygon key={i} points={face.points} fill={face.fillColor}
              stroke={face.strokeColor} strokeWidth={face.strokeWidth}
              strokeLinejoin="round" opacity={face.fillColor === 'rgba(0,0,0,0)' ? 1 : undefined}
            />
          ))}

          {/* Eixos 3D */}
          {showAxes && renderAxes(toScreen, aL, aW, aH)}

          {/* Medidas */}
          {showMeasures && renderMeasurements(toScreen, aL, aW, aH, fitX, fitY, fitZ)}

          {/* Info sobreposto */}
          {renderInfoBox(svgW, result)}

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

// ===== Sub-componentes =====

/** Eixos X, Y, Z */
function renderAxes(
  toScreen: (p: Point3D) => { x: number; y: number },
  aL: number, aW: number, aH: number
) {
  const axisLen = Math.min(aL, aW, aH) * 0.15;
  const o = toScreen({ x: 0, y: 0, z: 0 });
  const xE = toScreen({ x: axisLen, y: 0, z: 0 });
  const yE = toScreen({ x: 0, y: axisLen, z: 0 });
  const zE = toScreen({ x: 0, y: 0, z: axisLen });

  return (
    <g opacity={0.55}>
      <line x1={o.x} y1={o.y} x2={xE.x} y2={xE.y} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={o.x} y1={o.y} x2={yE.x} y2={yE.y} stroke="#22c55e" strokeWidth={2.5} strokeLinecap="round" />
      <line x1={o.x} y1={o.y} x2={zE.x} y2={zE.y} stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={o.x} cy={o.y} r={2.5} fill="#334155" />
      <text x={xE.x + 8} y={xE.y + 2} fontSize={10} fill="#ef4444" fontWeight={700}>X</text>
      <text x={yE.x + 8} y={yE.y + 2} fontSize={10} fill="#22c55e" fontWeight={700}>Y</text>
      <text x={zE.x + 8} y={zE.y + 2} fontSize={10} fill="#3b82f6" fontWeight={700}>Z</text>
    </g>
  );
}

/** Linhas de medida com cotas */
function renderMeasurements(
  toScreen: (p: Point3D) => { x: number; y: number },
  aL: number, aW: number, aH: number,
  fitX: number, fitY: number, fitZ: number
) {
  const elements: React.ReactElement[] = [];

  // Comprimento (X) — acima do endereço
  const wL = toScreen({ x: 0, y: 0, z: aH + 3 });
  const wR = toScreen({ x: aL, y: 0, z: aH + 3 });
  const wM = toScreen({ x: aL / 2, y: 0, z: aH + 9 });

  elements.push(
    <g key="w" opacity={0.75}>
      <line x1={wL.x} y1={wL.y} x2={wR.x} y2={wR.y} stroke="#475569" strokeWidth={0.8} />
      <line x1={wL.x} y1={wL.y - 3} x2={wL.x} y2={wL.y + 3} stroke="#475569" strokeWidth={0.8} />
      <line x1={wR.x} y1={wR.y - 3} x2={wR.x} y2={wR.y + 3} stroke="#475569" strokeWidth={0.8} />
      <text x={wM.x} y={wM.y} textAnchor="middle" fontSize={10} fill="#334155" fontWeight={600}>
        {aL} cm ({fitX} col.)
      </text>
    </g>
  );

  // Largura (Y) — à esquerda
  const dF = toScreen({ x: -3, y: 0, z: aH / 2 });
  const dB = toScreen({ x: -3, y: aW, z: aH / 2 });
  const dM = toScreen({ x: -16, y: aW / 2, z: aH / 2 });

  elements.push(
    <g key="d" opacity={0.75}>
      <line x1={dF.x} y1={dF.y} x2={dB.x} y2={dB.y} stroke="#475569" strokeWidth={0.8} />
      <line x1={dF.x - 3} y1={dF.y} x2={dF.x + 3} y2={dF.y} stroke="#475569" strokeWidth={0.8} />
      <line x1={dB.x - 3} y1={dB.y} x2={dB.x + 3} y2={dB.y} stroke="#475569" strokeWidth={0.8} />
      <text x={dM.x} y={dM.y} textAnchor="middle" fontSize={10} fill="#334155" fontWeight={600}>
        {aW} cm ({fitY} lin.)
      </text>
    </g>
  );

  // Altura (Z) — à direita
  const hB = toScreen({ x: aL + 3, y: 0, z: 0 });
  const hT = toScreen({ x: aL + 3, y: 0, z: aH });
  const hM = toScreen({ x: aL + 16, y: 0, z: aH / 2 });

  elements.push(
    <g key="h" opacity={0.75}>
      <line x1={hB.x} y1={hB.y} x2={hT.x} y2={hT.y} stroke="#475569" strokeWidth={0.8} strokeDasharray="4,3" />
      <line x1={hB.x - 3} y1={hB.y} x2={hB.x + 3} y2={hB.y} stroke="#475569" strokeWidth={0.8} />
      <line x1={hT.x - 3} y1={hT.y} x2={hT.x + 3} y2={hT.y} stroke="#475569" strokeWidth={0.8} />
      <text x={hM.x} y={hM.y} textAnchor="middle" fontSize={10} fill="#334155" fontWeight={600}>
        {aH} cm ({fitZ} nív.)
      </text>
    </g>
  );

  return <g>{elements}</g>;
}

/** Box de informações sobreposto */
function renderInfoBox(svgW: number, result: AddressingResult) {
  return (
    <g transform={`translate(${svgW - 145}, 12)`}>
      <rect x={0} y={0} width={133} height={52} fill="white" stroke="#cbd5e1" rx={6} opacity={0.92} />
      <text x={10} y={17} fontSize={10} fill="#1e293b" fontWeight={700}>
        {result.quantity} caixas
      </text>
      <text x={10} y={31} fontSize={9} fill="#64748b" fontWeight={500}>
        {result.fitX}×{result.fitY}×{result.fitZ} distribuição
      </text>
      <text x={10} y={44} fontSize={9} fill="#64748b" fontWeight={500}>
        {result.efficiency.toFixed(1)}% eficiência
      </text>
    </g>
  );
}
