'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { calcularRisco, RISCO_CLASSES, RISCO_LABEL, ROW_CLASSES } from '@/lib/risco'
import type { Produto, RiscoNivel } from '@/types/produto'
import FormCadastroProduto from './FormCadastroProduto'

export default function MatrizRiscoView() {
  if (!supabaseConfigured) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-6">
        <p className="font-semibold text-yellow-800">Configuração pendente</p>
        <p className="mt-1 text-sm text-yellow-700">
          Preencha <code className="font-mono bg-yellow-100 px-1 rounded">src/.env.local</code> com{' '}
          <code className="font-mono bg-yellow-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
          <code className="font-mono bg-yellow-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e reinicie o servidor.
        </p>
      </div>
    )
  }

  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [filtroRisco, setFiltroRisco] = useState<RiscoNivel | 'TODOS'>('TODOS')
  const [filtroCriticidade, setFiltroCriticidade] = useState<'A' | 'B' | 'C' | 'TODOS'>('TODOS')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false })
    setProdutos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const produtosFiltrados = produtos.filter((p) => {
    if (filtroRisco !== 'TODOS' && calcularRisco(p) !== filtroRisco) return false
    if (filtroCriticidade !== 'TODOS' && p.criticidade !== filtroCriticidade) return false
    return true
  })

  const contagem = {
    CRITICO: produtos.filter((p) => calcularRisco(p) === 'CRITICO').length,
    ATENCAO: produtos.filter((p) => calcularRisco(p) === 'ATENCAO').length,
    OK: produtos.filter((p) => calcularRisco(p) === 'OK').length,
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Crítico" count={contagem.CRITICO} color="red" onClick={() => setFiltroRisco('CRITICO')} />
        <SummaryCard label="Atenção" count={contagem.ATENCAO} color="yellow" onClick={() => setFiltroRisco('ATENCAO')} />
        <SummaryCard label="OK" count={contagem.OK} color="green" onClick={() => setFiltroRisco('OK')} />
      </div>

      {/* Ações e filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          {mostrarForm ? 'Fechar formulário' : '+ Adicionar produto'}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-500">Filtrar por:</span>
          <select
            value={filtroRisco}
            onChange={(e) => setFiltroRisco(e.target.value as RiscoNivel | 'TODOS')}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="TODOS">Todos os riscos</option>
            <option value="CRITICO">Crítico</option>
            <option value="ATENCAO">Atenção</option>
            <option value="OK">OK</option>
          </select>
          <select
            value={filtroCriticidade}
            onChange={(e) => setFiltroCriticidade(e.target.value as 'A' | 'B' | 'C' | 'TODOS')}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="TODOS">Curva A/B/C</option>
            <option value="A">Curva A</option>
            <option value="B">Curva B</option>
            <option value="C">Curva C</option>
          </select>
          {(filtroRisco !== 'TODOS' || filtroCriticidade !== 'TODOS') && (
            <button
              onClick={() => { setFiltroRisco('TODOS'); setFiltroCriticidade('TODOS') }}
              className="text-sm text-blue-600 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <FormCadastroProduto
          onSaved={() => {
            carregar()
            setMostrarForm(false)
          }}
        />
      )}

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {produtos.length === 0
            ? 'Nenhum produto cadastrado. Clique em "Adicionar produto" para começar.'
            : 'Nenhum produto corresponde aos filtros selecionados.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-center">Curva</th>
                <th className="px-4 py-3 text-left">Fornecedor principal</th>
                <th className="px-4 py-3 text-center">Forn. alt.</th>
                <th className="px-4 py-3 text-center">Lead time</th>
                <th className="px-4 py-3 text-center">Estoque (dias)</th>
                <th className="px-4 py-3 text-center">Vol. projetado</th>
                <th className="px-4 py-3 text-center">Capacidade</th>
                <th className="px-4 py-3 text-center">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produtosFiltrados.map((p) => {
                const risco = calcularRisco(p)
                return (
                  <tr key={p.id} className={`${ROW_CLASSES[risco]} hover:brightness-95`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{p.categoria}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold">{p.criticidade}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.fornecedor_principal}</td>
                    <td className="px-4 py-3 text-center">{p.qtd_fornecedores_alternativos}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={p.lead_time_dias > 15 ? 'text-orange-600 font-medium' : ''}>
                        {p.lead_time_dias}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{p.estoque_atual_dias}</td>
                    <td className="px-4 py-3 text-center">{p.volume_projetado_mensal.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={
                        p.capacidade_fornecedor_mensal > 0 && p.volume_projetado_mensal > p.capacidade_fornecedor_mensal
                          ? 'text-red-600 font-medium'
                          : ''
                      }>
                        {p.capacidade_fornecedor_mensal.toLocaleString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISCO_CLASSES[risco]}`}>
                        {RISCO_LABEL[risco]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label, count, color, onClick,
}: {
  label: string
  count: number
  color: 'red' | 'yellow' | 'green'
  onClick: () => void
}) {
  const colors = {
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  }
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 text-left hover:brightness-95 transition-all ${colors[color]}`}
    >
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </button>
  )
}
