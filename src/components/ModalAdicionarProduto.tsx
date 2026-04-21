'use client'

import { useState } from 'react'
import FormCadastroProduto from './FormCadastroProduto'
import SincronizarPlanilha from './SincronizarPlanilha'

type Opcao = 'escolha' | 'manual' | 'sheets'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function ModalAdicionarProduto({ onClose, onSaved }: Props) {
  const [opcao, setOpcao] = useState<Opcao>('escolha')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {opcao === 'escolha' && 'Adicionar produtos'}
            {opcao === 'manual' && 'Adicionar manualmente'}
            {opcao === 'sheets' && 'Importar do Google Sheets'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6">
          {opcao === 'escolha' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setOpcao('sheets')}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
              >
                <span className="text-3xl">📊</span>
                <div>
                  <p className="font-semibold text-gray-900">Google Sheets</p>
                  <p className="text-sm text-gray-500 mt-0.5">Importar da aba "Meta Cloude" com classificação ABC automática</p>
                </div>
              </button>
              <button
                onClick={() => setOpcao('manual')}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-gray-200 p-6 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
              >
                <span className="text-3xl">✏️</span>
                <div>
                  <p className="font-semibold text-gray-900">Manual</p>
                  <p className="text-sm text-gray-500 mt-0.5">Cadastrar produto individualmente com todos os campos</p>
                </div>
              </button>
            </div>
          )}

          {opcao === 'manual' && (
            <div>
              <button onClick={() => setOpcao('escolha')} className="text-sm text-blue-600 hover:underline mb-4 block">← Voltar</button>
              <FormCadastroProduto onSaved={() => { onSaved(); onClose() }} />
            </div>
          )}

          {opcao === 'sheets' && (
            <div>
              <button onClick={() => setOpcao('escolha')} className="text-sm text-blue-600 hover:underline mb-4 block">← Voltar</button>
              <SincronizarPlanilha onSaved={() => { onSaved(); onClose() }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
