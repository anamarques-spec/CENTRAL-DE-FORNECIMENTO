'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Produto } from '@/types/produto'
import type { Fornecedor, FornecedorInsert } from '@/types/fornecedor'

const EMPTY_FORM = { nome: '', lead_time_dias: 0, capacidade_mensal: 0 }

export default function FornecedoresView() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [{ data: prods }, { data: forns }] = await Promise.all([
      supabase.from('produtos').select('*').order('nome'),
      supabase.from('fornecedores').select('*').order('nome'),
    ])
    const lista = prods ?? []
    setProdutos(lista)
    setFornecedores(forns ?? [])
    if (!produtoSelecionado && lista.length > 0) setProdutoSelecionado(lista[0])
  }, [produtoSelecionado])

  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fornsDoP = produtoSelecionado
    ? fornecedores.filter((f) => f.produto_id === produtoSelecionado.id)
    : []

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
    carregar()
  }

  async function removerFornecedor(id: string) {
    await supabase.from('fornecedores').delete().eq('id', id)
    setFornecedores((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
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
                Curva {p.criticidade} · {count} fornecedor{count !== 1 ? 'es' : ''}
              </p>
            </button>
          )
        })}
        {produtos.length === 0 && (
          <p className="text-sm text-gray-400 px-4 py-6 text-center">Nenhum produto cadastrado.</p>
        )}
      </div>

      {/* Painel de fornecedores */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {!produtoSelecionado ? (
          <p className="text-gray-400 text-sm">Selecione um produto.</p>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{produtoSelecionado.nome}</h2>
              <p className="text-sm text-gray-500">Curva {produtoSelecionado.criticidade} · {fornsDoP.length} fornecedor{fornsDoP.length !== 1 ? 'es' : ''} cadastrado{fornsDoP.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Tabela de fornecedores */}
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
                        <td className="px-4 py-3 text-center">{f.lead_time_dias}d</td>
                        <td className="px-4 py-3 text-center">{f.capacidade_mensal.toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removerFornecedor(f.id)}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Formulário de adição */}
            <form onSubmit={adicionarFornecedor} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">Adicionar fornecedor</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 sm:col-span-1">
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
  )
}
