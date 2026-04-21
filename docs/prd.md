# PRD — central-fornecimento

> Esqueleto criado pelo `/startup`. Completar em 15min às 13h, ANTES de abrir o Claude pra codar.
> **Regra**: Claude deve ler este arquivo antes de propor qualquer código.

## Problema

O setor de compras não tem visão consolidada da cadeia de fornecimento. Ausência de matriz de risco por produto, planejamento de compras desconectado das metas de faturamento, sem base estruturada de performance de fornecedores (lead time, capacidade, OTD), KPIs limitados ao OTD em planilha isolada, sem controle de homologação e sistemas fragmentados (TOTVS, Bling, ClickUp, planilha manual).

## Usuário

**Quem vai usar essa ferramenta?** Analistas, estagiarios e compradores do time de sourcing. Como tambpem a liderança e diretoria

Analistas, estagiarios e compradores do time de sourcing. Como tambpem a liderança e diretoria

**O que o usuário faz hoje pra resolver isso (manual/workaround)?** Usa planilhas Excel manuais, consulta vários sistemas separados (TOTVS, Bling, ClickUp) sem integração

## Objetivo

Dashboard centralizado de fornecimento que integra dados de pedidos, estoque e fornecedores para gerar matriz de risco por produto, projeção de compras vs metas, acompanhamento de lead time e capacidade, além de consolidar KPIs (OTD, pagamento, performance e prospecção) para tomada de decisão estratégica em compras.

## Requisitos (o que PRECISA ter pra funcionar)

*Preencher às 13h. Máximo 5 — se passou disso, cortar escopo.*

- [ ] Visualizar matriz de risco por produto e fornecedor
- [ ] Dashboard com KPIs consolidados (OTD, lead time, capacidade)
- [ ] Projeção de compras vs metas de faturamento
- [ ] Visão consolidada por fornecedor (performance, capacidade, lead time, dependência)
- [ ] Pipeline de fornecedores (prospecção + etapas de homologação)



## Fora do escopo (o que NÃO vai ter hoje)

*Preencher às 13h. Ser explícito. Cada item aqui é 1h salva.*

- Login social (Google/GitHub) — usar só email/senha ou Supabase magic link
- Mobile responsivo polido — ok se quebrar no celular
- Integração real com TOTVS ou Bling — simular com dados mock
- Integração real com ClickUp — simular com dados mock
- Testes automatizados
- Automação de follow-up com fornecedores
- Integração com envio de e-mails ou notificações automáticas
- Módulo completo de homologação (apenas visualização inicial do pipeline)
- Customização avançada de dashboards

## Métrica de sucesso

**Como você vai saber que funciona?** Usuário acessa o dashboard e consolida em um único ambiente a visão de pedidos em aberto, histórico e performance por fornecedor, entregas projetadas no CD, posição por produto e identificação de fornecedores críticos, permitindo decisões rápidas e redução de risco de abastecimento.

*Ex: "Ana abre a URL, visualiza a matriz de risco dos produtos, identifica os fornecedores críticos de único fornecedor e exporta o relatório — e os dados refletem o que foi inserido no Supabase."*

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase
- **Linguagem/framework**: _____ Next.js + TypeScript
- **Outras libs**: _____ Tailwind CSS

## Decisões de arquitetura (append ao longo do dia)

*Use essa seção pra registrar escolhas técnicas importantes à medida que aparecem.*

- Dados inseridos via formulário de cadastro dentro do app (não direto no Supabase)
- Prioridade de desenvolvimento: (1) Matriz de risco → (2) KPIs → (3) Projeção de compras → (4) Visão por fornecedor → (5) Pipeline de homologação
