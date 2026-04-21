export interface ProdutoMeta {
  nome: string
  total: number
  curva: 'A' | 'B' | 'C'
  percentualTotal: number
  tktMedio: number
  cobertura: number
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
  return result
}

function parseBRL(val: string): number {
  return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0
}

export function parseMetasCSV(csvText: string): ProdutoMeta[] {
  const lines = csvText.split(/\r?\n/)
  if (lines.length < 2) return []

  const header = parseCSVLine(lines[0])
  const totalIdx = header.length - 1

  const rows: Array<{ nome: string; total: number }> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cols = parseCSVLine(line)
    const nome = cols[0].trim()
    if (!nome) continue
    const total = parseBRL(cols[totalIdx])
    if (total <= 0) continue
    rows.push({ nome, total })
  }

  if (rows.length === 0) return []

  rows.sort((a, b) => b.total - a.total)
  const totalGeral = rows.reduce((s, r) => s + r.total, 0)

  let acumulado = 0
  return rows.map((r) => {
    acumulado += r.total
    const pct = acumulado / totalGeral
    const curva: 'A' | 'B' | 'C' = pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C'
    return {
      nome: r.nome,
      total: r.total,
      curva,
      percentualTotal: r.total / totalGeral,
      tktMedio: Math.round(r.total * 0.8),
      cobertura: Math.round(r.total * 1.2),
    }
  })
}
