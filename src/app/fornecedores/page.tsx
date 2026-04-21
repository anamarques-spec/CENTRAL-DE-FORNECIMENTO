import FornecedoresView from '@/components/FornecedoresView'

export const metadata = { title: 'Fornecedores — Central de Fornecimento' }

export default function FornecedoresPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie os fornecedores por produto</p>
      </div>
      <FornecedoresView />
    </main>
  )
}
