-- Circuito Conecta no padrão Bússola: schema operacional, RLS e views agregadas LGPD-safe.
create extension if not exists pgcrypto;

create type public.app_role as enum ('administrador','coordenacao','professor','financeiro','comunicacao','patrocinador','consulta_publica');
create type public.attendance_status as enum ('presente','falta','justificada');

create table public.perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  papel app_role not null default 'consulta_publica',
  projeto_id uuid,
  grupo_id uuid,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, papel, projeto_id, grupo_id)
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  telefone text,
  ativo boolean not null default true,
  aceite_lgpd_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.editais (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  orgao text,
  status text not null default 'aberto',
  data_abertura date,
  data_fechamento date,
  valor_estimado numeric(14,2) not null default 0,
  cidade text,
  oportunidade_status text not null default 'mapeada',
  created_at timestamptz not null default now()
);

create table public.projetos (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid references public.editais(id) on delete set null,
  nome text not null,
  status text not null default 'planejamento',
  cidade text not null,
  polo text,
  modalidade text,
  patrocinador text,
  fonte_recurso text,
  valor_aprovado numeric(14,2) not null default 0,
  valor_executado numeric(14,2) not null default 0,
  data_inicio date,
  data_fim date,
  created_at timestamptz not null default now()
);

alter table public.perfis add constraint perfis_projeto_id_fkey foreign key (projeto_id) references public.projetos(id) on delete cascade;

create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  nome text not null,
  cidade text,
  polo text,
  modalidade text,
  professor_id uuid references public.usuarios(id) on delete set null,
  vagas integer not null default 0 check (vagas >= 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.perfis add constraint perfis_grupo_id_fkey foreign key (grupo_id) references public.grupos(id) on delete cascade;

create table public.atendidos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  grupo_id uuid references public.grupos(id) on delete set null,
  nome text not null,
  cidade text not null,
  bairro text,
  data_nascimento date,
  genero text,
  raca_cor text,
  perfil_social jsonb not null default '{}'::jsonb,
  cpf text,
  telefone text,
  deficiencia text,
  condicao text,
  laudo text,
  consentimento_lgpd boolean not null default false,
  termo_imagem boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.atividades (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  grupo_id uuid references public.grupos(id) on delete set null,
  professor_id uuid references public.usuarios(id) on delete set null,
  tipo text not null,
  titulo text not null,
  local text,
  data date not null,
  inicio time,
  fim time,
  atendimentos_dia integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.frequencias (
  id uuid primary key default gen_random_uuid(),
  atividade_id uuid not null references public.atividades(id) on delete cascade,
  atendido_id uuid not null references public.atendidos(id) on delete cascade,
  status attendance_status not null,
  justificativa text,
  created_at timestamptz not null default now(),
  unique (atividade_id, atendido_id)
);

create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  atendido_id uuid not null references public.atendidos(id) on delete cascade,
  projeto_id uuid references public.projetos(id) on delete set null,
  tecnico_id uuid references public.usuarios(id) on delete set null,
  tipo text not null,
  data timestamptz not null default now(),
  encaminhamento text,
  encaminhamento_status text not null default 'sem_encaminhamento',
  observacao_restrita text,
  created_at timestamptz not null default now()
);

create table public.relacionamento (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references public.projetos(id) on delete set null,
  parceiro_id uuid,
  nome text not null,
  tipo text not null default 'empresa',
  estagio text not null default 'prospect',
  ativo boolean not null default true,
  oportunidade_aberta boolean not null default false,
  follow_up_em date,
  historico jsonb not null default '[]'::jsonb,
  valor_captado numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  projeto_id uuid references public.projetos(id) on delete cascade,
  cidade text,
  periodo_inicio date,
  periodo_fim date,
  conteudo jsonb not null default '{}'::jsonb,
  indicadores jsonb not null default '{}'::jsonb,
  publico boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references public.projetos(id) on delete cascade,
  atendido_id uuid references public.atendidos(id) on delete cascade,
  tipo text not null,
  caminho text not null,
  sensivel boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.logs_acesso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tabela text not null,
  registro_id uuid,
  acao text not null,
  created_at timestamptz not null default now()
);

create table public.logs_importacao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  tipo text not null,
  arquivo text not null,
  total_registros integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.solicitacoes_dados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nome text not null,
  email text not null,
  tipo text not null,
  status text not null default 'recebida',
  created_at timestamptz not null default now()
);

create or replace function public.has_role(required_role app_role) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where user_id = auth.uid() and papel = required_role and ativo);
$$;

create or replace function public.is_project_member(project uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where user_id = auth.uid() and ativo and (projeto_id = project or papel in ('administrador','coordenacao')));
$$;

