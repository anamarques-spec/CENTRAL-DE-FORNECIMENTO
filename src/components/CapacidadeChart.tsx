'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LabelList, ResponsiveContainer,
} from 'recharts'
import type { LabelProps } from 'recharts'
import { supabase } from '@/lib/supabase'

type TipoQtd = 'pendente' | 'enderecada' | 'total'

interface PedidoLite {
  fornecedor_nome: string
  produto_sku: string | null
  qtd_pendente: number
  qtd_enderecada: number
  previsao_atual: string | null
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const TIPO_LABELS: Record<TipoQtd, string> = {
  pendente: 'Qtd. Pendente',
  enderecada: 'Qtd. Endereçada',
  total: 'Total Geral',
}

function getMesInfo(dateStr: string): { key: string; label: string; ano: string } | null {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  return {
    key: `${y}-${String(m).padStart(2, '0')}`,
    label: `${MESES_ABREV[m - 1]}/${String(y).slice(2)}`,
    ano: String(y),
  }
}

function getQtd(p: PedidoLite, tipo: TipoQtd): number {
  const pend = p.qtd_pendente ?? 0
  const end = p.qtd_enderecada ?? 0
  if (tipo === 'pendente') return pend
  if (tipo === 'enderecada') return end
  return pend + end
}

function truncar(s: string, n = 28): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// Label em cima da barra vertical
function BarLabelTop(props: LabelProps) {
  const { x = 0, y = 0, width = 0, value = 0 } = props as { x: number; y: number; width: number; value: number }
  if (!value) return null
  return (
    <text x={x + width / 2} y={y - 5} fill="#374151" fontSize={11} fontWeight={600} textAnchor="middle">
      {Number(value).toLocaleString('pt-BR')}
    </text>
  )
}

// Label à direita da barra horizontal
function BarLabelRight(props: LabelProps) {
  const { x = 0, y = 0, width = 0, height = 0, value = 0 } = props as { x: number; y: number; width: number; height: number; value: number }
  if (!value) return null
  return (
    <text x={x + width + 6} y={y + height / 2 + 4} fill="#374151" fontSize={11} fontWeight={600}>
      {Number(value).toLocaleString('pt-BR')}
    </text>
  )
}

export default function CapacidadeChart() {
  const [pedidos, setPedidos] = useState<PedidoLite[]>([])
  const [loading, setLoading] = useState(true)
  const [semColunaEnderecada, setSemColunaEnderecada] = useState(false)

  const [tipoQtd, setTipoQtd] = useState<TipoQtd>('pendente')
  const [filtroAno, setFiltroAno] = useState('TODOS')
  const [filtroFornecedor, setFiltroFornecedor] = useState('TODOS')
  const [filtroSKU, setFiltroSKU] = useState('TODOS')
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('pedidos')
      .select('fornecedor_nome, produto_sku, qtd_pendente, qtd_enderecada, previsao_atual')
      .then(({ data, error }) => {
        if (error?.message?.includes('qtd_enderecada')) {
          // Coluna ainda não existe — busca sem ela
          setSemColunaEnderecada(true)
          supabase
            .from('pedidos')
            .select('fornecedor_nome, produto_sku, qtd_pendente, previsao_atual')
            .then(({ data: d2 }) => {
              setPedidos((d2 ?? []).map((r) => ({ ...r, qtd_enderecada: 0 })))
              setLoading(false)
            })
        } else {
          setPedidos(data ?? [])
          setLoading(false)
        }
      })
  }, [])

  const anosUnicos = useMemo(() => {
    const s = new Set<string>()
    for (const p of pedidos) {
      if (p.previsao_atual) {
        const info = getMesInfo(p.previsao_atual)
        if (info) s.add(info.ano)
      }
    }
    return Array.from(s).sort()
  }, [pedidos])

  const fornecedoresUnicos = useMemo(
    () => [...new Set(pedidos.map((p) => p.fornecedor_nome?.trim()).filter(Boolean))].sort() as string[],
    [pedidos]
  )

  const skusUnicos = useMemo(() => {
    const base = filtroFornecedor === 'TODOS'
      ? pedidos
      : pedidos.filter((p) => p.fornecedor_nome?.trim() === filtroFornecedor)
    return [...new Set(base.map((p) => p.produto_sku ?? '').filter(Boolean))].sort()
  }, [pedidos, filtroFornecedor])

  const pedidosFiltrados = useMemo(
    () =>
      pedidos.filter((p) => {
        if (!p.previsao_atual) return false
        const info = getMesInfo(p.previsao_atual)
        if (!info) return false
        if (filtroAno !== 'TODOS' && info.ano !== filtroAno) return false
        if (filtroFornecedor !== 'TODOS' && p.fornecedor_nome?.trim() !== filtroFornecedor) return false
        if (filtroSKU !== 'TODOS' && p.produto_sku !== filtroSKU) return false
        return true
      }),
    [pedidos, filtroAno, filtroFornecedor, filtroSKU]
  )

  // Gráfico mensal
  const chartMeses = useMemo(() => {
    const map = new Map<string, { key: string; label: string; qtd: number }>()
    for (const p of pedidosFiltrados) {
      const qtd = getQtd(p, tipoQtd)
      if (qtd <= 0) continue
      const info = getMesInfo(p.previsao_atual!)!
      if (!map.has(info.key)) map.set(info.key, { key: info.key, label: info.label, qtd: 0 })
      map.get(info.key)!.qtd += qtd
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [pedidosFiltrados, tipoQtd])

  // Gráfico por fornecedor (drill-down de mês)
  const chartFornecedores = useMemo(() => {
    if (!mesSelecionado) return []
    const map = new Map<string, { fornecedor: string; label: string; qtd: number }>()
    for (const p of pedidosFiltrados) {
      if (!p.previsao_atual) continue
      const info = getMesInfo(p.previsao_atual)
      if (!info || info.key !== mesSelecionado) continue
      const qtd = getQtd(p, tipoQtd)
      if (qtd <= 0) continue
      const forn = p.fornecedor_nome?.trim() ?? '(sem fornecedor)'
      if (!map.has(forn)) map.set(forn, { fornecedor: forn, label: truncar(forn), qtd: 0 })
      map.get(forn)!.qtd += qtd
    }
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd)
  }, [pedidosFiltrados, mesSelecionado, tipoQtd])

  const totalFiltrado = chartMeses.reduce((s, m) => s + m.qtd, 0)
  const mesLabel = mesSelecionado ? (chartMeses.find((m) => m.key === mesSelecionado)?.label ?? mesSelecionado) : null
  const filtroAtivo = filtroAno !== 'TODOS' || filtroFornecedor !== 'TODOS' || filtroSKU !== 'TODOS'

  if (loading) return <p className="text-sm text-gray-400 py-4">Carregando gráfico...</p>
  if (pedidos.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">

      {/* Aviso coluna ausente */}
      {semColunaEnderecada && (
        <div className="rounded bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
          <span className="font-semibold">Atenção:</span> a coluna <code>qtd_enderecada</code> não existe na tabela <code>pedidos</code> do Supabase.
          Execute <code>ALTER TABLE pedidos ADD COLUMN qtd_enderecada integer DEFAULT 0;</code> e sincronize novamente para habilitar os filtros de Qtd. Endereçada e Total Geral.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          {mesSelecionado ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <button onClick={() => setMesSelecionado(null)} className="text-xs text-blue-600 hover:text-blue-800">
                  ← Voltar
                </button>
                <span className="text-xs text-gray-300">|</span>
                <span className="text-xs text-gray-400">Por mês</span>
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Entregas por fornecedor — {mesLabel}
              </h2>
            </div>
          ) : (
            <div>
              <h2 className="text-base font-semibold text-gray-900">Projeção de entregas por mês</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Clique em uma barra para detalhar por fornecedor
              </p>
            </div>
          )}
        </div>

        {/* Tipo de quantidade */}
        <div className="flex gap-0.5 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          {(['pendente', 'enderecada', 'total'] as TipoQtd[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipoQtd(t)}
              disabled={semColunaEnderecada && t !== 'pendente'}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                tipoQtd === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros (só na view mensal) */}
      {!mesSelecionado && (
        <div className="flex gap-3 flex-wrap items-center">
          <select
            value={filtroAno}
            onChange={(e) => setFiltroAno(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="TODOS">Todos os anos</option>
            {anosUnicos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={filtroFornecedor}
            onChange={(e) => { setFiltroFornecedor(e.target.value); setFiltroSKU('TODOS') }}
            className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="TODOS">Todos os fornecedores</option>
            {fornecedoresUnicos.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <select
            value={filtroSKU}
            onChange={(e) => setFiltroSKU(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="TODOS">Todos os SKUs</option>
            {skusUnicos.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {filtroAtivo && (
            <button
              onClick={() => { setFiltroAno('TODOS'); setFiltroFornecedor('TODOS'); setFiltroSKU('TODOS') }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* KPI */}
      <div className="flex gap-3 flex-wrap">
        <div className="rounded bg-blue-50 border border-blue-100 px-3 py-2">
          <p className="text-xl font-bold text-blue-700">{totalFiltrado.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-blue-500">{TIPO_LABELS[tipoQtd].toLowerCase()}</p>
        </div>
        {mesSelecionado && (
          <div className="rounded bg-indigo-50 border border-indigo-100 px-3 py-2">
            <p className="text-xl font-bold text-indigo-700">{chartFornecedores.length}</p>
            <p className="text-xs text-indigo-500">fornecedores com entrega</p>
          </div>
        )}
      </div>

      {/* Gráfico mensal (view padrão) */}
      {!mesSelecionado && (
        chartMeses.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Nenhum pedido para o filtro selecionado.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartMeses}
              margin={{ top: 28, right: 20, left: 0, bottom: 0 }}
              onClick={(d) => { if (d?.activePayload?.[0]) setMesSelecionado(d.activePayload[0].payload.key) }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={65} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
              <Tooltip
                formatter={(v) => [Number(v).toLocaleString('pt-BR') + ' unid.', TIPO_LABELS[tipoQtd]]}
                labelFormatter={(l) => `Mês: ${l}`}
              />
              <Bar dataKey="qtd" name={TIPO_LABELS[tipoQtd]} fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="qtd" content={(props) => <BarLabelTop {...(props as LabelProps)} />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      )}

      {/* Gráfico por fornecedor (drill-down) */}
      {mesSelecionado && (
        chartFornecedores.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Nenhum pedido pendente neste mês.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, chartFornecedores.length * 48)}>
            <BarChart
              data={chartFornecedores}
              layout="vertical"
              margin={{ top: 8, right: 80, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
              <YAxis type="category" dataKey="label" width={190} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [Number(v).toLocaleString('pt-BR') + ' unid.', TIPO_LABELS[tipoQtd]]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fornecedor ?? ''}
              />
              <Bar dataKey="qtd" name={TIPO_LABELS[tipoQtd]} fill="#6366f1" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="qtd" content={(props) => <BarLabelRight {...(props as LabelProps)} />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      )}
    </div>
  )
}
