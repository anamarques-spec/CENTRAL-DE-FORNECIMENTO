export interface Pedido {
  id: string
  cod: string
  pedido: string
  produto_sku: string
  fornecedor_nome: string
  qtd_solicitada: number
  qtd_pendente: number
  previsao_atual: string | null
  data_compra: string | null
}
