/**
 * CargaCerta v2 - Utilitários de Formatação
 */

/** Formata número com separador de milhares brasileiro */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formata valor como porcentagem */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Formata valor como volume (cm³) */
export function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(3)} m³`;
  }
  return `${formatNumber(value, 0)} cm³`;
}

/** Formata valor como dimensão (cm) */
export function formatDimension(value: number): string {
  return `${value.toFixed(1)} cm`;
}

/** Formata valor como peso (kg) */
export function formatWeight(value: number): string {
  return `${formatNumber(value, 1)} kg`;
}

/** Retorna a classe de cor para um valor de eficiência */
export function getEfficiencyColor(value: number): string {
  if (value >= 80) return 'var(--success)';
  if (value >= 60) return 'var(--warning)';
  return 'var(--error)';
}

/** Retorna a classe de cor para o índice de estabilidade */
export function getStabilityColor(value: number): string {
  if (value >= 75) return 'var(--success)';
  if (value >= 50) return 'var(--warning)';
  return 'var(--error)';
}

/** Retorna o label do status de estabilidade */
export function getStabilityLabel(value: number): string {
  if (value >= 80) return 'Excelente';
  if (value >= 60) return 'Bom';
  if (value >= 40) return 'Regular';
  return 'Baixo';
}
