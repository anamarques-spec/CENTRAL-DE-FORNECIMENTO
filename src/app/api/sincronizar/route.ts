import { NextResponse } from 'next/server'

const SHEET_ID = '1VRjfwP7MpzKnXNNuUKtmGumaRPs7nHb3-N_3PVcYwjM'
const GID = '1309157208'

export async function GET() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Planilha retornou status ${res.status}. Verifique se está pública.` },
        { status: 502 }
      )
    }

    const contentType = res.headers.get('content-type') ?? ''
    const text = await res.text()

    // Google retorna HTML quando a planilha não está pública
    if (contentType.includes('text/html') || text.trimStart().startsWith('<')) {
      return NextResponse.json(
        { error: 'A planilha não está pública. Compartilhe como "qualquer pessoa com o link pode visualizar".' },
        { status: 403 }
      )
    }

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao conectar com o Google Sheets.' }, { status: 500 })
  }
}
