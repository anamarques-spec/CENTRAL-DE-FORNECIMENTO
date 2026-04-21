import type { Produto, RiscoNivel } from '@/types/produto'

// Risco = representatividade no faturamento total × nº de fornecedores
// Tabela:
//            | 0-1 forn  | 2 forn   | 3+ forn  |
// > 5% total | CRÍTICO   | CRÍTICO  | ATENÇÃO  |
// 1-5% total | CRÍTICO   | ATENÇÃO  | OK       |
// < 1% total | ATENÇÃO   | OK       | OK       |
export function calcularRisco(
  produto: Produto,
  totalMetaGeral: number,
  qtdFornecedores: number
): RiscoNivel {
  const rep = totalMetaGeral > 0 ? produto.meta_faturamento_anual / totalMetaGeral : 0

  const repNivel = rep > 0.05 ? 'alta' : rep >= 0.01 ? 'media' : 'baixa'
  const fornNivel = qtdFornecedores <= 1 ? 'unico' : qtdFornecedores === 2 ? 'dois' : 'multiplos'

  if (repNivel === 'alta' && (fornNivel === 'unico' || fornNivel === 'dois')) return 'CRITICO'
  if (repNivel === 'alta') return 'ATENCAO'
  if (repNivel === 'media' && fornNivel === 'unico') return 'CRITICO'
  if (repNivel === 'media' && fornNivel === 'dois') return 'ATENCAO'
  if (repNivel === 'baixa' && fornNivel === 'unico') return 'ATENCAO'
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
