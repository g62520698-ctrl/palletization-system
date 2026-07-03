/**
 * CargaCerta v2 - Módulo de Endereçamento
 * 
 * Calcula a melhor orientação de caixas em um espaço de armazenamento,
 * com visualizações 2D e 3D e dashboard de indicadores.
 */

import { useState } from 'react';
import { calculateAddressing, getOrientationLabel } from '@/algorithms/enderecamento';
import type { AddressingResult } from '@/algorithms/enderecamento';
import { formatNumber, formatVolume, formatPercent, getEfficiencyColor } from '@/utils/formatters';
import AddressViz2D from './AddressViz2D';
import AddressViz3D from './AddressViz3D';
import styles from './EnderecamentoModule.module.css';

export default function EnderecamentoModule() {
  // Dimensões do endereço
  const [addrLength, setAddrLength] = useState(120);
  const [addrWidth, setAddrWidth] = useState(80);
  const [addrHeight, setAddrHeight] = useState(200);

  // Dimensões da caixa
  const [boxLength, setBoxLength] = useState(30);
  const [boxWidth, setBoxWidth] = useState(20);
  const [boxHeight, setBoxHeight] = useState(15);

  // Resultado e visualização
  const [result, setResult] = useState<AddressingResult | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  const handleCalculate = () => {
    const r = calculateAddressing(
      { length: addrLength, width: addrWidth, height: addrHeight },
      { length: boxLength, width: boxWidth, height: boxHeight }
    );
    setResult(r);
  };

  return (
    <div className={styles.module}>
      {/* Coluna Esquerda - Formulário */}
      <div className={styles.leftCol}>
        {/* Card: Dimensões do Endereço */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconBlue}`}>📐</div>
            <h3 className={styles.cardTitle}>Dimensão do Endereço</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Comprimento (cm)</label>
                <input type="number" className={styles.input} value={addrLength}
                  onChange={e => setAddrLength(Number(e.target.value))} min={1} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Largura (cm)</label>
                <input type="number" className={styles.input} value={addrWidth}
                  onChange={e => setAddrWidth(Number(e.target.value))} min={1} />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Altura (cm)</label>
                <input type="number" className={styles.input} value={addrHeight}
                  onChange={e => setAddrHeight(Number(e.target.value))} min={1} />
              </div>
            </div>
          </div>
        </div>

        {/* Card: Dimensões da Caixa */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconGreen}`}>📦</div>
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
          </div>
        </div>

        {/* Botão Calcular */}
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`} onClick={handleCalculate}>
          ⚡ Calcular Endereçamento
        </button>

        {/* Dashboard */}
        {result && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.cardIconOrange}`}>📊</div>
              <h3 className={styles.cardTitle}>Resultados</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.dashGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatNumber(result.quantity)}</div>
                  <div className={styles.metricLabel}>Quantidade</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue} style={{ color: getEfficiencyColor(result.efficiency) }}>
                    {formatPercent(result.efficiency)}
                  </div>
                  <div className={styles.metricLabel}>Eficiência</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatVolume(result.volumeOccupied)}</div>
                  <div className={styles.metricLabel}>Vol. Ocupado</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatVolume(result.volumeFree)}</div>
                  <div className={styles.metricLabel}>Vol. Livre</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{formatPercent(result.coverage)}</div>
                  <div className={styles.metricLabel}>Cobertura</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{result.fitX}×{result.fitY}×{result.fitZ}</div>
                  <div className={styles.metricLabel}>Distribuição</div>
                </div>
              </div>
              <div className={styles.orientBadge}>
                🔄 Orientação: {getOrientationLabel(result.bestOrientation.perm, result.boxDims)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coluna Direita - Visualização */}
      <div className={styles.rightCol}>
        <div className={styles.vizContainer}>
          <div className={styles.vizHeader}>
            <span className={styles.vizTitle}>
              {viewMode === '2d' ? '👁 Vista Superior (2D)' : '🧊 Vista Isométrica (3D)'}
            </span>
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
                <AddressViz2D result={result} />
              ) : (
                <AddressViz3D result={result} />
              )
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📐</div>
                <div className={styles.emptyTitle}>Nenhum cálculo realizado</div>
                <div className={styles.emptyText}>
                  Preencha as dimensões do endereço e da caixa, depois clique em Calcular.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
