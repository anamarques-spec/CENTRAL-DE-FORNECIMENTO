'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { parseFornecedoresTab, parsePedidosTab } from '@/lib/parseFornecedoresSheet'
import type { Produto } from '@/types/produto'
import type { Fornecedor, FornecedorInsert } from '@/types/fornecedor'
import CapacidadeChart from './CapacidadeChart'

interface ResumoFornecedor {
  nome: string
  totalPendente: number
  proximaEntrega: string | null
  qtdLinhas: number
}

const EMPTY_FORM = { nome: '', lead_time_dias: 0, capacidade_mensal: 0 }

export default function FornecedoresView() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [resumoPedidos, setResumoPedidos] = useState<ResumoFornecedor[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // sync state
  const [syncStatus, setSyncStatus] = useState<'idle' | 'carregando' | 'preview' | 'importando' | 'done' | 'erro'>('idle')
  const [syncPreview, setSyncPreview] = useState<{ fornecedores: number; fornecedoresSkip: number; pedidos: number } | null>(null)
  const [syncErro, setSyncErro] = useState('')

  async function carregarPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('fornecedor_nome, qtd_pendente, previsao_atual')
      .gt('qtd_pendente', 0)

    if (!data) { setResumoPedidos([]); return }

    // Agrupa por fornecedor_nome
    const mapa = new Map<string, ResumoFornecedor>()
    for (const row of data) {
      const nome = row.fornecedor_nome?.trim() || '(sem fornecedor)'
      const atual = mapa.get(nome)
      if (!atual) {
        mapa.set(nome, { nome, totalPendente: row.qtd_pendente, proximaEntrega: row.previsao_atual, qtdLinhas: 1 })
      } else {
        atual.totalPendente += row.qtd_pendente
        atual.qtdLinhas += 1
        if (row.previsao_atual && (!atual.proximaEntrega || row.previsao_atual < atual.proximaEntrega)) {
          atual.proximaEntrega = row.previsao_atual
        }
      }
    }

    const lista = Array.from(mapa.values()).sort((a, b) => b.totalPendente - a.totalPendente)
    setResumoPedidos(lista)
  }

  const carregarBase = useCallback(async () => {
    const [{ data: prods }, { data: forns }] = await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('fornecedores').select('*').order('nome'),
    ])
    const lista = prods ?? []
    setProdutos(lista)
    setFornecedores(forns ?? [])
    if (!produtoSelecionado && lista.length > 0) setProdutoSelecionado(lista[0])
    await carregarPedidos()
  }, [produtoSelecionado]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregarBase() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fornsDoP = produtoSelecionado
    ? fornecedores.filter((f) => f.produto_id === produtoSelecionado.id)
    : []

  // ── Sync do Google Sheets ──────────────────────────────────────────
  async function iniciarSync() {
    setSyncStatus('carregando')
    setSyncErro('')
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/fornecedores-sheets?tab=fornecedores'),
        fetch('/api/fornecedores-sheets?tab=pedidos'),
      ])
      if (!r1.ok || !r2.ok) throw new Error('Erro ao buscar planilha. Verifique se está pública.')

      const [csv1, csv2] = await Promise.all([r1.text(), r2.text()])
      const fornRows = parseFornecedoresTab(csv1)
      const pedRows = parsePedidosTab(csv2)

      // Quantos produtos existem na base para fazer o match
      const { data: prodExistentes } = await supabase.from('produtos').select('id,nome')
      const nomeParaId = new Map((prodExistentes ?? []).map((p) => [p.nome.trim(), p.id]))
      const matchados = fornRows.filter((r) => nomeParaId.has(r.produtoNome))
      const skip = fornRows.length - matchados.length

      setSyncPreview({ fornecedores: matchados.length, fornecedoresSkip: skip, pedidos: pedRows.length })
      setSyncStatus('preview')
    } catch (e: unknown) {
      setSyncErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setSyncStatus('erro')
    }
  }

  async function confirmarSync() {
    setSyncStatus('importando')
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/fornecedores-sheets?tab=fornecedores'),
        fetch('/api/fornecedores-sheets?tab=pedidos'),
      ])
      const [csv1, csv2] = await Promise.all([r1.text(), r2.text()])
      const fornRows = parseFornecedoresTab(csv1)
      const pedRows = parsePedidosTab(csv2)

      const { data: prodExistentes } = await supabase.from('produtos').select('id,nome')
      const nomeParaId = new Map((prodExistentes ?? []).map((p) => [p.nome.trim(), p.id]))

      // Upsert fornecedores por (produto_id, nome)
      const fornInsertar: FornecedorInsert[] = fornRows
        .filter((r) => nomeParaId.has(r.produtoNome))
        .map((r) => ({
          produto_id: nomeParaId.get(r.produtoNome)!,
          nome: r.fornecedorNome,
          lead_time_dias: r.leadTimeDias,
          capacidade_mensal: 0,
        }))

      if (fornInsertar.length > 0) {
        await supabase.from('fornecedores').upsert(fornInsertar, { onConflict: 'produto_id,nome' })
      }

      // Upsert pedidos em lotes de 500 (Supabase tem limite por requisição)
      const LOTE = 500
      for (let i = 0; i < pedRows.length; i += LOTE) {
        const lote = pedRows.slice(i, i + LOTE).map((r) => ({
          cod: r.cod,
          pedido: r.pedido,
          produto_sku: r.produtoSku,
          fornecedor_nome: r.fornecedorNome,
          qtd_solicitada: r.qtdSolicitada,
          qtd_pendente: r.qtdPendente,
          previsao_atual: r.previsaoAtual,
          data_compra: r.dataCompra,
        }))
        await supabase.from('pedidos').upsert(lote, { onConflict: 'cod' })
      }

      setSyncStatus('done')
      carregarBase()
    } catch (e: unknown) {
      setSyncErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setSyncStatus('erro')
    }
  }

  // ── Fornecedor manual ──────────────────────────────────────────────
  async function adicionarFornecedor(e: React.FormEvent) {
    e.preventDefault()
    if (!produtoSelecionado || !form.nome.trim()) return
    setSalvando(true)
    setErro('')
    const novo: FornecedorInsert = { produto_id: produtoSelecionado.id, ...form }
    const { error } = await supabase.from('fornecedores').insert([novo])
    setSalvando(false)
    if (error) { setErro(error.message); return }
    setForm(EMPTY_FORM)
    carregarBase()
  }

  async function removerFornecedor(id: string) {
    await supabase.from('fornecedores').delete().eq('id', id)
    setFornecedores((prev) => prev.filter((f) => f.id !== id))
  }

  const totalGeralPendente = resumoPedidos.reduce((s, r) => s + r.totalPendente, 0)

  return (
    <div className="space-y-6">
      {/* Gráfico de capacidade e projeção */}
      <CapacidadeChart />

      {/* Painel de Sync */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Google Sheets — Fornecedores e Entregas</p>
            <p className="text-xs text-gray-400 mt-0.5">Importa fornecedores por produto + pedidos pendentes</p>
          </div>
          {(syncStatus === 'idle' || syncStatus === 'erro' || syncStatus === 'done') && (
            <button
              onClick={iniciarSync}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              {syncStatus === 'done' ? 'Sincronizar novamente' : 'Sincronizar do Sheets'}
            </button>
          )}
          {syncStatus === 'carregando' && <span className="text-sm text-gray-500">Buscando dados...</span>}
          {syncStatus === 'importando' && <span className="text-sm text-gray-500">Importando...</span>}
        </div>

        {syncStatus === 'preview' && syncPreview && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded bg-blue-50 border border-blue-200 p-3">
                <p className="text-2xl font-bold text-blue-700">{syncPreview.fornecedores}</p>
                <p className="text-xs text-blue-600 mt-0.5">fornecedores para importar</p>
              </div>
              <div className="rounded bg-gray-50 border border-gray-200 p-3">
                <p className="text-2xl font-bold text-gray-500">{syncPreview.fornecedoresSkip}</p>
                <p className="text-xs text-gray-400 mt-0.5">produtos não encontrados na base</p>
              </div>
              <div className="rounded bg-blue-50 border border-blue-200 p-3">
                <p className="text-2xl font-bold text-blue-700">{syncPreview.pedidos.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-blue-600 mt-0.5">pedidos para importar</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmarSync} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Confirmar importação
              </button>
              <button onClick={() => setSyncStatus('idle')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {syncStatus === 'done' && (
          <p className="mt-3 text-sm text-green-700 font-medium">Importação concluída com sucesso.</p>
        )}
        {syncStatus === 'erro' && (
          <p className="mt-3 text-sm text-red-600">{syncErro}</p>
        )}
      </div>

      {/* Master-detail */}
      <div className="flex gap-6" style={{ minHeight: '60vh' }}>
        {/* Lista de produtos */}
        <div className="w-64 shrink-0 bg-white border border-gray-200 rounded-lg overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Produtos</p>
          </div>
          {produtos.map((p) => {
            const count = fornecedores.filter((f) => f.produto_id === p.id).length
            const ativo = produtoSelecionado?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => setProdutoSelecionado(p)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${ativo ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <p className={`text-sm font-medium truncate ${ativo ? 'text-blue-700' : 'text-gray-800'}`}>{p.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Curva {p.criticidade} · {count} forn.
                </p>
              </button>
            )
          })}
          {produtos.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">Nenhum produto.</p>
          )}
        </div>

        {/* Painel direito */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          {!produtoSelecionado ? (
            <p className="text-gray-400 text-sm">Selecione um produto.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{produtoSelecionado.nome}</h2>
                <p className="text-sm text-gray-500">
                  Curva {produtoSelecionado.criticidade} · {fornsDoP.length} fornecedor{fornsDoP.length !== 1 ? 'es' : ''}
                </p>
              </div>

              {/* Fornecedores */}
              {fornsDoP.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Fornecedor</th>
                        <th className="px-4 py-3 text-center">Lead time</th>
                        <th className="px-4 py-3 text-center">Capacidade/mês</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fornsDoP.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{f.nome}</td>
                          <td className="px-4 py-3 text-center">{f.lead_time_dias > 0 ? `${f.lead_time_dias}d` : '—'}</td>
                          <td className="px-4 py-3 text-center">{f.capacidade_mensal > 0 ? f.capacidade_mensal.toLocaleString('pt-BR') : '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => removerFornecedor(f.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline">
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Form adicionar fornecedor manualmente */}
              <form onSubmit={adicionarFornecedor} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">Adicionar fornecedor manualmente</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-600">Nome *</span>
                    <input type="text" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} required className="input" placeholder="Ex: Fornecedor ABC" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-600">Lead time (dias)</span>
                    <input type="number" min={0} value={form.lead_time_dias} onChange={(e) => setForm((p) => ({ ...p, lead_time_dias: Number(e.target.value) }))} className="input" />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-600">Capacidade/mês (unid.)</span>
                    <input type="number" min={0} value={form.capacidade_mensal} onChange={(e) => setForm((p) => ({ ...p, capacidade_mensal: Number(e.target.value) }))} className="input" />
                  </label>
                </div>
                {erro && <p className="text-sm text-red-600">{erro}</p>}
                <button type="submit" disabled={salvando} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Adicionar fornecedor'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ── Entregas pendentes por fornecedor (global) ── */}
      {resumoPedidos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Entregas pendentes por fornecedor</h2>
            <span className="text-sm text-gray-500">
              {resumoPedidos.length} fornecedores ·{' '}
              <span className="font-medium text-gray-700">
                {totalGeralPendente.toLocaleString('pt-BR')} unidades no total
              </span>
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Fornecedor</th>
                  <th className="px-4 py-3 text-center">Pedidos em aberto</th>
                  <th className="px-4 py-3 text-right">Total pendente (unid.)</th>
                  <th className="px-4 py-3 text-center">Próxima entrega prevista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resumoPedidos.map((r) => (
                  <tr key={r.nome} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nome}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{r.qtdLinhas}</td>
                    <td className="px-4 py-3 text-right font-semibold text-orange-700">
                      {r.totalPendente.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {r.proximaEntrega
                        ? new Date(r.proximaEntrega + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
