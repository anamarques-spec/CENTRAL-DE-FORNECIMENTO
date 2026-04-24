'use client'

import { Fragment, useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { DesembolsosResponse, MesDesembolso } from '@/app/api/desembolsos/route'

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

const CORES = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308']

export default function DesembolsosView() {
  const [data, setData] = useState<DesembolsosResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/desembolsos')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setErro(json.error)
        else setData(json as DesembolsosResponse)
        setLoading(false)
      })
      .catch(() => {
        setErro('Erro ao buscar dados.')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <p className="text-sm text-gray-400 py-8 text-center">Carregando desembolsos...</p>
  }

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

  const totalGeral = data.meses.reduce((s, m) => s + m.total, 0)
  const chartData = data.meses.map((m, i) => ({
    label: nomeMes(m.mes).split(' ')[0].replace(/^\w/, (c) => c.toUpperCase()),
    mes: m.mes,
    total: m.total,
    fill: CORES[i % CORES.length],
  }))

  function toggleMes(mes: string) {
    setExpandido((prev) => (prev === mes ? null : mes))
  }

  return (
    <div className="space-y-6">
      {/* Referência de data */}
      {data.ultima_data_registro && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <span className="text-amber-600 font-medium">Referência:</span>
          <span>Dados até pedidos registrados em</span>
          <span className="font-semibold text-amber-800">{formatData(data.ultima_data_registro)}</span>
        </div>
      )}

      {/* KPIs de topo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total previsto</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatBRL(totalGeral)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Meses com desembolso</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{data.meses.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Maior mês</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatBRL(Math.max(...data.meses.map((m) => m.total)))}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Média mensal</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {formatBRL(totalGeral / data.meses.length)}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Desembolso por mês</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              width={80}
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v) => [formatBRL(Number(v)), 'Desembolso']}
              labelFormatter={(l) => l}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela detalhada por mês */}
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
            {data.meses.map((m, i) => (
              <Fragment key={m.mes}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleMes(m.mes)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: CORES[i % CORES.length] }}
                    />
                    {nomeMes(m.mes)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatBRL(m.total)}
                  </td>
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
              <td className="px-4 py-3 text-right text-gray-900">{formatBRL(totalGeral)}</td>
              <td className="px-4 py-3 text-right text-gray-500">
                {data.meses.reduce((s, m) => s + m.parcelas.length, 0)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function DetalhesMes({ mes }: { mes: MesDesembolso }) {
  const fornecedores = Array.from(new Set(mes.parcelas.map((p) => p.fornecedor))).sort()

  return (
    <div className="border-t border-gray-200 divide-y divide-gray-100">
      {fornecedores.map((forn) => {
        const parcelasForn = mes.parcelas.filter((p) => p.fornecedor === forn)
        const totalForn = parcelasForn.reduce((s, p) => s + p.valor, 0)
        return (
          <div key={forn} className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{forn}</p>
              <p className="text-xs font-semibold text-blue-700">{formatBRL(totalForn)}</p>
            </div>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left pr-4 pb-1 font-normal">Pedido</th>
                  <th className="text-left pr-4 pb-1 font-normal">Produto</th>
                  <th className="text-right pr-4 pb-1 font-normal">Vencimento</th>
                  <th className="text-right pb-1 font-normal">Valor parcela</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {parcelasForn.map((p, i) => (
                  <tr key={i}>
                    <td className="pr-4 py-0.5 text-gray-500">#{p.pedido}</td>
                    <td className="pr-4 py-0.5 max-w-xs truncate">{p.produto}</td>
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
