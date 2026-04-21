import type { Produto, RiscoNivel } from '@/types/produto'

export function calcularRisco(p: Produto): RiscoNivel {
  const fornecedorUnico = p.qtd_fornecedores_alternativos === 0
  const leadTimeAlto = p.lead_time_dias > 15
  const capacidadeExcedida = p.volume_projetado_mensal > p.capacidade_fornecedor_mensal && p.capacidade_fornecedor_mensal > 0

  // Produto representativo (curva A) com único fornecedor = risco crítico
  if (p.criticidade === 'A' && fornecedorUnico) return 'CRITICO'
  // Volume projetado ultrapassa capacidade do fornecedor = risco crítico
  if (capacidadeExcedida) return 'CRITICO'
  // Lead time alto = atenção
  if (leadTimeAlto) return 'ATENCAO'
  // Produto curva B com único fornecedor = atenção
  if (p.criticidade === 'B' && fornecedorUnico) return 'ATENCAO'

  return 'OK'
}

export const RISCO_LABEL: Record<RiscoNivel, string> = {
  CRITICO: 'Crítico',
  ATENCAO: 'Atenção',
  OK: 'OK',
}

export const RISCO_CLASSES: Record<RiscoNivel, string> = {
  CRITICO: 'bg-red-100 text-red-800 border border-red-300',
  ATENCAO: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  OK: 'bg-green-100 text-green-800 border border-green-300',
}

export const ROW_CLASSES: Record<RiscoNivel, string> = {
  CRITICO: 'bg-red-50',
  ATENCAO: 'bg-yellow-50',
  OK: '',
}
