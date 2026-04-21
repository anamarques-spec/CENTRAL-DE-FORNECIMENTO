-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  criticidade TEXT NOT NULL CHECK (criticidade IN ('A', 'B', 'C')),
  fornecedor_principal TEXT NOT NULL,
  qtd_fornecedores_alternativos INTEGER NOT NULL DEFAULT 0,
  lead_time_dias INTEGER NOT NULL DEFAULT 0,
  estoque_atual_dias INTEGER NOT NULL DEFAULT 0,
  volume_projetado_mensal INTEGER NOT NULL DEFAULT 0,
  capacidade_fornecedor_mensal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e permitir acesso pela chave anon (suficiente para o bootcamp)
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso_publico_produtos"
  ON produtos FOR ALL
  USING (true)
  WITH CHECK (true);

-- Migration: suporte a metas (rodar se a tabela já existe)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS meta_faturamento_anual BIGINT DEFAULT 0;
ALTER TABLE produtos ADD CONSTRAINT IF NOT EXISTS produtos_nome_unique UNIQUE (nome);
