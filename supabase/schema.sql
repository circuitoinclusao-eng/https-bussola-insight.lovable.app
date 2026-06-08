-- Schema inicial Bússola Inclusiva. Execute após revisar autenticação, RLS e perfis de acesso.
create extension if not exists "pgcrypto";

create table if not exists fontes_planilha (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  tipo text not null,
  data_importacao date,
  status text not null,
  observacoes text,
  ultimo_processamento timestamptz,
  total_registros integer default 0,
  total_erros integer default 0
);

create table if not exists registros_atendimento (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  id_registro text,
  id_pessoa text,
  nome_pessoa text,
  data_atendimento date,
  tipo_deficiencia text,
  grau text,
  unidade text,
  territorio text,
  servico text,
  projeto text,
  sexo text,
  idade integer,
  faixa_etaria text,
  cidade text,
  origem_fonte text,
  status_validacao text
);

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  cidade text,
  unidade text,
  servico text,
  publico_atendido text,
  status text,
  data_inicio date,
  data_fim date,
  fonte_recurso text,
  responsavel_tecnico text
);

create table if not exists atendidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  id_pessoa text not null,
  nome text,
  data_nascimento date,
  idade integer,
  faixa_etaria text,
  sexo text,
  tipo_deficiencia text,
  grau text,
  cidade text,
  territorio text,
  unidade text,
  projeto text,
  servico text,
  responsavel text,
  telefone text,
  email text,
  escola text,
  observacoes text,
  status text,
  origem_fonte text,
  deleted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists atendimentos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  id_atendimento text,
  id_pessoa text,
  nome_pessoa text,
  data_atendimento date,
  servico text,
  projeto text,
  unidade text,
  territorio text,
  cidade text,
  tipo_deficiencia text,
  grau text,
  profissional_responsavel text,
  origem_fonte text,
  status_validacao text
);

create table if not exists logs_processamento (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  data_hora timestamptz not null default now(),
  fonte text,
  status text,
  mensagem text,
  linhas_processadas integer default 0,
  quantidade_erros integer default 0
);

create table if not exists mapeamentos_colunas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fonte_id uuid references fontes_planilha(id),
  coluna_original text not null,
  campo_padrao text not null,
  obrigatorio boolean default false
);

create index if not exists idx_registros_filtros on registros_atendimento (data_atendimento, projeto, cidade, unidade, servico, grau, tipo_deficiencia, sexo, faixa_etaria);
create index if not exists idx_atendidos_filtros on atendidos (projeto, cidade, unidade, grau, tipo_deficiencia, sexo, faixa_etaria, status);
create index if not exists idx_atendidos_deleted_at on atendidos (deleted_at);
create index if not exists idx_atendidos_nome on atendidos (nome);
create index if not exists idx_atendimentos_filtros on atendimentos (data_atendimento, projeto, cidade, unidade, servico, grau);
create index if not exists idx_fontes_status on fontes_planilha (status, data_importacao);
create index if not exists idx_logs_data on logs_processamento (data_hora desc);

-- Futuro RLS:
-- alter table fontes_planilha enable row level security;
-- create policy "Usuários autenticados podem ler fontes" on fontes_planilha for select to authenticated using (true);
-- Replicar políticas por tabela após definir papéis administrativos e técnicos.
