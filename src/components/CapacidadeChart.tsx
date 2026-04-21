'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'

interface PedidoLite {
  fornecedor_nome: string
  qtd_pendente: number
  previsao_atual: string | null
}

interface WeekData {
  semana: string
  dateKey: string
  pendente: number
}

// "2026-04-20" → { key: "2026-04-20" (Monday), label: "20/04" }
function getMondayKey(dateStr: string): { key: string; label: string } {
  const d = new Date(dateStr + 'T12:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  const key = d.toISOString().split('T')[0]
  const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
  return { key, label }
}

const CORES = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16']

export default function CapacidadeChart() {
  const [pedidos, setPedidos] = useState<PedidoLite[]>([])
  const [capacidades, setCapacidades] = useState<Map<string, number>>(new Map())
  const [fornSelecionado, setFornSelecionado] = useState<string>('TODOS')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('pedidos')
        .select('fornecedor_nome, qtd_pendente, previsao_atual')
        .gt('qtd_pendente', 0),
      supabase
        .from('fornecedores')
        .select('nome, capacidade_mensal')
        .gt('capacidade_mensal', 0),
    ]).then(([{ data: peds }, { data: forns }]) => {
      setPedidos(peds ?? [])
      // Agrupa capacidade_mensal por fornecedor (pode ter múltiplas entradas)
      const cap = new Map<string, number>()
      for (const f of forns ?? []) {
        const nome = f.nome.trim()
        cap.set(nome, (cap.get(nome) ?? 0) + f.capacidade_mensal)
      }
      setCapacidades(cap)
      setLoading(false)
    })
  }, [])

  const fornecedoresUnicos = useMemo(() => {
    const s = new Set(pedidos.map((p) => p.fornecedor_nome?.trim()).filter(Boolean))
    return Array.from(s).sort()
  }, [pedidos])

  // Dados para visão "TODOS": stacked bar por fornecedor
  const chartTodos = useMemo((): Array<Record<string, string | number>> => {
    const weekMap = new Map<string, { label: string; data: Map<string, number> }>()
    for (const p of pedidos) {
      if (!p.previsao_atual) continue
      const { key, label } = getMondayKey(p.previsao_atual)
      if (!weekMap.has(key)) weekMap.set(key, { label, data: new Map() })
      const forn = p.fornecedor_nome?.trim() ?? '—'
      const week = weekMap.get(key)!
      week.data.set(forn, (week.data.get(forn) ?? 0) + p.qtd_pendente)
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { label, data }]) => {
        const row: Record<string, string | number> = { semana: label, dateKey: key }
        data.forEach((v, k) => { row[k] = v })
        return row
      })
  }, [pedidos])

  // Dados para visão individual
  const chartIndividual = useMemo((): WeekData[] => {
    if (fornSelecionado === 'TODOS') return []
    const weekMap = new Map<string, { label: string; pendente: number }>()
    for (const p of pedidos) {
      if (p.fornecedor_nome?.trim() !== fornSelecionado || !p.previsao_atual) continue
      const { key, label } = getMondayKey(p.previsao_atual)
      const atual = weekMap.get(key)
      if (!atual) weekMap.set(key, { label, pendente: p.qtd_pendente })
      else atual.pendente += p.qtd_pendente
    }
    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ dateKey: key, semana: v.label, pendente: v.pendente }))
  }, [pedidos, fornSelecionado])

  const capMensal = capacidades.get(fornSelecionado) ?? 0
  const capSemanal = capMensal > 0 ? Math.round(capMensal / 4.33) : 0

  if (loading) return <p className="text-sm text-gray-400 py-4">Carregando gráfico...</p>
  if (pedidos.length === 0) return null

  const isTodos = fornSelecionado === 'TODOS'
  const chartData = isTodos ? chartTodos : chartIndividual
  const totalPendenteForn = chartIndividual.reduce((s, r) => s + r.pendente, 0)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Projeção de entregas por semana</h2>
          <p className="text-xs text-gray-400 mt-0.5">Unidades pendentes agrupadas pela semana da Previsão Atual</p>
        </div>
        <select
          value={fornSelecionado}
          onChange={(e) => setFornSelecionado(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:border-blue-400"
        >
          <option value="TODOS">Todos os fornecedores</option>
          {fornecedoresUnicos.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Indicadores */}
      {!isTodos && (
        <div className="flex gap-4 text-sm">
          <div className="rounded bg-blue-50 border border-blue-100 px-3 py-2">
            <p className="text-xl font-bold text-blue-700">{totalPendenteForn.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-blue-500">unidades pendentes</p>
          </div>
          {capSemanal > 0 ? (
            <div className="rounded bg-gray-50 border border-gray-200 px-3 py-2">
              <p className="text-xl font-bold text-gray-700">{capSemanal.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">capacidade/semana</p>
            </div>
          ) : (
            <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 flex items-center">
              <p className="text-xs text-amber-700">Capacidade não cadastrada — configure na aba Fornecedores</p>
            </div>
          )}
        </div>
      )}

      {/* Gráfico */}
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Nenhum pedido pendente para este fornecedor.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {isTodos ? (
            <BarChart data={chartTodos} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
              <Tooltip formatter={(v) => [Number(v).toLocaleString('pt-BR') + ' unid.']} labelFormatter={(l) => `Semana de ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {fornecedoresUnicos.map((forn, i) => (
                <Bar key={forn} dataKey={forn} stackId="a" fill={CORES[i % CORES.length]} radius={i === fornecedoresUnicos.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <BarChart data={chartIndividual} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => v.toLocaleString('pt-BR')} />
              <Tooltip
                formatter={(v) => [Number(v).toLocaleString('pt-BR') + ' unid.', 'Pendente']}
                labelFormatter={(l) => `Semana de ${l}`}
              />
              {capSemanal > 0 && (
                <ReferenceLine
                  y={capSemanal}
                  stroke="#ef4444"
                  strokeDasharray="6 3"
                  label={{ value: `Cap. ${capSemanal.toLocaleString('pt-BR')}`, position: 'right', fontSize: 10, fill: '#ef4444' }}
                />
              )}
              <Bar dataKey="pendente" name="Pendente" radius={[4, 4, 0, 0]}>
                {chartIndividual.map((entry, i) => (
                  <Cell key={i} fill={capSemanal > 0 && entry.pendente > capSemanal ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
}
