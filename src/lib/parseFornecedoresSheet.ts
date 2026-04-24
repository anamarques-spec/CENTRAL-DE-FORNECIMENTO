export interface FornecedorRow {
  fornecedorNome: string
  produtoNome: string
  leadTimeDias: number
}

export interface PedidoRow {
  cod: string
  pedido: string
  produtoSku: string
  fornecedorNome: string
  qtdSolicitada: number
  qtdPendente: number
  qtdEnderecada: number
  previsaoAtual: string | null
  dataCompra: string | null
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += ch }
  }
  result.push(current)
  return result.map((v) => v.trim())
}

// "20/04/2026" → "2026-04-20"
function parseDateBR(str: string): string | null {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

// Aba "Fornecedor por produto": FORNECEDOR, Produto, LEAD TIME (DIAS), ...
export function parseFornecedoresTab(csvText: string): FornecedorRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim())
  const result: FornecedorRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const fornecedorNome = cols[0]
    const produtoNome = cols[1]
    const leadTimeDias = parseInt(cols[2]) || 0
    if (!fornecedorNome || fornecedorNome.toUpperCase() === 'N/A' || !produtoNome) continue
    result.push({ fornecedorNome, produtoNome, leadTimeDias })
  }
  return result
}

// Aba "Entregas pendentes":
// 0=Data_de_Compra, 1=Pedido, 2=Produto(SKU), 5=Qtd_Solicitada,
// 9=Previsao_Atual, 10=Cod, 12=Qtd_Enderecada, 13=Qtd_Pendente_ofc, 14=source_spreadsheet(fornecedor)
export function parsePedidosTab(csvText: string): PedidoRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim())
  const result: PedidoRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const cod = cols[10]
    if (!cod) continue
    result.push({
      cod,
      pedido: cols[1] ?? '',
      produtoSku: cols[2] ?? '',
      fornecedorNome: cols[14] ?? '',
      qtdSolicitada: parseInt(cols[5]) || 0,
      qtdPendente: parseInt(cols[13]) || 0,
      qtdEnderecada: parseInt(cols[12]) || 0,
      previsaoAtual: parseDateBR(cols[9] ?? ''),
      dataCompra: parseDateBR(cols[0] ?? ''),
    })
  }
  return result
}
