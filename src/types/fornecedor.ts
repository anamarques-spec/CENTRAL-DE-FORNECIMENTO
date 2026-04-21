export interface Fornecedor {
  id: string
  produto_id: string
  nome: string
  lead_time_dias: number
  capacidade_mensal: number
  created_at: string
}

export type FornecedorInsert = Omit<Fornecedor, 'id' | 'created_at'>
