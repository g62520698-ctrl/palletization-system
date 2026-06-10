interface Toolbar3DProps {
  cameraView: 'iso' | 'top' | 'front' | 'side';
  onCameraViewChange: (view: 'iso' | 'top' | 'front' | 'side') => void;
  autoRotate: boolean;
  onAutoRotateChange: (rotate: boolean) => void;
  onExpandClick: () => void;
  isImmersive: boolean;
  isMobile: boolean;
}

export const Toolbar3D: React.FC<Toolbar3DProps> = ({
  cameraView, onCameraViewChange, autoRotate, onAutoRotateChange,
  onExpandClick, isImmersive, isMobile,
}) => {
  const views: { id: 'iso' | 'top' | 'front' | 'side'; icon: string; label: string }[] = [
    { id: 'iso', icon: '🎲', label: 'Iso' },
    { id: 'top', icon: '⬇️', label: 'Topo' },
    { id: 'front', icon: '👁️', label: 'Frente' },
    { id: 'side', icon: '👉', label: 'Lateral' },
  ];

  if (isMobile) {
    return (
      <div className="flex items-center gap-2">
        {/* Camera views */}
        <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-1 flex gap-0.5 shadow-lg border border-slate-700/50">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => onCameraViewChange(v.id)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all ${
                cameraView === v.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={v.label}
            >
              {v.icon}
            </button>
          ))}
        </div>

        {/* Auto rotate */}
        <button
          onClick={() => onAutoRotateChange(!autoRotate)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-lg transition-all ${
            autoRotate
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900/80 backdrop-blur-md text-slate-400 border border-slate-700/50'
          }`}
          title="Rotação automática"
        >
          🔄
        </button>

        {/* Expand */}
        <button
          onClick={onExpandClick}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-lg transition-all ${
            isImmersive
              ? 'bg-blue-600 text-white'
              : 'bg-slate-900/80 backdrop-blur-md text-slate-400 border border-slate-700/50'
          }`}
          title="Expandir"
        >
          {isImmersive ? '✕' : '⛶'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Camera views */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-1.5 flex gap-1 shadow-lg border border-slate-700/50">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => onCameraViewChange(v.id)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${
              cameraView === v.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{v.icon}</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* Auto rotate */}
      <button
        onClick={() => onAutoRotateChange(!autoRotate)}
        className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-medium shadow-lg transition-all ${
          autoRotate
            ? 'bg-blue-600 text-white'
            : 'bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-white border border-slate-700/50'
        }`}
      >
        <span>🔄</span>
        <span>Rotação</span>
      </button>

      {/* Expand */}
      <button
        onClick={onExpandClick}
        className={`px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs font-medium shadow-lg transition-all ${
          isImmersive
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-white border border-slate-700/50'
        }`}
      >
        <span>{isImmersive ? '✕' : '⛶'}</span>
        <span>{isImmersive ? 'Sair' : 'Expandir'}</span>
      </button>
    </div>
  );
};
