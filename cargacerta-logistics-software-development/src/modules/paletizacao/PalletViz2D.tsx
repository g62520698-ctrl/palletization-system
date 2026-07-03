/**
 * CargaCerta v2 - Visualização 2D do Pallet (Vista por Camada)
 * 
 * Mostra o pallet PBR com caixas posicionadas em cada camada,
 * permitindo navegar entre camadas e visualizar o padrão A/B.
 * Cores consistentes com a visualização 3D.
 */

import type { PalletizationResult } from '@/algorithms/paletizacao';
import { PALLET_WIDTH, PALLET_LENGTH } from '@/algorithms/paletizacao';

interface Props {
  result: PalletizationResult;
  currentLayer: number;
  onLayerChange: (layer: number) => void;
}

// Cores IDÊNTICAS às da visualização 3D para consistência visual
const COLORS_A = { fill: '#60a5fa', fillLight: '#dbeafe', stroke: '#1e3a8a', label: '#1e3a8a' };
const COLORS_B = { fill: '#fb923c', fillLight: '#fed7aa', stroke: '#7c2d12', label: '#7c2d12' };

const BLOCK_POSITIONS = [
  [5, 5], [85, 5], [5, 105], [85, 105],
  [5, 55], [85, 55], [45, 5], [45, 105], [45, 55],
];

