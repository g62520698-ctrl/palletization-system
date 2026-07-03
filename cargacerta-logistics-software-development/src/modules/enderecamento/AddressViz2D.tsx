/**
 * CargaCerta v2 - Visualização 2D (Vista Superior) do Endereçamento
 * 
 * Renderiza em SVG a vista superior do endereço com as caixas posicionadas.
 */

import type { AddressingResult } from '@/algorithms/enderecamento';

interface Props {
  result: AddressingResult;
}

export default function AddressViz2D({ result }: Props) {
  const { addressDims, boxes, fitX, fitY } = result;
  const aL = addressDims.length;
  const aW = addressDims.width;

  // Escala para caber no SVG
  const svgW = 640;
  const svgH = 480;
  const padding = 60;
  const drawW = svgW - padding * 2;
  const drawH = svgH - padding * 2;
  const scaleX = drawW / aL;
  const scaleY = drawH / aW;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padding + (drawW - aL * scale) / 2;
  const offsetY = padding + (drawH - aW * scale) / 2;

  // Cores para caixas
  const boxColors = [
    '#4285f4', '#34a853', '#fbbc04', '#ea4335',
    '#8ab4f8', '#81c995', '#fdd663', '#f28b82',
  ];

  // Calcular step do eixo
  const axisStep = (dim: number): number => {
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
    const target = dim / 5;
    return steps.find(s => s >= target) || Math.ceil(target / 100) * 100;
  };

  const stepX = axisStep(aL);
  const stepY = axisStep(aW);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '100%' }}>
      {/* Fundo */}
      <rect x={0} y={0} width={svgW} height={svgH} fill="#fafbfc" rx={8} />

      {/* Grade do endereço */}
      <g>
        {/* Linhas de grade X */}
        {Array.from({ length: Math.floor(aL / stepX) + 1 }, (_, i) => {
          const x = offsetX + i * stepX * scale;
          return (
            <line key={`gx${i}`} x1={x} y1={offsetY} x2={x} y2={offsetY + aW * scale}
              stroke="#e8eaed" strokeWidth={0.5} />
          );
        })}
        {/* Linhas de grade Y */}
        {Array.from({ length: Math.floor(aW / stepY) + 1 }, (_, i) => {
          const y = offsetY + i * stepY * scale;
          return (
            <line key={`gy${i}`} x1={offsetX} y1={y} x2={offsetX + aL * scale} y2={y}
              stroke="#e8eaed" strokeWidth={0.5} />
          );
        })}
      </g>

      {/* Endereço (contorno) */}
      <rect
        x={offsetX} y={offsetY}
        width={aL * scale} height={aW * scale}
        fill="#f0f2f5" stroke="#dadce0" strokeWidth={1.5} rx={2}
      />

      {/* Caixas (primeira camada) */}
      {boxes.filter(b => b.z === 0).map((box, i) => (
        <g key={`box-${i}`}>
          <rect
            x={offsetX + box.x * scale}
            y={offsetY + box.y * scale}
            width={box.l * scale}
            height={box.w * scale}
            fill={boxColors[i % boxColors.length]}
            fillOpacity={0.25}
            stroke={boxColors[i % boxColors.length]}
            strokeWidth={1}
            rx={1}
          />
          {/* Label da caixa (se grande o suficiente) */}
          {box.l * scale > 20 && box.w * scale > 15 && (
            <text
              x={offsetX + (box.x + box.l / 2) * scale}
              y={offsetY + (box.y + box.w / 2) * scale}
              textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(10, box.l * scale * 0.3, box.w * scale * 0.4)}
              fill={boxColors[i % boxColors.length]}
              fontWeight={600}
            >
              {i + 1}
            </text>
          )}
        </g>
      ))}

      {/* Eixos e medidas */}
      {/* Eixo X (Comprimento) */}
      <line x1={offsetX} y1={offsetY + aW * scale + 15} x2={offsetX + aL * scale} y2={offsetY + aW * scale + 15}
        stroke="#5f6368" strokeWidth={1} markerEnd="url(#arrowX)" />
      <text x={offsetX + aL * scale / 2} y={offsetY + aW * scale + 35}
        textAnchor="middle" fontSize={11} fill="#5f6368" fontWeight={500}>
        Comprimento: {aL} cm ({fitX} cols)
      </text>

      {/* Eixo Y (Largura) */}
      <line x1={offsetX - 15} y1={offsetY} x2={offsetX - 15} y2={offsetY + aW * scale}
        stroke="#5f6368" strokeWidth={1} />
      <text x={offsetX - 20} y={offsetY + aW * scale / 2}
        textAnchor="middle" fontSize={11} fill="#5f6368" fontWeight={500}
        transform={`rotate(-90, ${offsetX - 20}, ${offsetY + aW * scale / 2})`}>
        Largura: {aW} cm ({fitY} filas)
      </text>

      {/* Marcações do eixo X */}
      {Array.from({ length: Math.floor(aL / stepX) + 1 }, (_, i) => (
        <g key={`tx${i}`}>
          <line x1={offsetX + i * stepX * scale} y1={offsetY + aW * scale + 10}
            x2={offsetX + i * stepX * scale} y2={offsetY + aW * scale + 20}
            stroke="#5f6368" strokeWidth={0.8} />
          <text x={offsetX + i * stepX * scale} y={offsetY + aW * scale + 28}
            textAnchor="middle" fontSize={9} fill="#9aa0a6">
            {i * stepX}
          </text>
        </g>
      ))}

      {/* Marcações do eixo Y */}
      {Array.from({ length: Math.floor(aW / stepY) + 1 }, (_, i) => (
        <g key={`ty${i}`}>
          <line x1={offsetX - 10} y1={offsetY + i * stepY * scale}
            x2={offsetX - 20} y2={offsetY + i * stepY * scale}
            stroke="#5f6368" strokeWidth={0.8} />
          <text x={offsetX - 25} y={offsetY + i * stepY * scale + 3}
            textAnchor="end" fontSize={9} fill="#9aa0a6">
            {i * stepY}
          </text>
        </g>
      ))}

      {/* Escala */}
      <g transform={`translate(${svgW - 140}, 20)`}>
        <rect x={0} y={0} width={120} height={40} fill="white" stroke="#dadce0" rx={4} />
        <line x1={10} y1={20} x2={110} y2={20} stroke="#5f6368" strokeWidth={1.5} />
        <line x1={10} y1={15} x2={10} y2={25} stroke="#5f6368" strokeWidth={1} />
        <line x1={110} y1={15} x2={110} y2={25} stroke="#5f6368" strokeWidth={1} />
        <text x={60} y={14} textAnchor="middle" fontSize={9} fill="#5f6368">
          {Math.round(100 / scale)} cm
        </text>
      </g>
    </svg>
  );
}
