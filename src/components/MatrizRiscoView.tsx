'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { calcularRisco, RISCO_CLASSES, RISCO_LABEL, ROW_CLASSES } from '@/lib/risco'
import type { Produto, RiscoNivel } from '@/types/produto'
import ModalAdicionarProduto from './ModalAdicionarProduto'

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

  return <MatrizRiscoConteudo />
}

function MatrizRiscoConteudo() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornCount, setFornCount] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [filtroRisco, setFiltroRisco] = useState<RiscoNivel | 'TODOS'>('TODOS')
  const [filtroCriticidade, setFiltroCriticidade] = useState<'A' | 'B' | 'C' | 'TODOS'>('TODOS')

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: forns }] = await Promise.all([
      supabase.from('produtos').select('*').order('meta_faturamento_anual', { ascending: false }),
      supabase.from('fornecedores').select('produto_id'),
    ])
    setProdutos(prods ?? [])
    const mapa = new Map<string, number>()
    for (const f of forns ?? []) {
      mapa.set(f.produto_id, (mapa.get(f.produto_id) ?? 0) + 1)
    }
    setFornCount(mapa)
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const totalMeta = produtos.reduce((s, p) => s + (p.meta_faturamento_anual ?? 0), 0)

  function risco(p: Produto) {
    return calcularRisco(p, totalMeta, fornCount.get(p.id) ?? 0)
  }

  async function salvarCampo(id: string, campo: string, valor: string) {
    const numericFields = ['lead_time_dias', 'capacidade_fornecedor_mensal', 'qtd_vendida_anual']
    const parsed = numericFields.includes(campo) ? Number(valor) : valor
    await supabase.from('produtos').update({ [campo]: parsed }).eq('id', id)
    setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, [campo]: parsed } : p))
  }

  const produtosFiltrados = produtos.filter((p) => {
    if (filtroRisco !== 'TODOS' && risco(p) !== filtroRisco) return false
    if (filtroCriticidade !== 'TODOS' && p.criticidade !== filtroCriticidade) return false
    return true
  })

  const contagem = {
    CRITICO: produtos.filter((p) => risco(p) === 'CRITICO').length,
    ATENCAO: produtos.filter((p) => risco(p) === 'ATENCAO').length,
    OK: produtos.filter((p) => risco(p) === 'OK').length,
  }

  return (
    <div className="space-y-6">
      {mostrarModal && (
        <ModalAdicionarProduto
          onClose={() => setMostrarModal(false)}
          onSaved={carregar}
        />
      )}

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Crítico" count={contagem.CRITICO} color="red" onClick={() => setFiltroRisco('CRITICO')} />
        <SummaryCard label="Atenção" count={contagem.ATENCAO} color="yellow" onClick={() => setFiltroRisco('ATENCAO')} />
        <SummaryCard label="OK" count={contagem.OK} color="green" onClick={() => setFiltroRisco('OK')} />
      </div>

      {/* Ações e filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setMostrarModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          + Adicionar produto
        </button>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <span className="text-sm text-gray-500">Filtrar:</span>
          <select value={filtroRisco} onChange={(e) => setFiltroRisco(e.target.value as RiscoNivel | 'TODOS')} className="text-sm border border-gray-300 rounded px-2 py-1">
            <option value="TODOS">Todos os riscos</option>
            <option value="CRITICO">Crítico</option>
            <option value="ATENCAO">Atenção</option>
            <option value="OK">OK</option>
          </select>
          <select value={filtroCriticidade} onChange={(e) => setFiltroCriticidade(e.target.value as 'A' | 'B' | 'C' | 'TODOS')} className="text-sm border border-gray-300 rounded px-2 py-1">
            <option value="TODOS">Curva A/B/C</option>
            <option value="A">Curva A</option>
            <option value="B">Curva B</option>
            <option value="C">Curva C</option>
          </select>
          {(filtroRisco !== 'TODOS' || filtroCriticidade !== 'TODOS') && (
            <button onClick={() => { setFiltroRisco('TODOS'); setFiltroCriticidade('TODOS') }} className="text-sm text-blue-600 hover:underline">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {produtos.length === 0
            ? 'Nenhum produto cadastrado. Clique em "+ Adicionar produto" para começar.'
            : 'Nenhum produto corresponde aos filtros.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-center">Curva</th>
                <th className="px-4 py-3 text-left">Categoria</th>
                <th className="px-4 py-3 text-left">Fornecedor principal</th>
                <th className="px-4 py-3 text-center">Nº Forn.</th>
                <th className="px-4 py-3 text-center">Lead time</th>
                <th className="px-4 py-3 text-center">Qtd vendida/ano</th>
                <th className="px-4 py-3 text-right">Tkt médio</th>
                <th className="px-4 py-3 text-center">Vol. proj./mês</th>
                <th className="px-4 py-3 text-center">Capacidade/mês</th>
                <th className="px-4 py-3 text-right">Meta anual</th>
                <th className="px-4 py-3 text-center">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {produtosFiltrados.map((p) => {
                const r = risco(p)
                const qtdForn = fornCount.get(p.id) ?? 0
                const tktMedio = p.qtd_vendida_anual > 0 && p.meta_faturamento_anual > 0
                  ? Math.round((p.meta_faturamento_anual / p.qtd_vendida_anual) * 0.8)
                  : null
                const volProjetado = p.qtd_vendida_anual > 0
                  ? Math.round((p.qtd_vendida_anual / 12) * 1.2)
                  : null
                const capExcedida = volProjetado !== null && p.capacidade_fornecedor_mensal > 0 && volProjetado > p.capacidade_fornecedor_mensal

                return (
                  <tr key={p.id} className={`${ROW_CLASSES[r]} hover:brightness-95`}>
                    <td className="px-4 py-2 font-medium text-gray-900 max-w-[180px] truncate" title={p.nome}>{p.nome}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="font-semibold">{p.criticidade}</span>
                    </td>
                    <td className="px-4 py-2">
                      <InlineEditCell value={p.categoria} onSave={(v) => salvarCampo(p.id, 'categoria', v)} />
                    </td>
                    <td className="px-4 py-2">
                      <InlineEditCell value={p.fornecedor_principal} onSave={(v) => salvarCampo(p.id, 'fornecedor_principal', v)} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Link href="/fornecedores" className={`font-medium hover:underline ${qtdForn === 0 ? 'text-gray-300' : 'text-blue-600'}`}>
                        {qtdForn}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <InlineEditCell value={p.lead_time_dias} type="number" suffix="d" onSave={(v) => salvarCampo(p.id, 'lead_time_dias', v)} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <InlineEditCell value={p.qtd_vendida_anual} type="number" onSave={(v) => salvarCampo(p.id, 'qtd_vendida_anual', v)} />
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {tktMedio !== null
                        ? tktMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {volProjetado !== null
                        ? <span className={capExcedida ? 'text-red-600 font-medium' : ''}>{volProjetado.toLocaleString('pt-BR')}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <InlineEditCell value={p.capacidade_fornecedor_mensal} type="number" onSave={(v) => salvarCampo(p.id, 'capacidade_fornecedor_mensal', v)} />
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600 text-xs">
                      {p.meta_faturamento_anual > 0
                        ? p.meta_faturamento_anual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISCO_CLASSES[r]}`}>
                        {RISCO_LABEL[r]}
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

function InlineEditCell({
  value, type = 'text', suffix, onSave,
}: {
  value: string | number
  type?: 'text' | 'number'
  suffix?: string
  onSave: (val: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(value ?? ''))

  useEffect(() => { setVal(String(value ?? '')) }, [value])

  async function save() {
    setEditing(false)
    if (String(value ?? '') !== val) await onSave(val)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setVal(String(value ?? '')); setEditing(false) }
        }}
        className="w-full min-w-[70px] border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none"
      />
    )
  }

  const display = type === 'number' && Number(value) === 0 ? null : value
  return (
    <span
      onClick={() => setEditing(true)}
      title="Clique para editar"
      className={`cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 block ${!display ? 'text-gray-300 italic text-xs' : 'text-gray-700'}`}
    >
      {display ? `${display}${suffix ?? ''}` : 'Editar'}
    </span>
  )
}

function SummaryCard({ label, count, color, onClick }: { label: string; count: number; color: 'red' | 'yellow' | 'green'; onClick: () => void }) {
  const colors = { red: 'bg-red-50 border-red-200 text-red-700', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700', green: 'bg-green-50 border-green-200 text-green-700' }
  return (
    <button onClick={onClick} className={`rounded-lg border p-4 text-left hover:brightness-95 transition-all ${colors[color]}`}>
      <p className="text-3xl font-bold">{count}</p>
      <p className="text-sm font-medium mt-1">{label}</p>
    </button>
  )
}
