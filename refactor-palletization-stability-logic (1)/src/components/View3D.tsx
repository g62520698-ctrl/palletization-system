import { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { PalletConfig, PalletDimensions, BoxDimensions, QualityLevel } from '../engine/types';
import { getQualitySettings } from '../engine/device';

interface View3DProps {
  config: PalletConfig;
  pallet: PalletDimensions;
  box: BoxDimensions;
  quality: QualityLevel;
  isMobile: boolean;
  isImmersive?: boolean;
  autoRotate?: boolean;
  cameraView?: 'iso' | 'top' | 'front' | 'side';
  animateBuilding?: boolean;
  onAnimationComplete?: () => void;
}

const COLOR_L = new THREE.Color('#3b82f6');
const COLOR_T = new THREE.Color('#f59e0b');
const COLOR_PALLET = new THREE.Color('#c4a882');
const COLOR_PALLET_DARK = new THREE.Color('#a08860');

const S = 0.01; // cm to scene units

// Animated box instances with layer-by-layer reveal
function AnimatedBoxInstances({
  positions,
  color,
  edgeColor,
  quality,
  layerCount,
  animationProgress,
  boxHeight,
}: {
  positions: { px: number; py: number; pz: number; sx: number; sy: number; sz: number; layer: number }[];
  color: THREE.Color;
  edgeColor: THREE.Color;
  quality: QualityLevel;
  layerCount: number;
  animationProgress: number;
  boxHeight: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgeRef = useRef<THREE.InstancedMesh>(null);

  const count = positions.length;

  useEffect(() => {
    if (!meshRef.current || count === 0) return;

    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const baseY = boxHeight * S;

    let visibleCount = 0;

    for (let i = 0; i < count; i++) {
      const p = positions[i];
      
      // Calculate animation state for this box
      const layerProgress = (animationProgress * layerCount) - p.layer;
      const boxProgress = Math.max(0, Math.min(1, layerProgress));
      
      if (boxProgress <= 0) continue;

      // Animate: drop from above with scale
      const dropOffset = (1 - boxProgress) * baseY * 2;
      const scaleAnim = 0.5 + boxProgress * 0.5;

      scale.set(p.sx * 0.97 * scaleAnim, p.sy * 0.98 * scaleAnim, p.sz * 0.97 * scaleAnim);
      matrix.makeTranslation(p.px, p.py + dropOffset, p.pz);
      matrix.scale(scale);
      meshRef.current.setMatrixAt(visibleCount, matrix);
      visibleCount++;
    }

    meshRef.current.count = visibleCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, count, animationProgress, layerCount, boxHeight]);

  useEffect(() => {
    if (!edgeRef.current || count === 0 || quality === 'low') return;

    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const baseY = boxHeight * S;

    let visibleCount = 0;

    for (let i = 0; i < count; i++) {
      const p = positions[i];
      const layerProgress = (animationProgress * layerCount) - p.layer;
      const boxProgress = Math.max(0, Math.min(1, layerProgress));
      
      if (boxProgress <= 0) continue;

      const dropOffset = (1 - boxProgress) * baseY * 2;

      scale.set(p.sx, p.sy, p.sz);
      matrix.makeTranslation(p.px, p.py + dropOffset, p.pz);
      matrix.scale(scale);
      edgeRef.current.setMatrixAt(visibleCount, matrix);
      visibleCount++;
    }

    edgeRef.current.count = visibleCount;
    edgeRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, count, quality, animationProgress, layerCount, boxHeight]);

  const boxGeom = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  if (count === 0) return null;

  return (
    <>
      <instancedMesh ref={meshRef} args={[boxGeom, undefined, count]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.02} />
      </instancedMesh>
      {quality !== 'low' && (
        <instancedMesh ref={edgeRef} args={[boxGeom, undefined, count]}>
          <meshBasicMaterial color={edgeColor} wireframe transparent opacity={0.12} />
        </instancedMesh>
      )}
    </>
  );
}

function PalletBase({ pallet, quality }: { pallet: PalletDimensions; quality: QualityLevel }) {
  const w = pallet.length * S;
  const h = pallet.palletHeight * S;
  const d = pallet.width * S;

  if (quality === 'low') {
    return (
      <mesh position={[0, h / 2, 0]} receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={COLOR_PALLET} roughness={0.8} />
      </mesh>
    );
  }

  const deckCount = 5;
  const deckH = h * 0.2;

  return (
    <group>
      <mesh position={[0, h * 0.4, 0]} receiveShadow>
        <boxGeometry args={[w, h * 0.6, d]} />
        <meshStandardMaterial color={COLOR_PALLET} roughness={0.85} />
      </mesh>
      {Array.from({ length: deckCount }, (_, i) => (
        <mesh key={i} position={[0, h - deckH / 2, -d / 2 + (d / deckCount) * (i + 0.5)]} castShadow receiveShadow>
          <boxGeometry args={[w * 0.99, deckH, (d / deckCount) * 0.92]} />
          <meshStandardMaterial color={i % 2 === 0 ? COLOR_PALLET : COLOR_PALLET_DARK} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Floor({ quality }: { quality: QualityLevel }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      <meshStandardMaterial 
        color={quality === 'low' ? '#e8ecf0' : '#f0f4f8'} 
        roughness={0.95} 
        metalness={0} 
      />
    </mesh>
  );
}

function CameraController({
  cameraView,
  autoRotate,
  controlsRef,
  targetY,
  maxDim,
}: {
  cameraView: 'iso' | 'top' | 'front' | 'side';
  autoRotate: boolean;
  controlsRef: React.RefObject<any>;
  targetY: number;
  maxDim: number;
}) {
  const { camera } = useThree();
  const targetPosRef = useRef<THREE.Vector3 | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    const dist = maxDim * 2.5;
    let newPos: THREE.Vector3;

    switch (cameraView) {
      case 'top':
        newPos = new THREE.Vector3(0, dist * 1.5, 0.001);
        break;
      case 'front':
        newPos = new THREE.Vector3(0, targetY, dist);
        break;
      case 'side':
        newPos = new THREE.Vector3(dist, targetY, 0);
        break;
      case 'iso':
      default:
        newPos = new THREE.Vector3(dist * 0.8, dist * 0.7, dist * 0.8);
        break;
    }

    targetPosRef.current = newPos;
    animatingRef.current = true;
  }, [cameraView, targetY, maxDim, camera]);

  useFrame(() => {
    if (animatingRef.current && targetPosRef.current) {
      camera.position.lerp(targetPosRef.current, 0.08);
      if (camera.position.distanceTo(targetPosRef.current) < 0.01) {
        camera.position.copy(targetPosRef.current);
        animatingRef.current = false;
      }
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }
  });

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
      controlsRef.current.autoRotateSpeed = 1.5;
    }
  }, [autoRotate, controlsRef]);

  return null;
}

function SceneContent({
  config, pallet, box, quality, animationProgress, layerCount,
}: {
  config: PalletConfig;
  pallet: PalletDimensions;
  box: BoxDimensions;
  quality: QualityLevel;
  animationProgress: number;
  layerCount: number;
}) {
  const { gl } = useThree();
  const settings = getQualitySettings(quality);

  useEffect(() => {
    gl.setPixelRatio(settings.pixelRatio);
    gl.shadowMap.enabled = settings.shadows;
    if (settings.shadows) {
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }, [gl, settings]);

  const { positionsL, positionsT } = useMemo(() => {
    const l: { px: number; py: number; pz: number; sx: number; sy: number; sz: number; layer: number }[] = [];
    const t: { px: number; py: number; pz: number; sx: number; sy: number; sz: number; layer: number }[] = [];

    const cx = (pallet.length * S) / 2;
    const cz = (pallet.width * S) / 2;

    config.layers.forEach((layer, layerIdx) => {
      const yBase = (pallet.palletHeight + layerIdx * box.height) * S;

      for (const b of layer.boxes) {
        const sx = b.w * S;
        const sy = box.height * S;
        const sz = b.h * S;

        const pos = {
          px: b.x * S + sx / 2 - cx,
          py: yBase + sy / 2,
          pz: b.y * S + sz / 2 - cz,
          sx, sy, sz,
          layer: layerIdx,
        };

        if (b.orientation === 'L') l.push(pos);
        else t.push(pos);
      }
    });

    return { positionsL: l, positionsT: t };
  }, [config, pallet, box]);

  return (
    <>
      <ambientLight intensity={settings.ambientIntensity} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={settings.directionalIntensity}
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        shadow-camera-near={0.1}
        shadow-camera-far={25}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      {quality !== 'low' && (
        <directionalLight position={[-3, 4, -2]} intensity={0.2} />
      )}
      {quality === 'high' && (
        <directionalLight position={[0, 3, -4]} intensity={0.12} />
      )}

      <Floor quality={quality} />
      <PalletBase pallet={pallet} quality={quality} />

      <AnimatedBoxInstances
        positions={positionsL}
        color={COLOR_L}
        edgeColor={new THREE.Color('#1e40af')}
        quality={quality}
        layerCount={layerCount}
        animationProgress={animationProgress}
        boxHeight={box.height}
      />
      <AnimatedBoxInstances
        positions={positionsT}
        color={COLOR_T}
        edgeColor={new THREE.Color('#d97706')}
        quality={quality}
        layerCount={layerCount}
        animationProgress={animationProgress}
        boxHeight={box.height}
      />
    </>
  );
}

export const View3D: React.FC<View3DProps> = ({
  config, pallet, box, quality, isMobile, isImmersive = false,
  autoRotate = false, cameraView = 'iso', animateBuilding = false,
  onAnimationComplete,
}) => {
  const settings = getQualitySettings(quality);
  const controlsRef = useRef<any>(null);
  const [animationProgress, setAnimationProgress] = useState(animateBuilding ? 0 : 1);

  // Animation effect
  useEffect(() => {
    if (!animateBuilding) {
      setAnimationProgress(1);
      return;
    }

    setAnimationProgress(0);
    const duration = 1500 + config.layerCount * 400; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onAnimationComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [animateBuilding, config.layerCount, onAnimationComplete]);

  const cameraPos = useMemo((): [number, number, number] => {
    const maxDim = Math.max(pallet.length, pallet.width) * S;
    const dist = maxDim * 2.5;
    return [dist * 0.8, dist * 0.7, dist * 0.8];
  }, [pallet]);

  const targetY = useMemo(() => {
    return ((pallet.palletHeight + config.totalHeight / 2) * S);
  }, [pallet, config]);

  const maxDim = Math.max(pallet.length, pallet.width) * S;

  return (
    <div className="w-full h-full" style={{ minHeight: isImmersive ? '100vh' : (isMobile ? 350 : 500) }}>
      <Canvas
        camera={{
          position: cameraPos,
          fov: isMobile ? 50 : 40,
          near: 0.01,
          far: 60,
        }}
        dpr={settings.pixelRatio}
        shadows={settings.shadows}
        gl={{
          antialias: settings.antialias,
          powerPreference: isMobile ? 'low-power' : 'high-performance',
          alpha: false,
        }}
        style={{ background: 'linear-gradient(180deg, #e8ecf4 0%, #f8fafc 100%)' }}
      >
        <SceneContent
          config={config}
          pallet={pallet}
          box={box}
          quality={quality}
          animationProgress={animationProgress}
          layerCount={config.layerCount}
        />

        <OrbitControls
          ref={controlsRef}
          target={[0, targetY, 0]}
          enableDamping
          dampingFactor={0.06}
          enablePan={!isMobile}
          enableZoom
          minDistance={0.4}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2.02}
          rotateSpeed={isMobile ? 0.6 : 0.9}
          zoomSpeed={isMobile ? 0.9 : 1.2}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />

        <CameraController
          cameraView={cameraView}
          autoRotate={autoRotate}
          controlsRef={controlsRef}
          targetY={targetY}
          maxDim={maxDim}
        />
      </Canvas>
    </div>
  );
};
