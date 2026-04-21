import SincronizarPlanilha from '@/components/SincronizarPlanilha'

export const metadata = { title: 'Importar — Central de Fornecimento' }

export default function ImportarPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sincronizar com Google Sheets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Importa produtos da aba "Meta Cloude", classifica em curva A/B/C e gera a matriz de risco
        </p>
      </div>
      <SincronizarPlanilha />
    </main>
  )
}
