export type Criticidade = 'A' | 'B' | 'C'
export type RiscoNivel = 'CRITICO' | 'ATENCAO' | 'OK'

export interface Produto {
  id: string
  nome: string
  categoria: string
  criticidade: Criticidade
  fornecedor_principal: string
  qtd_fornecedores_alternativos: number
  lead_time_dias: number
  estoque_atual_dias: number
  volume_projetado_mensal: number
  capacidade_fornecedor_mensal: number
  created_at: string
}

export type ProdutoInsert = Omit<Produto, 'id' | 'created_at'>
