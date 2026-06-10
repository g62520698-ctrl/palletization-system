import { useState } from 'react';
import type { BoxDimensions, PalletDimensions } from '../engine/types';

interface CompactInputProps {
  box: BoxDimensions;
  pallet: PalletDimensions;
  onBoxChange: (box: BoxDimensions) => void;
  onPalletChange: (pallet: PalletDimensions) => void;
  onSimulate: () => void;
  loading: boolean;
  viewMode: '3d' | '2d';
  onViewModeChange: (mode: '3d' | '2d') => void;
  hasResult: boolean;
}

export const CompactInput: React.FC<CompactInputProps> = ({
  box, pallet, onBoxChange, onPalletChange, onSimulate, loading,
  viewMode, onViewModeChange, hasResult,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleBoxField = (field: keyof BoxDimensions, value: string) => {
    const num = parseFloat(value) || 0;
    onBoxChange({ ...box, [field]: num });
  };

  const handlePalletField = (field: keyof PalletDimensions, value: string) => {
    const num = parseFloat(value) || 0;
    onPalletChange({ ...pallet, [field]: num });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSimulate();
  };

  const inputClass = `w-full px-3 py-2 text-sm border border-slate-200 rounded-lg 
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all
    bg-white/90 backdrop-blur text-slate-800 placeholder-slate-400`;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-4 w-full max-w-xs">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-sm">📦</span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-800 leading-tight">PalletPro</h1>
          <p className="text-[9px] text-slate-400 leading-tight">Simulador 3D</p>
        </div>
      </div>

      {/* Box dimensions */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Comp (cm)</label>
          <input
            type="number"
            inputMode="decimal"
            value={box.length || ''}
            onChange={e => handleBoxField('length', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="60"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Larg (cm)</label>
          <input
            type="number"
            inputMode="decimal"
            value={box.width || ''}
            onChange={e => handleBoxField('width', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="40"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1">Alt (cm)</label>
          <input
            type="number"
            inputMode="decimal"
            value={box.height || ''}
            onChange={e => handleBoxField('height', e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="30"
            className={inputClass}
          />
        </div>
      </div>

      {/* Advanced settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors mb-3 flex items-center gap-1"
      >
        <span className={`transition-transform text-[8px] ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
        Pallet ({pallet.length}×{pallet.width} cm)
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2 mb-3 animate-fade-in">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Pallet C</label>
            <input
              type="number"
              inputMode="decimal"
              value={pallet.length || ''}
              onChange={e => handlePalletField('length', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Pallet L</label>
            <input
              type="number"
              inputMode="decimal"
              value={pallet.width || ''}
              onChange={e => handlePalletField('width', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Alt Máx</label>
            <input
              type="number"
              inputMode="decimal"
              value={pallet.maxHeight || ''}
              onChange={e => handlePalletField('maxHeight', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-1">Alt Pallet</label>
            <input
              type="number"
              inputMode="decimal"
              value={pallet.palletHeight || ''}
              onChange={e => handlePalletField('palletHeight', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* Simulate button */}
      <button
        onClick={onSimulate}
        disabled={loading || !box.length || !box.width || !box.height}
        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl
          hover:from-blue-700 hover:to-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
          transition-all text-sm shadow-md hover:shadow-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Simulando...
          </span>
        ) : '🚀 Simular'}
      </button>

      {/* View toggle */}
      {hasResult && (
        <div className="mt-3 flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('3d')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === '3d'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🎲 3D
          </button>
          <button
            onClick={() => onViewModeChange('2d')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === '2d'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            📐 2D
          </button>
        </div>
      )}
    </div>
  );
};
