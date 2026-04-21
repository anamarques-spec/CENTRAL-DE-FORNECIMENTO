# [Seu Nome] — Projeto Bootcamp Claude Code

> Bootcamp Claude Code — Moon Ventures (2026)

_Última atualização: 21/04 10:52_

## O que é isso?

Espaço de trabalho do seu projeto individual no bootcamp. Em 1 dia, você constrói uma ferramenta pra resolver um problema real da Moon, usando Claude Code como copiloto.

Ao fim do dia você entrega:
- URL da Vercel com o projeto rodando
- Pitch de 2 minutos cronometrados
- Repositório GitHub com commits frequentes

Tudo versionado — histórico completo de quem fez o quê, quando, e por quê.

## Stack obrigatória

| Camada | Ferramenta | Link |
|--------|-----------|------|
| Hospedagem | **Vercel** (free tier) | https://vercel.com |
| Banco + auth + storage | **Supabase** (free tier) | https://supabase.com |
| Copiloto | **Claude Code** | chave no envelope |

Por que obrigatória: suporte durante o dia é mais rápido quando todos usam a mesma stack. Se seu projeto vingar, a Moon apoia a migração pra produção depois.

## Estrutura de pastas

```
meu-projeto/
├── CLAUDE.md              ← Instruções pro Claude (persona, regras, stack)
├── README.md              ← Este arquivo
├── .gitignore             ← Arquivos que nunca sobem pro git (.env, etc)
├── .env.example           ← Modelo de variáveis (sem valores reais)
├── .claude/
│   └── commands/
│       ├── startup.md     ← Execute primeiro! Configura tudo.
│       └── exemplo.md     ← Modelo pra você criar outros commands
├── context/
│   └── briefing.md        ← Seu perfil + projeto (criado via /startup)
├── docs/
│   └── pitch.md           ← Rascunho do pitch de 2min (criado via /startup)
└── src/                   ← Seu código (você vai criar aqui)
```

## Setup do bootcamp (faça ao vivo às 11h45)

### 1. Criar pasta padrão

Todos usam o mesmo caminho — facilita suporte e demos no palco.

```bash
mkdir -p ~/moon-bootcamp
cd ~/moon-bootcamp
```

### 2. Clonar o template

```bash
git clone <link-do-envelope> meu-projeto
cd meu-projeto
```

### 3. Configurar chave API

```bash
cp .env.example .env
# abra .env no editor e cole a ANTHROPIC_API_KEY do envelope
export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env | cut -d= -f2)
```

### 4. Abrir Claude Code

```bash
claude
```

### 5. Primeiro prompt (o único da manhã)

```
Execute o comando /startup
```

Claude vai te perguntar seus dados, o problema que você vai atacar, e personalizar TUDO: `CLAUDE.md`, `README.md`, `context/briefing.md`, `docs/pitch.md`.

### 6. Criar contas Vercel e Supabase

- **Vercel**: [vercel.com/signup](https://vercel.com/signup) — use login GitHub
- **Supabase**: [supabase.com/dashboard/sign-up](https://supabase.com/dashboard/sign-up) — crie um novo projeto

Cole as credenciais no `.env` local. O `.env.example` já tem os campos.

## Regras do dia

1. **Commit + push a cada hora** (mínimo) — versionamento entra na avaliação
2. **Tokens têm limite** — quando a chave zerar, acabou. Use com consciência
3. **Nunca** suba `.env` pro git
4. **Nunca** `git push -f`
5. **Entrega até 17h30**:
   - `docs/pitch.md` preenchido
   - URL Vercel funcionando
   - Último commit pushado no GitHub
6. **Pitch 18h-19h**: 2 minutos cronometrados (pitch + demo juntos)

## Critérios de avaliação (para você se antecipar)

Os jurados vão avaliar 6 eixos (1-5 cada, máx 30 pontos):

1. **Criatividade** — ângulo inusitado
2. **Robustez** — funciona end-to-end?
3. **Problema real da Moon** — dor concreta, não inventada
4. **Objetividade** — resolve ou inventou moda?
5. **Uso do Claude Code** — CLAUDE.md, commands, agents — ou só chat genérico?
6. **Clareza do pitch** — vendeu em 2 minutos?

## Dúvidas?

- **Cláudio** (DM no Discord): suporte técnico, Claude Code, GitHub
- **Guilherme**: validação de escopo ("isso resolve mesmo?")
- **Canal `#bootcamp-claude-code`**: dúvidas gerais
