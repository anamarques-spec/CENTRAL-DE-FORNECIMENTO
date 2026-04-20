---
description: Configuração inicial do seu projeto bootcamp — rode UMA VEZ logo após clonar
---

# /startup

Setup inicial do projeto. Deve ser o **primeiro comando** que o participante executa ao abrir o Claude Code após clonar o template.

## Pré-check (antes de tudo)

1. Leia `CLAUDE.md`. Se **NÃO** encontrar o placeholder literal `[Seu Nome]`, o projeto já foi configurado — pare imediatamente e responda:

   > Este projeto já foi configurado anteriormente. Se quer refazer, edite `CLAUDE.md` e `README.md` manualmente e rode `/startup` novamente.

## Coleta de dados

Faça as 7 perguntas abaixo **uma por vez**. Espere resposta. Valide (não aceite vazio nem genérico):

1. Qual seu **nome completo**?
2. Qual sua **área** na Moon Ventures?
3. Qual seu **e-mail corporativo**?
4. Qual seu **usuário do GitHub** (com @)?
5. Qual **problema real da Moon** você vai atacar hoje? (2-3 frases concretas)
   - Rejeite respostas vagas tipo "usar IA", "automatizar coisas", "melhorar processo".
   - Devolva com pergunta específica: *"Qual processo? Qual a dor hoje? Quem sofre com isso?"*
6. Qual o **slug do projeto** (minúsculo, com hífen, sem espaço — ex: `controle-estoque`, `agent-copy-hoomy`)?
7. Em **1 frase**, qual sua **hipótese de solução**? (dashboard, agente, automação, ferramenta web, etc)

Ao final, repita as 7 respostas em bloco pro participante confirmar antes de personalizar arquivos. Se ele quiser refinar alguma, refine.

## Personalização dos arquivos

Depois de confirmar, atualize em paralelo:

### `CLAUDE.md`
- `replace_all` de `[Seu Nome]` pelo nome real
- `replace_all` de `[Sua Área]` pela área
- Na seção "## Sobre o projeto", substitua os 2 placeholders (problema e hipótese) pelas respostas reais
- Nos links, troque os paths relativos por caminhos corretos (já estão corretos se não mexeu na estrutura)

### `README.md`
- `replace_all` de `[Seu Nome]` pelo nome real
- Logo abaixo do título, adicione seção:

  ```markdown
  ## Sobre o projeto

  - **Problema**: <resposta 5>
  - **Solução proposta**: <resposta 7>
  - **Slug**: `<resposta 6>`
  ```

### Criar `context/briefing.md`

```markdown
# Briefing — <nome> @ <área>

## Pessoa

- **Nome**: <resposta 1>
- **Área**: <resposta 2>
- **Email**: <resposta 3>
- **GitHub**: <resposta 4>

## Projeto: <slug>

### Problema

<resposta 5 expandida — 2-3 frases>

### Hipótese de solução

<resposta 7 — 1 frase>

### Stack

- Vercel (hosting)
- Supabase (DB + auth)
- Claude Code (dev)

### Decisões do dia

*Append aqui ao longo do desenvolvimento: decisões técnicas, trade-offs, mudanças de escopo.*

### Lições

*Preencher ao fim do dia: o que aprendeu, o que faria diferente, o que levaria pra casa.*
```

### Criar `docs/prd.md`

