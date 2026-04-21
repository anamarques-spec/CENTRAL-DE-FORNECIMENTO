'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ProdutoInsert } from '@/types/produto'

const EMPTY: ProdutoInsert = {
  nome: '',
  categoria: '',
  criticidade: 'B',
  fornecedor_principal: '',
  qtd_fornecedores_alternativos: 0,
  lead_time_dias: 0,
  estoque_atual_dias: 0,
  volume_projetado_mensal: 0,
  capacidade_fornecedor_mensal: 0,
}

interface Props {
  onSaved: () => void
}

export default function FormCadastroProduto({ onSaved }: Props) {
  const [form, setForm] = useState<ProdutoInsert>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function set(field: keyof ProdutoInsert, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    const { error } = await supabase.from('produtos').insert([form])

    setLoading(false)
    if (error) {
      setErro(error.message)
      return
    }
    setForm(EMPTY)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Cadastrar produto</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Nome do produto" required>
          <input
            type="text"
            value={form.nome}
            onChange={(e) => set('nome', e.target.value)}
            required
            className="input"
            placeholder="Ex: Parafuso M8"
          />
        </Field>

        <Field label="Categoria" required>
          <input
            type="text"
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
            required
            className="input"
            placeholder="Ex: Fixação"
          />
        </Field>

        <Field label="Criticidade (curva ABC)" required>
          <select
            value={form.criticidade}
            onChange={(e) => set('criticidade', e.target.value as 'A' | 'B' | 'C')}
            className="input"
          >
            <option value="A">A — Alta representatividade</option>
            <option value="B">B — Média representatividade</option>
            <option value="C">C — Baixa representatividade</option>
          </select>
        </Field>

        <Field label="Fornecedor principal" required>
          <input
            type="text"
            value={form.fornecedor_principal}
            onChange={(e) => set('fornecedor_principal', e.target.value)}
            required
            className="input"
            placeholder="Ex: Fornecedor XYZ"
          />
        </Field>

        <Field label="Fornecedores alternativos (qtd)">
          <input
            type="number"
            min={0}
            value={form.qtd_fornecedores_alternativos}
            onChange={(e) => set('qtd_fornecedores_alternativos', Number(e.target.value))}
            className="input"
          />
        </Field>

        <Field label="Lead time (dias)">
          <input
            type="number"
            min={0}
            value={form.lead_time_dias}
            onChange={(e) => set('lead_time_dias', Number(e.target.value))}
            className="input"
          />
        </Field>

        <Field label="Estoque atual (dias de cobertura)">
          <input
            type="number"
            min={0}
            value={form.estoque_atual_dias}
            onChange={(e) => set('estoque_atual_dias', Number(e.target.value))}
            className="input"
          />
        </Field>

        <Field label="Volume projetado mensal (unid.)">
          <input
            type="number"
            min={0}
            value={form.volume_projetado_mensal}
            onChange={(e) => set('volume_projetado_mensal', Number(e.target.value))}
            className="input"
          />
        </Field>

        <Field label="Capacidade do fornecedor mensal (unid.)">
          <input
            type="number"
            min={0}
            value={form.capacidade_fornecedor_mensal}
            onChange={(e) => set('capacidade_fornecedor_mensal', Number(e.target.value))}
            className="input"
          />
        </Field>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar produto'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
