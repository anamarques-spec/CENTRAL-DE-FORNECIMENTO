# PRD — central-fornecimento

> Esqueleto criado pelo `/startup`. Completar em 15min às 13h, ANTES de abrir o Claude pra codar.
> **Regra**: Claude deve ler este arquivo antes de propor qualquer código.

## Problema

O setor de compras não tem visão consolidada da cadeia de fornecimento. Ausência de matriz de risco por produto, planejamento de compras desconectado das metas de faturamento, sem base estruturada de performance de fornecedores (lead time, capacidade, OTD), KPIs limitados ao OTD em planilha isolada, sem controle de homologação e sistemas fragmentados (TOTVS, Bling, ClickUp, planilha manual).

## Usuário

**Quem vai usar essa ferramenta?** (preencher às 13h)

*Ex: "Analistas do time de sourcing que hoje abrem múltiplos sistemas e planilhas para ter uma visão de risco e performance de fornecedores."*

**O que o usuário faz hoje pra resolver isso (manual/workaround)?** (preencher às 13h)

## Objetivo

Dashboard centralizado de fornecimento que integra dados de pedidos, estoque e fornecedores para gerar matriz de risco por produto, projeção de compras vs metas, acompanhamento de lead time e capacidade, além de consolidar KPIs (OTD, pagamento, performance e prospecção) para tomada de decisão estratégica em compras.

## Requisitos (o que PRECISA ter pra funcionar)

*Preencher às 13h. Máximo 5 — se passou disso, cortar escopo.*

- [ ] Requisito crítico 1
- [ ] Requisito crítico 2
- [ ] Requisito crítico 3

## Fora do escopo (o que NÃO vai ter hoje)

*Preencher às 13h. Ser explícito. Cada item aqui é 1h salva.*

- Login social (Google/GitHub) — usar só email/senha ou Supabase magic link
- Mobile responsivo polido — ok se quebrar no celular
- Integração real com TOTVS ou Bling — simular com dados mock
- Integração real com ClickUp — simular com dados mock
- Testes automatizados
- <adicione os seus>

## Métrica de sucesso

**Como você vai saber que funciona?** 1 frase concreta com ação + resultado.

*Ex: "Ana abre a URL, visualiza a matriz de risco dos produtos, identifica os fornecedores críticos de único fornecedor e exporta o relatório — e os dados refletem o que foi inserido no Supabase."*

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase
- **Linguagem/framework**: _____ (preencher quando decidir — sugestão: Next.js + TypeScript)
- **Outras libs**: _____ (preencher conforme for usando)

## Decisões de arquitetura (append ao longo do dia)

*Use essa seção pra registrar escolhas técnicas importantes à medida que aparecem.*

- <ex: "decidi usar Supabase Auth em vez de rolar JWT próprio — economiza 2h">
