import React, { useState, useCallback, useEffect, Suspense } from 'react';
import type { BoxDimensions, PalletDimensions, PalletConfig, DeviceProfile } from './engine/types';
import { DEFAULT_PALLET, calculatePalletization } from './engine/palletizer';
import { detectDevice } from './engine/device';
import { CompactInput } from './components/CompactInput';
import { StatsBar } from './components/StatsBar';
import { Toolbar3D } from './components/Toolbar3D';
import { View2D } from './components/View2D';

const View3D = React.lazy(() =>
  import('./components/View3D').then(m => ({ default: m.View3D }))
);

// Loading screen with signature
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center z-50">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6 animate-pulse">
        <span className="text-4xl">📦</span>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">PalletPro</h1>
      <p className="text-slate-400 text-sm mb-8">Simulador 3D de Paletização</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="absolute bottom-6 text-slate-500 text-xs">
        Desenvolvido por <span className="text-slate-400">Guilherme Lopes</span>
      </p>
    </div>
  );
}

// Empty state when no simulation
function EmptyState({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      <div className="text-center px-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl mb-6 mx-auto">
          <span className="text-5xl">📦</span>
        </div>
        <h1 className={`font-bold text-slate-800 mb-2 ${isMobile ? 'text-xl' : 'text-3xl'}`}>
          PalletPro
        </h1>
        <p className={`text-slate-500 mb-8 max-w-md ${isMobile ? 'text-sm' : 'text-base'}`}>
          Simulador profissional de paletização com visualização 3D interativa e análise estrutural
        </p>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-4' : 'grid-cols-4 gap-6'} max-w-lg mx-auto`}>
          {[
            { icon: '🎲', label: 'Visualização 3D' },
            { icon: '🔒', label: 'Travamento' },
            { icon: '⚖️', label: 'Estabilidade' },
            { icon: '📊', label: 'Análise' },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center mb-2">
                <span className="text-xl">{item.icon}</span>
              </div>
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="absolute bottom-6 text-slate-400 text-xs">
        Desenvolvido por <span className="text-slate-500">Guilherme Lopes</span>
      </p>
    </div>
  );
}

function App() {
  const [box, setBox] = useState<BoxDimensions>({ length: 40, width: 30, height: 25 });
  const [pallet, setPallet] = useState<PalletDimensions>({ ...DEFAULT_PALLET });
  const [config, setConfig] = useState<PalletConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceProfile>({
    quality: 'high', isMobile: false, isTablet: false, pixelRatio: 1,
  });

  // View state
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [isImmersive, setIsImmersive] = useState(false);
  const [cameraView, setCameraView] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [autoRotate, setAutoRotate] = useState(false);
  const [animateBuilding, setAnimateBuilding] = useState(false);

  // Initial loading
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setDevice(detectDevice());
    const handleResize = () => setDevice(detectDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ESC to exit immersive
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImmersive) {
        setIsImmersive(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImmersive]);

  const handleSimulate = useCallback(() => {
    if (!box.length || !box.width || !box.height) {
      setError('Preencha todas as dimensões.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnimateBuilding(false);

    requestAnimationFrame(() => {
      try {
        const result = calculatePalletization(box, pallet);
        if (!result) {
          setError('Dimensões incompatíveis.');
          setConfig(null);
        } else {
          setConfig(result);
          setViewMode('3d');
          setAnimateBuilding(true);
          setError(null);
        }
      } catch (e) {
        setError('Erro no cálculo.');
        console.error(e);
      }
      setLoading(false);
    });
  }, [box, pallet]);

  const handleAnimationComplete = useCallback(() => {
    setAnimateBuilding(false);
  }, []);

  const isMobile = device.isMobile;

  if (initialLoading) {
    return <LoadingScreen />;
  }

  // ─── Immersive Mode ─────────────────────────────────────────
  if (isImmersive && config) {
    return (
      <div className="fixed inset-0 bg-slate-900">
        <Suspense fallback={<LoadingScreen />}>
          <View3D
            config={config}
            pallet={pallet}
            box={box}
            quality={device.quality}
            isMobile={isMobile}
            isImmersive
            autoRotate={autoRotate}
            cameraView={cameraView}
          />
        </Suspense>

        {/* Immersive controls */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <Toolbar3D
            cameraView={cameraView}
            onCameraViewChange={setCameraView}
            autoRotate={autoRotate}
            onAutoRotateChange={setAutoRotate}
            onExpandClick={() => setIsImmersive(false)}
            isImmersive
            isMobile={isMobile}
          />
        </div>

        {/* Stats */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <StatsBar config={config} box={box} pallet={pallet} isMobile={isMobile} />
        </div>

        {/* Signature */}
        <p className="absolute bottom-4 right-4 text-slate-600 text-[10px] z-10">
          Desenvolvido por Guilherme Lopes
        </p>

        {/* ESC hint */}
        {!isMobile && (
          <p className="absolute top-4 right-4 text-slate-500 text-xs z-10">
            ESC para sair
          </p>
        )}
      </div>
    );
  }

  // ─── Mobile Layout ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="fixed inset-0 flex flex-col bg-slate-100">
        {/* Main visualization area */}
        <div className="flex-1 relative overflow-hidden">
          {!config ? (
            <EmptyState isMobile />
          ) : viewMode === '3d' ? (
            <Suspense fallback={<LoadingScreen />}>
              <View3D
                config={config}
                pallet={pallet}
                box={box}
                quality={device.quality}
                isMobile
                autoRotate={autoRotate}
                cameraView={cameraView}
                animateBuilding={animateBuilding}
                onAnimationComplete={handleAnimationComplete}
              />
            </Suspense>
          ) : (
            <View2D config={config} pallet={pallet} box={box} isMobile isFullHeight />
          )}

          {/* 3D Toolbar */}
          {config && viewMode === '3d' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <Toolbar3D
                cameraView={cameraView}
                onCameraViewChange={setCameraView}
                autoRotate={autoRotate}
                onAutoRotateChange={setAutoRotate}
                onExpandClick={() => setIsImmersive(true)}
                isImmersive={false}
                isMobile
              />
            </div>
          )}

          {/* Stats bar */}
          {config && (
            <div className="absolute bottom-3 left-3 right-3 z-20">
              <StatsBar config={config} box={box} pallet={pallet} isMobile />
            </div>
          )}
        </div>

        {/* Compact input panel */}
        <div className="shrink-0 p-3 bg-white border-t border-slate-200 shadow-lg">
          {error && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600">⚠️ {error}</p>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={box.length || ''}
                onChange={e => setBox({ ...box, length: parseFloat(e.target.value) || 0 })}
                placeholder="C"
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-center"
              />
              <input
                type="number"
                inputMode="decimal"
                value={box.width || ''}
                onChange={e => setBox({ ...box, width: parseFloat(e.target.value) || 0 })}
                placeholder="L"
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-center"
              />
              <input
                type="number"
                inputMode="decimal"
                value={box.height || ''}
                onChange={e => setBox({ ...box, height: parseFloat(e.target.value) || 0 })}
                placeholder="A"
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-center"
              />
            </div>
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {loading ? '...' : '🚀'}
            </button>
            {config && (
              <button
                onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')}
                className="px-3 py-2.5 bg-slate-100 rounded-xl text-sm"
              >
                {viewMode === '3d' ? '📐' : '🎲'}
              </button>
            )}
          </div>
          <p className="text-center text-[9px] text-slate-400 mt-2">
            Desenvolvido por Guilherme Lopes
          </p>
        </div>
      </div>
    );
  }

  // ─── Desktop Layout ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex bg-slate-100">
      {/* Main visualization area (75-85%) */}
      <div className="flex-1 relative overflow-hidden">
        {!config ? (
          <EmptyState isMobile={false} />
        ) : viewMode === '3d' ? (
          <Suspense fallback={<LoadingScreen />}>
            <View3D
              config={config}
              pallet={pallet}
              box={box}
              quality={device.quality}
              isMobile={false}
              autoRotate={autoRotate}
              cameraView={cameraView}
              animateBuilding={animateBuilding}
              onAnimationComplete={handleAnimationComplete}
            />
          </Suspense>
        ) : (
          <View2D config={config} pallet={pallet} box={box} isMobile={false} isFullHeight />
        )}

        {/* 3D Toolbar - top center */}
        {config && viewMode === '3d' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <Toolbar3D
              cameraView={cameraView}
              onCameraViewChange={setCameraView}
              autoRotate={autoRotate}
              onAutoRotateChange={setAutoRotate}
              onExpandClick={() => setIsImmersive(true)}
              isImmersive={false}
              isMobile={false}
            />
          </div>
        )}

        {/* Stats bar - bottom center */}
        {config && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <StatsBar config={config} box={box} pallet={pallet} isMobile={false} />
          </div>
        )}

        {/* Signature */}
        <p className="absolute bottom-4 right-4 text-slate-400 text-[10px] z-10">
          Desenvolvido por Guilherme Lopes
        </p>

        {/* Navigation hint */}
        {config && viewMode === '3d' && (
          <p className="absolute bottom-4 left-4 text-slate-400 text-[10px] z-10">
            Arraste para girar · Scroll para zoom · Duplo clique para resetar
          </p>
        )}
      </div>

      {/* Compact sidebar (15-25%) */}
      <div className="w-80 shrink-0 p-4 flex flex-col">
        <CompactInput
          box={box}
          pallet={pallet}
          onBoxChange={setBox}
          onPalletChange={setPallet}
          onSimulate={handleSimulate}
          loading={loading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          hasResult={!!config}
        />

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs text-red-600">⚠️ {error}</p>
          </div>
        )}

        {/* Quality indicator */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${
              device.quality === 'high' ? 'bg-emerald-400' :
              device.quality === 'medium' ? 'bg-amber-400' : 'bg-orange-400'
            }`} />
            {device.quality === 'high' ? 'Alta Qualidade' :
             device.quality === 'medium' ? 'Qualidade Média' : 'Modo Otimizado'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
