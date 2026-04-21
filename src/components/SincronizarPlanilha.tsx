'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { parseMetasCSV, type ProdutoMeta } from '@/lib/parseSheet'

type Estado = 'idle' | 'buscando' | 'preview' | 'salvando' | 'sucesso' | 'erro'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function pct(v: number) {
  return (v * 100).toFixed(1) + '%'
}

const CURVA_CLASSES: Record<string, string> = {
  A: 'bg-red-100 text-red-800',
  B: 'bg-yellow-100 text-yellow-800',
  C: 'bg-green-100 text-green-800',
}

export default function SincronizarPlanilha() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>('idle')
  const [produtos, setProdutos] = useState<ProdutoMeta[]>([])
  const [erro, setErro] = useState('')
  const [importados, setImportados] = useState(0)

  async function buscar() {
    setEstado('buscando')
    setErro('')
    try {
      const res = await fetch('/api/sincronizar')
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Erro desconhecido')
      }
      const csv = await res.text()
      const parsed = parseMetasCSV(csv)
      if (parsed.length === 0) throw new Error('Nenhum produto com faturamento encontrado na aba.')
      setProdutos(parsed)
      setEstado('preview')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setEstado('erro')
    }
  }

  async function importar() {
    setEstado('salvando')
    const registros = produtos.map((p) => ({
      nome: p.nome,
      categoria: 'Importado',
      criticidade: p.curva,
      fornecedor_principal: '',
      qtd_fornecedores_alternativos: 0,
      lead_time_dias: 0,
      estoque_atual_dias: 0,
      volume_projetado_mensal: 0,
      capacidade_fornecedor_mensal: 0,
      meta_faturamento_anual: p.total,
    }))

    const { error, count } = await supabase
      .from('produtos')
      .upsert(registros, { onConflict: 'nome', count: 'exact' })

    if (error) {
      setErro(error.message)
      setEstado('erro')
      return
    }
    setImportados(count ?? registros.length)
    setEstado('sucesso')
  }

  const contagem = {
    A: produtos.filter((p) => p.curva === 'A').length,
    B: produtos.filter((p) => p.curva === 'B').length,
    C: produtos.filter((p) => p.curva === 'C').length,
  }

  if (estado === 'sucesso') {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-6 space-y-3">
        <p className="font-semibold text-green-800">{importados} produtos importados com sucesso.</p>
        <p className="text-sm text-green-700">
          Curva A: {contagem.A} · Curva B: {contagem.B} · Curva C: {contagem.C}
        </p>
        <button
          onClick={() => router.push('/matriz-risco')}
          className="mt-2 px-4 py-2 bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-800"
        >
          Ver matriz de risco →
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Planilha conectada</h2>
        <p className="text-sm text-gray-500">Aba: <span className="font-medium">Metas Cloude</span></p>
        <p className="text-xs text-gray-400 font-mono break-all">
          docs.google.com/spreadsheets/d/1VRjfwP7MpzKnXNNuUKtmGumaRPs7nHb3-N_3PVcYwjM
        </p>
        <button
          onClick={buscar}
          disabled={estado === 'buscando'}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {estado === 'buscando' ? 'Buscando dados...' : 'Sincronizar agora'}
        </button>
        {estado === 'erro' && (
          <p className="text-sm text-red-600">{erro}</p>
        )}
      </div>

      {estado === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm">
              <span className="font-medium">{produtos.length} produtos encontrados</span>
              <span className="text-red-700 font-medium">Curva A: {contagem.A}</span>
              <span className="text-yellow-700 font-medium">Curva B: {contagem.B}</span>
              <span className="text-green-700 font-medium">Curva C: {contagem.C}</span>
            </div>
            <button
              onClick={importar}
              disabled={estado !== 'preview'}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Importar {produtos.length} produtos
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-right">Meta anual</th>
                  <th className="px-4 py-3 text-right">% do total</th>
                  <th className="px-4 py-3 text-center">Curva</th>
                  <th className="px-4 py-3 text-right">Tkt médio (×0,8)</th>
                  <th className="px-4 py-3 text-right">Cobertura (×1,2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produtos.map((p) => (
                  <tr key={p.nome} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{p.nome}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatBRL(p.total)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{pct(p.percentualTotal)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CURVA_CLASSES[p.curva]}`}>
                        {p.curva}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatBRL(p.tktMedio)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatBRL(p.cobertura)}</td>
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
