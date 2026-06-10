import { useRef, useEffect, useState } from 'react';
import type { PalletConfig, PalletDimensions, BoxDimensions } from '../engine/types';

interface View2DProps {
  config: PalletConfig;
  pallet: PalletDimensions;
  box: BoxDimensions;
  isMobile: boolean;
  isFullHeight?: boolean;
}

const COLORS_L = '#3b82f6';
const COLORS_T = '#f59e0b';
const COLORS_L_STROKE = '#1e40af';
const COLORS_T_STROKE = '#d97706';

export const View2D: React.FC<View2DProps> = ({ config, pallet, box: boxDims, isMobile, isFullHeight = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeLayer, setActiveLayer] = useState(0);
  const [size, setSize] = useState({ w: 400, h: 400 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const h = isFullHeight ? rect.height : (isMobile ? 320 : 450);
        setSize({ w: rect.width, h });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isMobile, isFullHeight]);

  useEffect(() => {
    setActiveLayer(0);
  }, [config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config || config.layers.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.scale(dpr, dpr);

    const padding = 50;
    const availW = size.w - padding * 2;
    const availH = size.h - padding * 2 - 40;

    const scaleX = availW / pallet.length;
    const scaleY = availH / pallet.width;
    const scale = Math.min(scaleX, scaleY);

    const palletW = pallet.length * scale;
    const palletH = pallet.width * scale;
    const offsetX = (size.w - palletW) / 2;
    const offsetY = (size.h - palletH) / 2 - 10;

    // Clear with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, size.h);
    gradient.addColorStop(0, '#f1f5f9');
    gradient.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.w, size.h);

    // Pallet base with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(offsetX, offsetY, palletW, palletH);
    ctx.shadowColor = 'transparent';

    // Grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    const gridStep = 10 * scale;
    for (let gx = offsetX + gridStep; gx < offsetX + palletW; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, offsetY);
      ctx.lineTo(gx, offsetY + palletH);
      ctx.stroke();
    }
    for (let gy = offsetY + gridStep; gy < offsetY + palletH; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(offsetX, gy);
      ctx.lineTo(offsetX + palletW, gy);
      ctx.stroke();
    }

    // Pallet border
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, palletW, palletH);

    // Boxes
    const layer = config.layers[activeLayer];
    if (!layer) return;

    for (const box of layer.boxes) {
      const bx = offsetX + box.x * scale;
      const by = offsetY + box.y * scale;
      const bw = box.w * scale;
      const bh = box.h * scale;
      const isL = box.orientation === 'L';

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;

      // Fill with rounded corners
      const radius = 3;
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 2, bw - 4, bh - 4, radius);
      ctx.fillStyle = isL ? COLORS_L : COLORS_T;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = 'transparent';

      // Border
      ctx.strokeStyle = isL ? COLORS_L_STROKE : COLORS_T_STROKE;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Dimension text
      const minDim = Math.min(bw, bh);
      if (minDim > 35) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = `bold ${Math.min(Math.floor(minDim * 0.25), 13)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${box.w}×${box.h}`, bx + bw / 2, by + bh / 2);
      }
    }

    // Info text
    const isEven = activeLayer % 2 === 0;
    ctx.fillStyle = '#475569';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Camada ${activeLayer + 1} de ${config.layerCount} · ${layer.boxCount} caixas · Padrão ${isEven ? 'A' : 'A invertido'}`,
      size.w / 2,
      offsetY + palletH + 15
    );

    // Dimensions
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${pallet.length} cm`, size.w / 2, offsetY - 8);

    ctx.save();
    ctx.translate(offsetX - 12, offsetY + palletH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${pallet.width} cm`, 0, 0);
    ctx.restore();

    // Box legend
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Caixa: ${boxDims.length}×${boxDims.width}×${boxDims.height} cm`,
      size.w / 2,
      offsetY + palletH + 32
    );

  }, [config, activeLayer, pallet, size, boxDims]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow-lg flex items-center gap-2">
          <button
            onClick={() => setActiveLayer(Math.max(0, activeLayer - 1))}
            disabled={activeLayer === 0}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 hover:bg-slate-200 transition-colors"
          >
            ◀
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[50px] text-center">
            {activeLayer + 1} / {config.layerCount}
          </span>
          <button
            onClick={() => setActiveLayer(Math.min(config.layerCount - 1, activeLayer + 1))}
            disabled={activeLayer >= config.layerCount - 1}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 hover:bg-slate-200 transition-colors"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow-lg flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: COLORS_L, opacity: 0.85 }} />
          <span className="text-xs text-slate-600">Longitudinal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: COLORS_T, opacity: 0.85 }} />
          <span className="text-xs text-slate-600">Transversal</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: size.w, height: size.h }}
        className="flex-1"
      />
    </div>
  );
};
