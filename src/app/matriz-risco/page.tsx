import MatrizRiscoView from '@/components/MatrizRiscoView'

export const metadata = { title: 'Matriz de Risco — Central de Fornecimento' }

export default function MatrizRiscoPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Matriz de Risco</h1>
        <p className="text-sm text-gray-500 mt-1">
          Identificação de produtos críticos por dependência de fornecedor, lead time e capacidade
        </p>
      </div>
      <MatrizRiscoView />
    </main>
  )
}
