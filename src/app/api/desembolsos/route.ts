import { NextResponse } from 'next/server'

const SHEET_ID = '11FigBoNh-joHtUB2gcAMyBo3W9DDrKSEB1lH-IUm3gg'
const SHEET_NAME = 'Relatorio para fornecedores'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseBR(s: string): number {
  return parseFloat((s ?? '').replace(/\./g, '').replace(',', '.')) || 0
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

function toYYYYMM(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

export interface Parcela {
  pedido: string
  fornecedor: string
  produto: string
  data_vencimento: string
  valor: number
  dia: number
}

export interface MesDesembolso {
  mes: string
  total: number
  parcelas: Parcela[]
}

export interface DesembolsosResponse {
  ultima_data_registro: string | null
  meses: MesDesembolso[]
}

export async function GET() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()

    if (text.trimStart().startsWith('<')) {
      return NextResponse.json(
        { error: 'Planilha não está pública. Compartilhe como "qualquer pessoa com o link pode visualizar".' },
        { status: 403 }
      )
    }

    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: 'Planilha sem dados.' }, { status: 400 })
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))

    const col = (name: string) => headers.indexOf(name)
    const I = {
      pedido: col('codigo_pedido'),
      fornecedor: col('fornecedor'),
      status: col('status'),
      condicao: col('condicao_pagamento'),
      data_base: col('data_base_pagamento'),
      data_registro: col('data_registro'),
      produto: col('nome_produto'),
      valor: col('valor_total_item'),
    }

    let ultimaDataRegistro: Date | null = null
    const parcelas: Parcela[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (!cols[I.status] || cols[I.status] !== 'Aberto') continue

      const dataRegistroStr = cols[I.data_registro] ?? ''
      if (dataRegistroStr) {
        const dr = new Date(dataRegistroStr + 'T12:00:00Z')
        if (!isNaN(dr.getTime()) && (!ultimaDataRegistro || dr > ultimaDataRegistro)) {
          ultimaDataRegistro = dr
        }
      }

      const condicao = cols[I.condicao] ?? ''
      const dataBaseStr = cols[I.data_base] ?? ''
      const valorTotal = parseBR(cols[I.valor] ?? '0')

      const dias = condicao
        .split('/')
        .map((d) => parseInt(d.trim()))
        .filter((d) => !isNaN(d) && d > 0)

      if (dias.length === 0 || !dataBaseStr || valorTotal === 0) continue

      const dataBase = new Date(dataBaseStr + 'T12:00:00Z')
      if (isNaN(dataBase.getTime())) continue

      const valorParcela = valorTotal / dias.length

      for (const dia of dias) {
        const dataParcela = addDays(dataBase, dia)
        const mes = toYYYYMM(dataParcela)
        if (mes < '2026-05') continue

        parcelas.push({
          pedido: cols[I.pedido] ?? '',
          fornecedor: cols[I.fornecedor] ?? '',
          produto: cols[I.produto] ?? '',
          data_vencimento: toISO(dataParcela),
          valor: valorParcela,
          dia,
        })
      }
    }

    const mesesMap = new Map<string, MesDesembolso>()
    for (const p of parcelas) {
      const mes = p.data_vencimento.slice(0, 7)
      if (!mesesMap.has(mes)) mesesMap.set(mes, { mes, total: 0, parcelas: [] })
      const m = mesesMap.get(mes)!
      m.total += p.valor
      m.parcelas.push(p)
    }

    const meses = Array.from(mesesMap.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((m) => ({
        ...m,
        total: Math.round(m.total * 100) / 100,
        parcelas: m.parcelas
          .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
          .map((p) => ({ ...p, valor: Math.round(p.valor * 100) / 100 })),
      }))

    const response: DesembolsosResponse = {
      ultima_data_registro: ultimaDataRegistro ? toISO(ultimaDataRegistro) : null,
      meses,
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'Erro ao conectar com o Google Sheets.' }, { status: 500 })
  }
}
