import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Central de Fornecimento',
  description: 'Dashboard centralizado de fornecimento — Moon Ventures',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <span className="font-semibold text-gray-900">Central de Fornecimento</span>
            <a href="/matriz-risco" className="text-sm text-gray-600 hover:text-gray-900">
              Matriz de Risco
            </a>
            <a href="/fornecedores" className="text-sm text-gray-600 hover:text-gray-900">
              Fornecedores
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