export default function PalletViz2D({ result, currentLayer, onLayerChange }: Props) {
  const layer = result.layers[currentLayer];
  if (!layer) return null;

  const boxes = layer.boxes;
  const isPatternA = layer.pattern === 'A';
  const colors = isPatternA ? COLORS_A : COLORS_B;

  const svgW = 560;
  const svgH = 520;
  const padding = 55;
  const drawW = svgW - padding * 2;
  const drawH = svgH - padding * 2;

  const scaleX = drawW / PALLET_WIDTH;
  const scaleY = drawH / PALLET_LENGTH;
  const scale = Math.min(scaleX, scaleY);

  const ox = padding + (drawW - PALLET_WIDTH * scale) / 2;
  const oy = padding + (drawH - PALLET_LENGTH * scale) / 2;

  const stepX = 20;
  const stepY = 20;

  const bw = 10 * scale;
  const bd = 10 * scale;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '100%' }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill="#f8f9fb" rx={8} />

      {/* Título */}
      <text x={svgW / 2} y={26} textAnchor="middle" fontSize={13} fontWeight={700} fill="#202124">
        Camada {currentLayer + 1} de {result.totalLayers}
      </text>
      <text x={svgW / 2} y={42} textAnchor="middle" fontSize={11} fontWeight={600}
        fill={isPatternA ? COLORS_A.fill : COLORS_B.fill}>
        Padrão {layer.pattern} — {isPatternA ? 'Lastro Mestre' : 'Rotação 180°'}
      </text>

      {/* Grade de referência */}
      {Array.from({ length: Math.floor(PALLET_WIDTH / stepX) + 1 }, (_, i) => (
        <line key={`gx${i}`} x1={ox + i * stepX * scale} y1={oy}
          x2={ox + i * stepX * scale} y2={oy + PALLET_LENGTH * scale}
          stroke="#e5e7eb" strokeWidth={0.4} />
      ))}
      {Array.from({ length: Math.floor(PALLET_LENGTH / stepY) + 1 }, (_, i) => (
        <line key={`gy${i}`} x1={ox} y1={oy + i * stepY * scale}
          x2={ox + PALLET_WIDTH * scale} y2={oy + i * stepY * scale}
          stroke="#e5e7eb" strokeWidth={0.4} />
      ))}

      {/* Sombra do pallet */}
      <rect x={ox + 3} y={oy + 3} width={PALLET_WIDTH * scale} height={PALLET_LENGTH * scale}
        fill="rgba(0,0,0,0.05)" rx={3} />

      {/* Pallet base */}
      <rect x={ox} y={oy} width={PALLET_WIDTH * scale} height={PALLET_LENGTH * scale}
        fill="#e8c88a" stroke="#c9a35e" strokeWidth={1.5} rx={3} />

      {/* Textura de madeira */}
      {Array.from({ length: 8 }, (_, i) => {
        const ly = oy + (PALLET_LENGTH * scale / 9) * (i + 1);
        return (
          <line key={`w${i}`} x1={ox + 4} y1={ly} x2={ox + PALLET_WIDTH * scale - 4} y2={ly}
            stroke="#d4a853" strokeWidth={0.6} opacity={0.4} />
        );
      })}

      {/* Blocos do pallet */}
      {BLOCK_POSITIONS.map(([bx, by], i) => (
        <rect key={`blk${i}`} x={ox + bx * scale} y={oy + by * scale}
          width={bw} height={bd} fill="#c49040" stroke="#a87525" strokeWidth={0.5} rx={1.5} opacity={0.6} />
      ))}

      {/* Caixas */}
      {boxes.map((box, i) => {
        const bx = ox + box.x * scale;
        const by = oy + box.y * scale;
        const bw2 = box.w * scale;
        const bl2 = box.l * scale;
        return (
          <g key={`b${i}`}>
            <rect x={bx + 1.5} y={by + 1.5} width={bw2} height={bl2}
              fill="rgba(0,0,0,0.08)" rx={1.5} />
            <rect x={bx} y={by} width={bw2} height={bl2}
              fill={colors.fillLight} stroke={colors.stroke} strokeWidth={1.2} rx={1.5} />
            <rect x={bx + 2} y={by + 2} width={Math.max(0, bw2 - 4)} height={Math.max(0, bl2 - 4)}
              fill={colors.fill} fillOpacity={0.25} rx={1} />
            {bw2 > 18 && bl2 > 14 && (
              <text x={bx + bw2 / 2} y={by + bl2 / 2} textAnchor="middle" dominantBaseline="central"
                fontSize={Math.min(10, bw2 * 0.22, bl2 * 0.28)} fill={colors.label} fontWeight={700}>
                {i + 1}
              </text>
            )}
          </g>
        );
      })}

      {/* Eixo X */}
      <line x1={ox} y1={oy + PALLET_LENGTH * scale + 12}
        x2={ox + PALLET_WIDTH * scale} y2={oy + PALLET_LENGTH * scale + 12}
        stroke="#6b7280" strokeWidth={0.8} />
      {Array.from({ length: Math.floor(PALLET_WIDTH / stepX) + 1 }, (_, i) => (
        <g key={`tx${i}`}>
          <line x1={ox + i * stepX * scale} y1={oy + PALLET_LENGTH * scale + 8}
            x2={ox + i * stepX * scale} y2={oy + PALLET_LENGTH * scale + 16}
            stroke="#6b7280" strokeWidth={0.6} />
          <text x={ox + i * stepX * scale} y={oy + PALLET_LENGTH * scale + 24}
            textAnchor="middle" fontSize={8} fill="#9ca3af">{i * stepX}</text>
        </g>
      ))}
      <text x={ox + PALLET_WIDTH * scale / 2} y={oy + PALLET_LENGTH * scale + 38}
        textAnchor="middle" fontSize={10} fill="#4b5563" fontWeight={600}>
        Largura: {PALLET_WIDTH} cm
      </text>

      {/* Eixo Y */}
      <line x1={ox - 12} y1={oy} x2={ox - 12} y2={oy + PALLET_LENGTH * scale}
        stroke="#6b7280" strokeWidth={0.8} />
      {Array.from({ length: Math.floor(PALLET_LENGTH / stepY) + 1 }, (_, i) => (
        <g key={`ty${i}`}>
          <line x1={ox - 16} y1={oy + i * stepY * scale} x2={ox - 8} y2={oy + i * stepY * scale}
            stroke="#6b7280" strokeWidth={0.6} />
          <text x={ox - 20} y={oy + i * stepY * scale + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
            {i * stepY}
          </text>
        </g>
      ))}
      <text x={ox - 30} y={oy + PALLET_LENGTH * scale / 2} textAnchor="middle"
        fontSize={10} fill="#4b5563" fontWeight={600}
        transform={`rotate(-90, ${ox - 30}, ${oy + PALLET_LENGTH * scale / 2})`}>
        Comprimento: {PALLET_LENGTH} cm
      </text>

      {/* Escala */}
      <g transform={`translate(${svgW - 135}, ${svgH - 45})`}>
        <rect x={0} y={0} width={115} height={30} fill="white" stroke="#d1d5db" rx={4} />
        <line x1={10} y1={15} x2={105} y2={15} stroke="#6b7280" strokeWidth={1.2} />
        <line x1={10} y1={10} x2={10} y2={20} stroke="#6b7280" strokeWidth={0.8} />
        <line x1={105} y1={10} x2={105} y2={20} stroke="#6b7280" strokeWidth={0.8} />
        <text x={57} y={11} textAnchor="middle" fontSize={9} fill="#4b5563" fontWeight={500}>
          {Math.round(95 / scale)} cm
        </text>
      </g>

      {/* Legenda */}
      <g transform={`translate(15, ${svgH - 45})`}>
        <rect x={0} y={0} width={130} height={30} fill="white" stroke="#d1d5db" rx={4} />
        <rect x={10} y={8} width={14} height={14} fill={colors.fillLight} stroke={colors.stroke}
          strokeWidth={0.8} rx={2} />
        <text x={30} y={19} fontSize={11} fill="#1f2937" fontWeight={700}>
          Padrão {layer.pattern}
        </text>
      </g>

      {/* Navegação de camadas */}
      <g transform={`translate(${svgW / 2 - 90}, ${svgH - 42})`}>
        <rect x={0} y={0} width={180} height={32} fill="white" stroke="#d1d5db" rx={16} />
        <g onClick={() => onLayerChange(Math.max(0, currentLayer - 1))}
          style={{ cursor: currentLayer > 0 ? 'pointer' : 'default' }}>
          <text x={20} y={21} textAnchor="middle" fontSize={13}
            fill={currentLayer > 0 ? '#1a73e8' : '#d1d5db'} fontWeight={700}>◀</text>
        </g>
        <text x={90} y={21} textAnchor="middle" fontSize={11} fill="#1f2937" fontWeight={700}>
          {currentLayer + 1} / {result.totalLayers}
        </text>
        <rect x={115} y={7} width={26} height={18} rx={9}
          fill={isPatternA ? '#e8f0fe' : '#fce8e6'} />
        <text x={128} y={20} textAnchor="middle" fontSize={10} fontWeight={800}
          fill={isPatternA ? '#1a73e8' : '#ea4335'}>{layer.pattern}</text>
        <g onClick={() => onLayerChange(Math.min(result.totalLayers - 1, currentLayer + 1))}
          style={{ cursor: currentLayer < result.totalLayers - 1 ? 'pointer' : 'default' }}>
          <text x={160} y={21} textAnchor="middle" fontSize={13}
            fill={currentLayer < result.totalLayers - 1 ? '#1a73e8' : '#d1d5db'} fontWeight={700}>▶</text>
        </g>
      </g>

      {/* Info: quantidade */}
      <g transform={`translate(${svgW - 135}, 12)`}>
        <rect x={0} y={0} width={115} height={28} fill="white" stroke="#d1d5db" rx={6} />
        <text x={57} y={18} textAnchor="middle" fontSize={11} fill="#1f2937" fontWeight={700}>
          {layer.quantity} caixas
        </text>
      </g>
    </svg>
  );
}