create or replace function public.can_view_sensitive(project uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('administrador') or public.has_role('coordenacao') or public.is_project_member(project);
$$;

alter table public.perfis enable row level security;
alter table public.usuarios enable row level security;
alter table public.editais enable row level security;
alter table public.projetos enable row level security;
alter table public.grupos enable row level security;
alter table public.atendidos enable row level security;
alter table public.atividades enable row level security;
alter table public.frequencias enable row level security;
alter table public.atendimentos enable row level security;
alter table public.relacionamento enable row level security;
alter table public.relatorios enable row level security;
alter table public.documentos enable row level security;
alter table public.logs_acesso enable row level security;
alter table public.logs_importacao enable row level security;
alter table public.solicitacoes_dados enable row level security;

create policy "agregados autenticados podem ler perfis proprios" on public.perfis for select using (user_id = auth.uid() or public.has_role('administrador'));
create policy "admin gerencia perfis" on public.perfis for all using (public.has_role('administrador')) with check (public.has_role('administrador'));
create policy "usuarios veem proprio cadastro" on public.usuarios for select using (id = auth.uid() or public.has_role('administrador') or public.has_role('coordenacao'));
create policy "operacao le editais" on public.editais for select using (auth.uid() is not null);
create policy "coordenacao gerencia editais" on public.editais for all using (public.has_role('administrador') or public.has_role('coordenacao')) with check (public.has_role('administrador') or public.has_role('coordenacao'));
create policy "projetos por perfil" on public.projetos for select using (public.is_project_member(id) or public.has_role('financeiro') or public.has_role('comunicacao'));
create policy "coordenacao gerencia projetos" on public.projetos for all using (public.has_role('administrador') or public.has_role('coordenacao') or public.has_role('financeiro')) with check (public.has_role('administrador') or public.has_role('coordenacao') or public.has_role('financeiro'));
create policy "grupos por projeto" on public.grupos for select using (public.is_project_member(projeto_id) or professor_id = auth.uid());
create policy "operacao gerencia grupos" on public.grupos for all using (public.has_role('administrador') or public.has_role('coordenacao')) with check (public.has_role('administrador') or public.has_role('coordenacao'));
create policy "atendidos restritos" on public.atendidos for select using (public.can_view_sensitive(projeto_id));
create policy "operacao gerencia atendidos" on public.atendidos for all using (public.has_role('administrador') or public.has_role('coordenacao')) with check (public.has_role('administrador') or public.has_role('coordenacao'));
create policy "atividades por projeto professor" on public.atividades for select using (public.is_project_member(projeto_id) or professor_id = auth.uid());
create policy "professor registra atividades" on public.atividades for all using (public.has_role('administrador') or public.has_role('coordenacao') or professor_id = auth.uid()) with check (public.has_role('administrador') or public.has_role('coordenacao') or professor_id = auth.uid());
create policy "frequencias por atividade" on public.frequencias for select using (exists (select 1 from public.atividades a where a.id = atividade_id and (public.is_project_member(a.projeto_id) or a.professor_id = auth.uid())));
create policy "professor registra frequencia" on public.frequencias for all using (exists (select 1 from public.atividades a where a.id = atividade_id and (public.has_role('administrador') or public.has_role('coordenacao') or a.professor_id = auth.uid()))) with check (exists (select 1 from public.atividades a where a.id = atividade_id and (public.has_role('administrador') or public.has_role('coordenacao') or a.professor_id = auth.uid())));
create policy "atendimentos restritos" on public.atendimentos for select using (public.is_project_member(projeto_id) or tecnico_id = auth.uid());
create policy "tecnicos registram atendimentos" on public.atendimentos for all using (public.has_role('administrador') or public.has_role('coordenacao') or tecnico_id = auth.uid()) with check (public.has_role('administrador') or public.has_role('coordenacao') or tecnico_id = auth.uid());
create policy "crm operacional" on public.relacionamento for all using (public.has_role('administrador') or public.has_role('coordenacao') or public.has_role('financeiro') or public.has_role('comunicacao')) with check (public.has_role('administrador') or public.has_role('coordenacao') or public.has_role('financeiro') or public.has_role('comunicacao'));
create policy "relatorios por perfil" on public.relatorios for select using (publico or public.is_project_member(projeto_id) or public.has_role('financeiro') or public.has_role('comunicacao'));
create policy "documentos restritos" on public.documentos for select using (not sensivel or public.has_role('administrador') or public.has_role('coordenacao'));
create policy "logs admin" on public.logs_acesso for select using (public.has_role('administrador'));
create policy "logs importacao operacao" on public.logs_importacao for all using (public.has_role('administrador') or public.has_role('coordenacao')) with check (public.has_role('administrador') or public.has_role('coordenacao'));
create policy "canal lgpd" on public.solicitacoes_dados for insert with check (true);
create policy "admin ve solicitacoes" on public.solicitacoes_dados for select using (public.has_role('administrador'));

create view public.vw_dashboard_geral as
select
  (select count(*) from public.projetos)::int total_projetos,
  (select count(*) from public.atendidos where ativo)::int total_pessoas,
  (select count(*) from public.atividades)::int total_atividades,
  (select count(*) from public.grupos where ativo)::int total_grupos,
  (select count(*) from public.editais where status = 'aberto')::int editais_abertos,
  (select count(*) from public.atendimentos where data::date = current_date)::int atendimentos_hoje,
  coalesce((select sum(vagas) from public.grupos where ativo), 0)::int vagas_ofertadas,
  greatest(coalesce((select sum(g.vagas) from public.grupos g where g.ativo), 0) - (select count(*) from public.atendidos a where a.ativo), 0)::int vagas_disponiveis,
  coalesce(round((select avg(case when f.status = 'presente' then 100 when f.status = 'justificada' then 50 else 0 end) from public.frequencias f), 2), 0) frequencia_media,
  coalesce(round(((select count(*) from public.atendidos where ativo)::numeric / nullif((select sum(vagas) from public.grupos where ativo), 0)) * 100, 2), 0) taxa_ocupacao,
  coalesce(round(((select count(*) from public.atendidos where not ativo)::numeric / nullif((select count(*) from public.atendidos), 0)) * 100, 2), 0) evasao,
  coalesce(round(((select count(*) from public.atendidos where ativo)::numeric / nullif((select count(*) from public.atendidos), 0)) * 100, 2), 0) permanencia,
  coalesce((select sum(valor_aprovado) from public.projetos), 0) valor_aprovado,
  coalesce((select sum(valor_executado) from public.projetos), 0) valor_executado,
  coalesce((select sum(valor_aprovado - valor_executado) from public.projetos), 0) saldo;

create view public.vw_atividades_mensais as select to_char(date_trunc('month', data), 'YYYY-MM') mes, count(*)::int total from public.atividades group by 1;
create view public.vw_projetos_status as select status, count(*)::int total from public.projetos group by status;
create view public.vw_atendidos_por_cidade as select cidade, count(*)::int total from public.atendidos where ativo group by cidade;
create view public.vw_atendidos_por_projeto as select p.nome projeto, p.id projeto_id, count(a.id)::int total from public.projetos p left join public.atendidos a on a.projeto_id = p.id and a.ativo group by p.id, p.nome;
create view public.vw_frequencia_por_projeto as select p.nome projeto, p.id projeto_id, count(*) filter (where f.status = 'presente')::int presentes, count(*) filter (where f.status = 'falta')::int faltas, count(*) filter (where f.status = 'justificada')::int justificativas, coalesce(round(avg(case when f.status = 'presente' then 100 when f.status = 'justificada' then 50 else 0 end), 2), 0) frequencia_media from public.projetos p join public.atividades at on at.projeto_id = p.id left join public.frequencias f on f.atividade_id = at.id group by p.id, p.nome;
create view public.vw_ocupacao_por_grupo as select g.nome grupo, p.nome projeto, g.id grupo_id, g.projeto_id, g.vagas, count(a.id)::int ocupados, greatest(g.vagas - count(a.id), 0)::int vagas_disponiveis, coalesce(round((count(a.id)::numeric / nullif(g.vagas, 0)) * 100, 2), 0) taxa_ocupacao from public.grupos g join public.projetos p on p.id = g.projeto_id left join public.atendidos a on a.grupo_id = g.id and a.ativo group by g.id, g.nome, p.nome, g.projeto_id, g.vagas;
create view public.vw_atendimentos_por_tipo as select tipo, count(*)::int total from public.atendimentos group by tipo;
create view public.vw_impacto_social as select p.id projeto_id, p.nome projeto, p.cidade, p.polo, p.modalidade, p.patrocinador, p.fonte_recurso, extract(year from coalesce(at.data, p.data_inicio, current_date))::int ano, extract(month from coalesce(at.data, p.data_inicio, current_date))::int mes, count(distinct a.id)::int pessoas_atendidas, count(distinct ad.id)::int atendimentos_realizados, count(distinct at.id)::int atividades_realizadas, coalesce(round(avg(case when f.status = 'presente' then 100 when f.status = 'justificada' then 50 else 0 end), 2), 0) frequencia_media, p.valor_executado recursos_executados from public.projetos p left join public.atendidos a on a.projeto_id = p.id and a.ativo left join public.atividades at on at.projeto_id = p.id left join public.frequencias f on f.atividade_id = at.id left join public.atendimentos ad on ad.projeto_id = p.id group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, p.fonte_recurso, ano, mes, p.valor_executado;
create view public.vw_recursos_por_projeto as select id projeto_id, nome projeto, cidade, polo, modalidade, patrocinador, fonte_recurso, valor_aprovado, valor_executado, (valor_aprovado - valor_executado) saldo from public.projetos;

-- Painéis internos usam authenticated. Acesso anon fica restrito às views públicas 100% agregadas.
grant select on public.vw_dashboard_geral, public.vw_atividades_mensais, public.vw_projetos_status, public.vw_atendidos_por_cidade, public.vw_atendidos_por_projeto, public.vw_frequencia_por_projeto, public.vw_ocupacao_por_grupo, public.vw_atendimentos_por_tipo, public.vw_impacto_social, public.vw_recursos_por_projeto to authenticated;
grant select on public.vw_dashboard_geral, public.vw_atividades_mensais, public.vw_projetos_status, public.vw_atendidos_por_cidade, public.vw_atendimentos_por_tipo to anon;
