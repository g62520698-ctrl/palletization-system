/**
 * CargaCerta v2 - Módulo de Paletização PBR
 * 
 * Calcula a paletização ideal baseada em um Lastro Mestre,
 * com amarração A/B e visualizações 2D/3D completas.
 */

import { useState } from 'react';
import { calculatePalletization, PALLET_WIDTH, PALLET_LENGTH, PALLET_HEIGHT } from '@/algorithms/paletizacao';
import type { PalletizationResult } from '@/algorithms/paletizacao';
import { formatNumber, formatPercent, formatWeight, formatDimension, getStabilityColor, getStabilityLabel, getEfficiencyColor } from '@/utils/formatters';
import PalletViz2D from './PalletViz2D';
import PalletViz3D from './PalletViz3D';
import styles from './PaletizacaoModule.module.css';

export default function PaletizacaoModule() {
  // Dimensões e peso da caixa
  const [boxLength, setBoxLength] = useState(40);
  const [boxWidth, setBoxWidth] = useState(30);
  const [boxHeight, setBoxHeight] = useState(20);
  const [boxWeight, setBoxWeight] = useState(10);

  // Restrições
  const [maxHeight, setMaxHeight] = useState(150);
  const [maxWeight, setMaxWeight] = useState(1000);

  // Resultado e visualização
  const [result, setResult] = useState<PalletizationResult | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [currentLayer, setCurrentLayer] = useState(0);

  const handleCalculate = () => {
    const r = calculatePalletization(boxLength, boxWidth, boxHeight, boxWeight, maxHeight, maxWeight);
    setResult(r);
    setCurrentLayer(0);
  };

  const stabilityColor = result ? getStabilityColor(result.stabilityIndex) : 'var(--text-tertiary)';
  const stabilityLabel = result ? getStabilityLabel(result.stabilityIndex) : '-';

  return (
    <div className={styles.module}>
      {/* Coluna Esquerda - Formulário */}
      <div className={styles.leftCol}>
        {/* Info do Pallet */}
        <div className={styles.palletInfo}>
          <span className={styles.palletInfoIcon}>🪵</span>
          <div className={styles.palletInfoText}>
            Pallet PBR: <span className={styles.palletInfoStrong}>{PALLET_WIDTH}×{PALLET_LENGTH} cm</span><br />
            Altura base: <span className={styles.palletInfoStrong}>{PALLET_HEIGHT} cm</span>
          </div>
        </div>

        {/* Card: Dimensões da Caixa */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconBlue}`}>📦</div>
            <h3 className={styles.cardTitle}>Dimensões da Caixa</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Comprimento (cm)</label>
                <input type="number" className={styles.input} value={boxLength}
                  onChange={e => setBoxLength(Number(e.target.value))} min={1} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Largura (cm)</label>
                <input type="number" className={styles.input} value={boxWidth}
                  onChange={e => setBoxWidth(Number(e.target.value))} min={1} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Altura (cm)</label>
                <input type="number" className={styles.input} value={boxHeight}
                  onChange={e => setBoxHeight(Number(e.target.value))} min={1} />
              </div>
            </div>
            <div className={styles.formRow2} style={{ marginTop: 12 }}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Peso (kg)</label>
                <input type="number" className={styles.input} value={boxWeight}
                  onChange={e => setBoxWeight(Number(e.target.value))} min={0.1} step={0.1} />
              </div>
            </div>
          </div>
        </div>

        {/* Card: Restrições */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconOrange}`}>⚙️</div>
            <h3 className={styles.cardTitle}>Restrições</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formRow2}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Altura máxima (cm)</label>
                <input type="number" className={styles.input} value={maxHeight}
                  onChange={e => setMaxHeight(Number(e.target.value))} min={PALLET_HEIGHT + 1} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Peso máximo (kg)</label>
                <input type="number" className={styles.input} value={maxWeight}
                  onChange={e => setMaxWeight(Number(e.target.value))} min={1} />
              </div>
            </div>
          </div>
        </div>

        {/* Botão Calcular */}
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`} onClick={handleCalculate}>
          ⚡ Calcular Paletização
        </button>

        {/* Dashboard */}
        {result && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.cardIconGreen}`}>📊</div>
              <h3 className={styles.cardTitle}>Dashboard</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.dashGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{result.boxesPerLayer}</div>
                  <div className={styles.metricLabel}>Caixas/Camada</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{result.totalLayers}</div>
                  <div className={styles.metricLabel}>Camadas</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatNumber(result.totalBoxes)}</div>
                  <div className={styles.metricLabel}>Total Caixas</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatWeight(result.totalWeight)}</div>
                  <div className={styles.metricLabel}>Peso Total</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue} style={{ color: getEfficiencyColor(result.coverage) }}>
                    {formatPercent(result.coverage)}
                  </div>
                  <div className={styles.metricLabel}>Cobertura</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatPercent(result.volumeEfficiency)}</div>
                  <div className={styles.metricLabel}>Eficiência</div>
                </div>
              </div>

              {/* Detalhes */}
              <div style={{ marginTop: 16 }}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Altura total</span>
                  <span className={styles.infoValue}>{formatDimension(result.totalHeight)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Amarração</span>
                  <span className={styles.infoValue}>{result.interlockingType}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Centro de gravidade</span>
                  <span className={styles.infoValue}>{result.cogX.toFixed(1)}×{result.cogY.toFixed(1)} cm</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Sequência</span>
                  <span className={styles.infoValue}>A/B/A/B ({result.totalLayers} camadas)</span>
                </div>
              </div>

              {/* Índice de estabilidade */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    ÍNDICE DE ESTABILIDADE
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: stabilityColor }}>
                    {result.stabilityIndex}/100 — {stabilityLabel}
                  </span>
                </div>
                <div className={styles.stabilityBar}>
                  <div
                    className={styles.stabilityFill}
                    style={{
                      width: `${result.stabilityIndex}%`,
                      background: `linear-gradient(90deg, ${stabilityColor}, ${stabilityColor}dd)`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coluna Direita - Visualização */}
      <div className={styles.rightCol}>
        <div className={styles.vizContainer}>
          <div className={styles.vizHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={styles.vizTitle}>
                {viewMode === '2d' ? '👁 Vista por Camada (2D)' : '🧊 Vista Isométrica (3D)'}
              </span>
              {result && viewMode === '2d' && (
                <div className={styles.layerNav}>
                  <button className={styles.layerBtn}
                    onClick={() => setCurrentLayer(Math.max(0, currentLayer - 1))}
                    disabled={currentLayer === 0}>◀</button>
                  <span className={styles.layerInfo}>
                    Camada {currentLayer + 1}
                    <span className={`${styles.patternBadge} ${result.layers[currentLayer]?.pattern === 'A' ? styles.patternA : styles.patternB}`}>
                      {result.layers[currentLayer]?.pattern}
                    </span>
                  </span>
                  <button className={styles.layerBtn}
                    onClick={() => setCurrentLayer(Math.min(result.totalLayers - 1, currentLayer + 1))}
                    disabled={currentLayer >= result.totalLayers - 1}>▶</button>
                </div>
              )}
            </div>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewBtn} ${viewMode === '2d' ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode('2d')}
              >
                2D
              </button>
              <button
                className={`${styles.viewBtn} ${viewMode === '3d' ? styles.viewBtnActive : ''}`}
                onClick={() => setViewMode('3d')}
              >
                3D
              </button>
            </div>
          </div>
          <div className={styles.vizBody}>
            {result ? (
              viewMode === '2d' ? (
                <PalletViz2D result={result} currentLayer={currentLayer} onLayerChange={setCurrentLayer} />
              ) : (
                <PalletViz3D result={result} />
              )
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🪵</div>
                <div className={styles.emptyTitle}>Nenhum cálculo realizado</div>
                <div className={styles.emptyText}>
                  Preencha as dimensões da caixa e as restrições, depois clique em Calcular.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
