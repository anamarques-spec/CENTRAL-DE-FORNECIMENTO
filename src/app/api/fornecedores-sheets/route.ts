import { NextRequest, NextResponse } from 'next/server'

const SHEET_ID = '19FXW0cagMJZIzuZsbE_blUPthXq83LMY3Efd2pT8fkM'

const TABS: Record<string, string> = {
  fornecedores: 'Fornecedor por produto',
  pedidos: 'Entregas pendentes',
}

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get('tab') ?? 'fornecedores'
  const sheetName = TABS[tab]
  if (!sheetName) {
    return NextResponse.json({ error: 'Tab inválida' }, { status: 400 })
  }

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()
    if (text.trimStart().startsWith('<')) {
      return NextResponse.json(
        { error: 'Planilha não está pública. Compartilhe como "qualquer pessoa com o link pode visualizar".' },
        { status: 403 }
      )
    }
    return new NextResponse(text, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } })
  } catch {
    return NextResponse.json({ error: 'Erro ao conectar com o Google Sheets.' }, { status: 500 })
  }
}
