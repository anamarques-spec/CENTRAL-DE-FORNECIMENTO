'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LabelList, ResponsiveContainer,
} from 'recharts'
import type { LabelProps } from 'recharts'
import { supabase } from '@/lib/supabase'

interface PedidoLite {
  fornecedor_nome: string
  produto_sku: string | null
  qtd_pendente: number
  previsao_atual: string | null
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function BarLabel(props: LabelProps) {
  const { x = 0, y = 0, width = 0, value = 0 } = props as { x: number; y: number; width: number; value: number }
  if (!value) return null
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill="#374151"
      fontSize={11}
      fontWeight={600}
      textAnchor="middle"
    >
      {value.toLocaleString('pt-BR')}
    </text>
  )
}

function getMesKey(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr + 'T12:00:00Z')
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const key = `${y}-${String(m).padStart(2, '0')}`
  const label = `${MESES[m - 1]}/${String(y).slice(2)}`
  return { key, label }
}

export default function CapacidadeChart() {
  const [pedidos, setPedidos] = useState<PedidoLite[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroFornecedor, setFiltroFornecedor] = useState('TODOS')
  const [filtroSKU, setFiltroSKU] = useState('TODOS')

  useEffect(() => {
    supabase
      .from('pedidos')
      .select('fornecedor_nome, produto_sku, qtd_pendente, previsao_atual')
      .gt('qtd_pendente', 0)
      .then(({ data }) => {
        setPedidos(data ?? [])
        setLoading(false)
      })
  }, [])

  const fornecedoresUnicos = useMemo(
    () => [...new Set(pedidos.map((p) => p.fornecedor_nome?.trim()).filter(Boolean))].sort() as string[],
    [pedidos]
  )

  // SKUs disponíveis respeitam o fornecedor já selecionado
  const skusUnicos = useMemo(() => {
    const base =
      filtroFornecedor === 'TODOS'
        ? pedidos
        : pedidos.filter((p) => p.fornecedor_nome?.trim() === filtroFornecedor)
    return [...new Set(base.map((p) => p.produto_sku ?? '').filter(Boolean))].sort()
  }, [pedidos, filtroFornecedor])

  const pedidosFiltrados = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          (filtroFornecedor === 'TODOS' || p.fornecedor_nome?.trim() === filtroFornecedor) &&
          (filtroSKU === 'TODOS' || p.produto_sku === filtroSKU)
      ),
    [pedidos, filtroFornecedor, filtroSKU]
  )

  const chartData = useMemo(() => {
    const mesMap = new Map<string, { label: string; pendente: number }>()
    for (const p of pedidosFiltrados) {
      if (!p.previsao_atual) continue
      const { key, label } = getMesKey(p.previsao_atual)
      if (!mesMap.has(key)) mesMap.set(key, { label, pendente: 0 })
      mesMap.get(key)!.pendente += p.qtd_pendente
    }
    return Array.from(mesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [pedidosFiltrados])

  const totalPendente = pedidosFiltrados.reduce((s, p) => s + p.qtd_pendente, 0)
  const filtroAtivo = filtroFornecedor !== 'TODOS' || filtroSKU !== 'TODOS'

  if (loading) return <p className="text-sm text-gray-400 py-4">Carregando gráfico...</p>
  if (pedidos.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Projeção de entregas por mês</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Unidades pendentes agrupadas pela Previsão Atual
          </p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={filtroFornecedor}
            onChange={(e) => {
              setFiltroFornecedor(e.target.value)
              setFiltroSKU('TODOS')
            }}
            className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="TODOS">Todos os fornecedores</option>
            {fornecedoresUnicos.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={filtroSKU}
            onChange={(e) => setFiltroSKU(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="TODOS">Todos os SKUs</option>
            {skusUnicos.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {filtroAtivo && (
            <button
              onClick={() => { setFiltroFornecedor('TODOS'); setFiltroSKU('TODOS') }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="flex gap-4">
        <div className="rounded bg-blue-50 border border-blue-100 px-3 py-2">
          <p className="text-xl font-bold text-blue-700">{totalPendente.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-blue-500">unidades pendentes</p>
        </div>
        {filtroFornecedor !== 'TODOS' && (
          <div className="rounded bg-gray-50 border border-gray-200 px-3 py-2 flex items-center">
            <p className="text-xs text-gray-500">
              Fornecedor: <span className="font-semibold text-gray-700">{filtroFornecedor}</span>
            </p>
          </div>
        )}
        {filtroSKU !== 'TODOS' && (
          <div className="rounded bg-gray-50 border border-gray-200 px-3 py-2 flex items-center">
            <p className="text-xs text-gray-500">
              SKU: <span className="font-semibold text-gray-700">{filtroSKU}</span>
            </p>
          </div>
        )}
      </div>

      {/* Gráfico */}
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          Nenhum pedido pendente para o filtro selecionado.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 28, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              width={65}
              tickFormatter={(v) => v.toLocaleString('pt-BR')}
            />
            <Tooltip
              formatter={(v) => [Number(v).toLocaleString('pt-BR') + ' unid.', 'Pendente']}
              labelFormatter={(l) => `Mês: ${l}`}
            />
            <Bar dataKey="pendente" name="Pendente" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="pendente" content={<BarLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
