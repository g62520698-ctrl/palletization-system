import { useState } from 'react';
import type { PalletConfig, BoxDimensions, PalletDimensions } from '../engine/types';

interface StatsBarProps {
  config: PalletConfig;
  box: BoxDimensions;
  pallet: PalletDimensions;
  isMobile: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({ config, box, pallet, isMobile }) => {
  const [expanded, setExpanded] = useState(false);
  const r = config.reliability;

  const getReliabilityColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-amber-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const totalWeight = box.weight ? config.totalBoxes * box.weight : null;

  if (isMobile) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{config.totalBoxes}</p>
              <p className="text-[9px] text-slate-400">Caixas</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className="text-lg font-bold text-white">{config.layerCount}</p>
              <p className="text-[9px] text-slate-400">Camadas</p>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center">
              <p className={`text-lg font-bold ${getReliabilityColor(r.total)}`}>{r.total}</p>
              <p className="text-[9px] text-slate-400">Índice</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"
          >
            <span className={`text-slate-400 text-xs transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-3 animate-fade-in">
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{config.layers[0]?.boxCount || 0}</p>
              <p className="text-[9px] text-slate-400">Por camada</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{(config.totalHeight + pallet.palletHeight).toFixed(0)} cm</p>
              <p className="text-[9px] text-slate-400">Altura total</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">{(config.utilization * 100).toFixed(0)}%</p>
              <p className="text-[9px] text-slate-400">Cobertura</p>
            </div>
            {totalWeight && (
              <div className="text-center col-span-3">
                <p className="text-sm font-semibold text-white">{totalWeight.toFixed(1)} kg</p>
                <p className="text-[9px] text-slate-400">Peso total</p>
              </div>
            )}
            <div className="col-span-3 flex items-center gap-2 mt-1">
              <span className={`text-xs ${config.approved ? 'text-emerald-400' : 'text-amber-400'}`}>
                {config.approved ? '✓' : '⚠'}
              </span>
              <span className="text-[10px] text-slate-400">
                {config.approved ? 'Configuração aprovada' : config.rejectionReasons[0] || 'Ressalvas'}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-5 py-3 shadow-xl border border-slate-700/50 flex items-center gap-6">
      <div className="flex items-center gap-1.5">
        <span className="text-xs">📦</span>
        <span className="text-white font-bold text-lg">{config.totalBoxes}</span>
        <span className="text-slate-400 text-xs">caixas</span>
      </div>
      
      <div className="w-px h-6 bg-slate-700" />
      
      <div className="flex items-center gap-1.5">
        <span className="text-xs">🔢</span>
        <span className="text-white font-bold">{config.layerCount}</span>
        <span className="text-slate-400 text-xs">camadas</span>
      </div>
      
      <div className="w-px h-6 bg-slate-700" />
      
      <div className="flex items-center gap-1.5">
        <span className="text-xs">📏</span>
        <span className="text-white font-bold">{(config.totalHeight + pallet.palletHeight).toFixed(0)}</span>
        <span className="text-slate-400 text-xs">cm</span>
      </div>
      
      <div className="w-px h-6 bg-slate-700" />
      
      <div className="flex items-center gap-1.5">
        <span className="text-xs">📊</span>
        <span className="text-white font-bold">{(config.utilization * 100).toFixed(0)}%</span>
        <span className="text-slate-400 text-xs">cobertura</span>
      </div>
      
      <div className="w-px h-6 bg-slate-700" />
      
      <div className="flex items-center gap-1.5">
        <span className="text-xs">🛡️</span>
        <span className={`font-bold text-lg ${getReliabilityColor(r.total)}`}>{r.total}</span>
        <span className="text-slate-400 text-xs">{r.label}</span>
      </div>

      {config.approved ? (
        <span className="ml-auto text-emerald-400 text-xs flex items-center gap-1">
          <span>✓</span> Aprovado
        </span>
      ) : (
        <span className="ml-auto text-amber-400 text-xs flex items-center gap-1">
          <span>⚠</span> Ressalvas
        </span>
      )}
    </div>
  );
};
