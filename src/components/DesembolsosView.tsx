'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import type { DesembolsosResponse, MesDesembolso, Parcela } from '@/app/api/desembolsos/route'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatData(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function nomeMes(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function nomeMesCurto(yyyymm: string) {
  const [y, m] = yyyymm.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

function recomputarMeses(parcelas: Parcela[]): MesDesembolso[] {
  const map = new Map<string, MesDesembolso>()
  for (const p of parcelas) {
    const mes = p.data_vencimento.slice(0, 7)
    if (!map.has(mes)) map.set(mes, { mes, total: 0, parcelas: [] })
    const m = map.get(mes)!
    m.total += p.valor
    m.parcelas.push(p)
  }
  return Array.from(map.values())
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => ({
      ...m,
      total: Math.round(m.total * 100) / 100,
      parcelas: m.parcelas.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)),
    }))
}

const CORES_MES = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308']
const CORES_DIA: Record<number, string> = { 30: '#22c55e', 60: '#3b82f6', 90: '#f59e0b', 120: '#ef4444' }

export default function DesembolsosView() {
  const [data, setData] = useState<DesembolsosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [filtroFornecedor, setFiltroFornecedor] = useState('TODOS')
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/desembolsos')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setErro(json.error)
        else setData(json as DesembolsosResponse)
        setLoading(false)
      })
      .catch(() => { setErro('Erro ao buscar dados.'); setLoading(false) })
  }, [])

  const todasParcelas = useMemo(
    () => data?.meses.flatMap((m) => m.parcelas) ?? [],
    [data]
  )

  const fornecedores = useMemo(
    () => [...new Set(todasParcelas.map((p) => p.fornecedor))].sort(),
    [todasParcelas]
  )

  const parcelasFiltradas = useMemo(
    () =>
      filtroFornecedor === 'TODOS'
        ? todasParcelas
        : todasParcelas.filter((p) => p.fornecedor === filtroFornecedor),
    [todasParcelas, filtroFornecedor]
  )

  const mesesFiltrados = useMemo(() => recomputarMeses(parcelasFiltradas), [parcelasFiltradas])

  const totalFiltrado = useMemo(
    () => parcelasFiltradas.reduce((s, p) => s + p.valor, 0),
    [parcelasFiltradas]
  )

  // Prazo médio simples: por pedido único, calcula média dos prazos (ex: 30/60/90 → 60).
  // Depois tira a média entre todos os pedidos.
  const prazoMedio = useMemo(() => {
    const ordens = new Map<string, Set<number>>()
    for (const p of parcelasFiltradas) {
      const key = `${p.pedido}|||${p.fornecedor}`
      if (!ordens.has(key)) ordens.set(key, new Set())
      ordens.get(key)!.add(p.dia)
    }
    const medias = Array.from(ordens.values()).map((dias) => {
      const arr = Array.from(dias)
      return arr.reduce((s, d) => s + d, 0) / arr.length
    })
    if (medias.length === 0) return 0
    return Math.round(medias.reduce((s, m) => s + m, 0) / medias.length)
  }, [parcelasFiltradas])

  // Evolução do prazo médio DDL por mês de formalização (data_registro)
  const evolucaoDDL = useMemo(() => {
    // Agrupa por (pedido, fornecedor) → coleta dias únicos e data_registro
    const ordens = new Map<string, { mesRegistro: string; dias: Set<number> }>()
    for (const p of parcelasFiltradas) {
      const key = `${p.pedido}|||${p.fornecedor}`
      if (!ordens.has(key)) {
        const mesRegistro = p.data_registro ? p.data_registro.slice(0, 7) : ''
        ordens.set(key, { mesRegistro, dias: new Set() })
      }
      ordens.get(key)!.dias.add(p.dia)
    }
    // Agrupa por mês de formalização → lista de prazos médios por pedido
    const porMes = new Map<string, number[]>()
    for (const { mesRegistro, dias } of ordens.values()) {
      if (!mesRegistro) continue
      const arr = Array.from(dias)
      const media = arr.reduce((s, d) => s + d, 0) / arr.length
      if (!porMes.has(mesRegistro)) porMes.set(mesRegistro, [])
      porMes.get(mesRegistro)!.push(media)
    }
    return Array.from(porMes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, medias]) => ({
        mes,
        label: nomeMesCurto(mes),
        ddl: Math.round(medias.reduce((s, m) => s + m, 0) / medias.length),
      }))
  }, [parcelasFiltradas])

  // Combinações produto com totais por mês (para tabela de detalhamento)
  const combinacoes = useMemo(() => {
    const map = new Map<string, { produto: string; fornecedor: string; total: number; porMes: Map<string, number> }>()
    for (const p of parcelasFiltradas) {
      const key = `${p.fornecedor}|||${p.produto}`
      if (!map.has(key)) map.set(key, { produto: p.produto, fornecedor: p.fornecedor, total: 0, porMes: new Map() })
      const c = map.get(key)!
      c.total += p.valor
      const mes = p.data_vencimento.slice(0, 7)
      c.porMes.set(mes, (c.porMes.get(mes) ?? 0) + p.valor)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [parcelasFiltradas])

  const mesesLabels = useMemo(() => mesesFiltrados.map((m) => m.mes), [mesesFiltrados])

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Carregando desembolsos...</p>

  if (erro) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-700">Erro ao carregar</p>
        <p className="text-sm text-red-600 mt-1">{erro}</p>
      </div>
    )
  }

  if (!data || data.meses.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">Nenhum desembolso encontrado a partir de maio/2026.</p>
  }

  const chartData = mesesFiltrados.map((m, i) => ({
    label: nomeMesCurto(m.mes),
    total: m.total,
    fill: CORES_MES[i % CORES_MES.length],
  }))

  return (
    <div className="space-y-6">

      {/* Referência */}
      {data.ultima_data_registro && (
        <div className="flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-amber-600 font-medium">Referência:</span>
          <span className="text-gray-600">Dados até pedidos registrados em</span>
          <span className="font-semibold text-amber-800">{formatData(data.ultima_data_registro)}</span>
        </div>
      )}

      {/* Filtro por fornecedor */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-5 py-4">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Fornecedor</label>
        <select
          value={filtroFornecedor}
          onChange={(e) => setFiltroFornecedor(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400 min-w-[260px]"
        >
          <option value="TODOS">Todos os fornecedores</option>
          {fornecedores.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        {filtroFornecedor !== 'TODOS' && (
          <button
            onClick={() => setFiltroFornecedor('TODOS')}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Limpar
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total previsto</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatBRL(totalFiltrado)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Prazo médio</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {prazoMedio > 0 ? `${prazoMedio} DDL` : '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Maior mês</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {mesesFiltrados.length > 0 ? formatBRL(Math.max(...mesesFiltrados.map((m) => m.total))) : '—'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Média mensal</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {mesesFiltrados.length > 0 ? formatBRL(totalFiltrado / mesesFiltrados.length) : '—'}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Desembolso por mês</h2>
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum resultado para o filtro selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatBRL(Number(v)), 'Desembolso']} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Evolução DDL por mês de formalização */}
      {evolucaoDDL.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Evolução do prazo médio (DDL) por mês de formalização</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pedidos agrupados pelo mês em que foram registrados — eixo Y: DDL médio do grupo
            </p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolucaoDDL} margin={{ top: 16, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                width={48}
                domain={['auto', 'auto']}
                tickFormatter={(v) => `${v}d`}
              />
              <Tooltip
                formatter={(v) => [`${v} DDL`, 'Prazo médio']}
                labelFormatter={(l) => `Mês: ${l}`}
              />
              <ReferenceLine
                y={75}
                stroke="#ef4444"
                strokeDasharray="6 3"
                label={{ value: 'Meta: 75 DDL', position: 'right', fontSize: 11, fill: '#ef4444' }}
              />
              <Line
                type="monotone"
                dataKey="ddl"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3b82f6' }}
                activeDot={{ r: 6 }}
                name="DDL médio"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela mensal com expansão */}
      {mesesFiltrados.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Mês</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Parcelas</th>
                <th className="px-4 py-3 text-center">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mesesFiltrados.map((m, i) => (
                <Fragment key={m.mes}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandido((prev) => (prev === m.mes ? null : m.mes))}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                        style={{ backgroundColor: CORES_MES[i % CORES_MES.length] }}
                      />
                      {nomeMes(m.mes)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatBRL(m.total)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{m.parcelas.length}</td>
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">
                      {expandido === m.mes ? '▲ fechar' : '▼ ver'}
                    </td>
                  </tr>
                  {expandido === m.mes && (
                    <tr>
                      <td colSpan={4} className="px-0 py-0 bg-gray-50">
                        <DetalhesMes mes={m} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 text-sm font-semibold">
              <tr>
                <td className="px-4 py-3 text-gray-700">Total geral</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatBRL(totalFiltrado)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {mesesFiltrados.reduce((s, m) => s + m.parcelas.length, 0)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Detalhamento por produto */}
      {combinacoes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Detalhamento por produto</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {combinacoes.length} produto{combinacoes.length !== 1 ? 's' : ''} · desembolso projetado por mês
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  {filtroFornecedor === 'TODOS' && (
                    <th className="px-4 py-3 text-left whitespace-nowrap">Fornecedor</th>
                  )}
                  <th className="px-4 py-3 text-left whitespace-nowrap">Produto</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                  {mesesLabels.map((mes) => (
                    <th key={mes} className="px-3 py-3 text-right whitespace-nowrap text-gray-400">
                      {nomeMesCurto(mes)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {combinacoes.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {filtroFornecedor === 'TODOS' && (
                      <td className="px-4 py-2.5 text-gray-700 text-xs max-w-[160px] truncate" title={c.fornecedor}>
                        {c.fornecedor}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[220px] truncate" title={c.produto}>
                      {c.produto}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatBRL(c.total)}
                    </td>
                    {mesesLabels.map((mes) => {
                      const v = c.porMes.get(mes) ?? 0
                      return (
                        <td key={mes} className="px-3 py-2.5 text-right whitespace-nowrap text-xs">
                          {v > 0
                            ? <span className="font-medium text-blue-700">{formatBRL(v)}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 text-xs font-semibold text-gray-600">
                <tr>
                  {filtroFornecedor === 'TODOS' && <td />}
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatBRL(totalFiltrado)}</td>
                  {mesesLabels.map((mes) => {
                    const v = combinacoes.reduce((s, c) => s + (c.porMes.get(mes) ?? 0), 0)
                    return (
                      <td key={mes} className="px-3 py-3 text-right whitespace-nowrap">
                        {v > 0 ? formatBRL(v) : <span className="text-gray-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function DetalhesMes({ mes }: { mes: MesDesembolso }) {
  const fornecedores = [...new Set(mes.parcelas.map((p) => p.fornecedor))].sort()
  return (
    <div className="border-t border-gray-200 divide-y divide-gray-100">
      {fornecedores.map((forn) => {
        const parcs = mes.parcelas.filter((p) => p.fornecedor === forn)
        const total = parcs.reduce((s, p) => s + p.valor, 0)
        return (
          <div key={forn} className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{forn}</p>
              <p className="text-xs font-semibold text-blue-700">{formatBRL(total)}</p>
            </div>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left pr-4 pb-1 font-normal">Ped.</th>
                  <th className="text-left pr-4 pb-1 font-normal">Produto</th>
                  <th className="text-right pr-4 pb-1 font-normal">Prazo</th>
                  <th className="text-right pr-4 pb-1 font-normal">Vencimento</th>
                  <th className="text-right pb-1 font-normal">Valor parcela</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {parcs.map((p, i) => (
                  <tr key={i}>
                    <td className="pr-4 py-0.5 text-gray-500">#{p.pedido}</td>
                    <td className="pr-4 py-0.5 max-w-xs truncate">{p.produto}</td>
                    <td className="pr-4 py-0.5 text-right">
                      <span
                        className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                        style={{ backgroundColor: CORES_DIA[p.dia] ?? '#94a3b8' }}
                      >
                        {p.dia}d
                      </span>
                    </td>
                    <td className="pr-4 py-0.5 text-right">{formatData(p.data_vencimento)}</td>
                    <td className="py-0.5 text-right font-medium">{formatBRL(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