```markdown
# PRD — <slug>

> Esqueleto criado pelo `/startup`. Completar em 15min às 13h, ANTES de abrir o Claude pra codar.
> **Regra**: Claude deve ler este arquivo antes de propor qualquer código.

## Problema

<resposta 5 — problema que o participante vai atacar>

## Usuário

**Quem vai usar essa ferramenta?** (preencher às 13h)

*Ex: "Analistas do time de assinatura que hoje abrem 3 planilhas por dia pra conferir status de remessa."*

**O que o usuário faz hoje pra resolver isso (manual/workaround)?** (preencher às 13h)

## Objetivo

<resposta 7 — hipótese de solução, em 1 frase>

## Requisitos (o que PRECISA ter pra funcionar)

*Preencher às 13h. Máximo 5 — se passou disso, cortar escopo.*

- [ ] Requisito crítico 1
- [ ] Requisito crítico 2
- [ ] Requisito crítico 3

## Fora do escopo (o que NÃO vai ter hoje)

*Preencher às 13h. Ser explícito. Cada item aqui é 1h salva.*

- Login social (Google/GitHub) — usar só email/senha ou Supabase magic link
- Mobile responsivo polido — ok se quebrar no celular
- Integrações com sistemas reais (TOTVS, HubSpot) — simular com mock
- Testes automatizados
- <adicione os seus>

## Métrica de sucesso

**Como você vai saber que funciona?** 1 frase concreta com ação + resultado.

*Ex: "Ana abre a URL, filtra por 'renovação cancelada', vê os 12 casos atuais, clica em 1 e marca como resolvido — e isso reflete no Supabase."*

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase
- **Linguagem/framework**: _____ (preencher quando decidir — sugestão: Next.js + TypeScript)
- **Outras libs**: _____ (preencher conforme for usando)

## Decisões de arquitetura (append ao longo do dia)

*Use essa seção pra registrar escolhas técnicas importantes à medida que aparecem.*

- <ex: "decidi usar Supabase Auth em vez de rolar JWT próprio — economiza 2h">
```

### Criar `docs/pitch.md`

```markdown
# Pitch — <slug>

> 2 minutos cronometrados. Preencher ao longo do dia. Versão final até 17h30.
> **Dica**: muito disso sai DIRETO do `docs/prd.md`.

## Problema (20s)

<1 frase. Quantifique se possível. Quem sofre, quanto dói.>

## Solução (40s)

<O que sua ferramenta faz. Como resolve. Stack: Vercel + Supabase + Claude.>

## Demo (50s)

- **URL Vercel**: <cole aqui quando deployar>
- Passo 1: <ação>
- Passo 2: <ação>
- Passo 3: <resultado>

## Próximos passos (10s)

<O que faria com mais 1 semana. Quem usaria na Moon. Viabilidade de virar produção.>

---

## Métricas do dia (preencher ao final)

- Tokens consumidos: <pegue no dashboard Anthropic>
- Commits: `git log --oneline | wc -l`
- Tempo total ativo: <estimativa>
```

### Criar `src/.gitkeep`
Arquivo vazio — só pra garantir a pasta no git antes do código existir.

## Finalizar

1. Rode `ls -la` pra mostrar a estrutura final ao participante.

2. Verifique que nenhuma variável sensível entrou nos arquivos rastreados (se colou chave real em algum lugar, remova).

3. Commit inicial:
   ```bash
   git add .
   git commit -m "setup: projeto <slug> configurado via /startup"
   ```

4. **NÃO rode `git push`.** Deixe o participante fazer manual depois — pode ser que o remote precise ser ajustado.

5. Mensagem final ao participante (texto exato, adaptar com slug):

   > Projeto `<slug>` configurado. Arquivos-chave:
   >
   > - `CLAUDE.md` — suas regras (já personalizadas)
   > - `context/briefing.md` — seu problema e solução
   > - `docs/prd.md` — **esqueleto do seu PRD** (completar às 13h antes de codar)
   > - `docs/pitch.md` — rascunho do pitch (atualize durante o dia)
   >
   > Próximos passos:
   >
   > 1. Configure Vercel: https://vercel.com/signup (login GitHub)
   > 2. Configure Supabase: https://supabase.com (novo projeto) — copie `SUPABASE_URL` e `SUPABASE_ANON_KEY` pro `.env`
   > 3. Rode `git push` pra subir o setup inicial
   > 4. **Almoço. Às 13h vc abre o `docs/prd.md`, preenche por 15min, só aí abre o Claude pra codar.**
   > 5. Durante o dia: use **Plan Mode (Shift+Tab)** antes de mexer em 2+ arquivos. Commit + push a cada hora.
   >
   > Dúvidas? DM Cláudio no Discord ou canal `#bootcamp-claude-code`.

## Regras críticas

- **NUNCA** rode `git push` dentro deste comando — o participante faz manual
- **NUNCA** peça nem aceite senhas/tokens durante o setup
- Se o participante colar uma chave ou senha por acidente, alerte e **NÃO salve em arquivo nenhum**
- **NUNCA** invente dados — tudo vem das respostas do participante
- Se ele não souber responder algo (ex: `github username`), registre como `TBD` no briefing e siga — melhor do que travar
- Formato das perguntas: uma por vez. Não despeje as 7 de uma vez — vira formulário chato
