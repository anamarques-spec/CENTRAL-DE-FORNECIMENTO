import DesembolsosView from '@/components/DesembolsosView'

export const metadata = { title: 'Desembolsos — Central de Fornecimento' }

export default function DesembolsosPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projeção de Desembolsos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Vencimentos de parcelas por mês — pedidos em aberto, a partir de maio/2026
        </p>
      </div>
      <DesembolsosView />
    </main>
  )
}
