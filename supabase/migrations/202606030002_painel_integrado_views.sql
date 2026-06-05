-- Views agregadas do Painel Integrado.
-- LGPD: nenhuma view abaixo expõe nome de pessoa atendida, CPF, telefone, endereço/bairro,
-- laudo, responsável, data de nascimento individual ou observações individuais.
-- O campo grau_condicao é uma categoria agregada e células com menos de 3 atendimentos
-- são agrupadas em "Agregado protegido" para reduzir risco de reidentificação.
create or replace view public.vw_painel_pessoas as
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from a.created_at)::int ano,
  extract(month from a.created_at)::int mes,
  count(a.id)::int total
from public.projetos p
join public.atendidos a on a.projeto_id = p.id and a.ativo
group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes;

create or replace view public.vw_painel_atendimentos as
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from ad.data)::int ano,
  extract(month from ad.data)::int mes,
  count(ad.id)::int total
from public.atendimentos ad
join public.atendidos a on a.id = ad.atendido_id
join public.projetos p on p.id = coalesce(ad.projeto_id, a.projeto_id)
group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes;

create or replace view public.vw_painel_atividades as
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from at.data)::int ano,
  extract(month from at.data)::int mes,
  count(at.id)::int total
from public.atividades at
join public.projetos p on p.id = at.projeto_id
group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes;

create or replace view public.vw_painel_grupos as
with grupos_ocupacao as (
  select
    g.id,
    g.projeto_id,
    g.vagas,
    g.created_at,
    count(a.id)::int ocupados
  from public.grupos g
  left join public.atendidos a on a.grupo_id = g.id and a.ativo
  where g.ativo
  group by g.id, g.projeto_id, g.vagas, g.created_at
)
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from g.created_at)::int ano,
  extract(month from g.created_at)::int mes,
  count(g.id)::int total_grupos,
  coalesce(sum(g.vagas), 0)::int vagas,
  coalesce(sum(g.ocupados), 0)::int ocupados,
  coalesce(round((sum(g.ocupados)::numeric / nullif(sum(g.vagas), 0)) * 100, 2), 0) taxa_ocupacao
from public.projetos p
join grupos_ocupacao g on g.projeto_id = p.id
group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes;

create or replace view public.vw_painel_condicoes as
with categorias as (
  select
    p.id projeto_id,
    p.nome projeto,
    p.cidade,
    p.polo,
    p.modalidade,
    p.patrocinador,
    extract(year from ad.data)::int ano,
    extract(month from ad.data)::int mes,
    coalesce(nullif(a.deficiencia, ''), nullif(a.condicao, ''), nullif(a.perfil_social ->> 'condicao', ''), 'Não informado') categoria_condicao,
    count(ad.id)::int total
  from public.atendimentos ad
  join public.atendidos a on a.id = ad.atendido_id
  join public.projetos p on p.id = coalesce(ad.projeto_id, a.projeto_id)
  group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes, categoria_condicao
)
select
  projeto_id,
  projeto,
  cidade,
  polo,
  modalidade,
  patrocinador,
  ano,
  mes,
  case when total < 3 then 'Agregado protegido' else categoria_condicao end grau_condicao,
  sum(total)::int total
from categorias
group by projeto_id, projeto, cidade, polo, modalidade, patrocinador, ano, mes, case when total < 3 then 'Agregado protegido' else categoria_condicao end;

create or replace view public.vw_painel_frequencia_projeto as
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from at.data)::int ano,
  extract(month from at.data)::int mes,
  count(f.id) filter (where f.status = 'presente')::int presentes,
  count(f.id) filter (where f.status = 'falta')::int faltas,
  count(f.id) filter (where f.status = 'justificada')::int justificativas,
  coalesce(round(avg(case when f.status = 'presente' then 100 when f.status = 'justificada' then 50 else 0 end), 2), 0) frequencia_media
from public.projetos p
join public.atividades at on at.projeto_id = p.id
left join public.frequencias f on f.atividade_id = at.id
group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes;

create or replace view public.vw_painel_ocupacao_turma as
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from g.created_at)::int ano,
  extract(month from g.created_at)::int mes,
  g.nome grupo,
  1::int total_grupos,
  g.vagas,
  count(a.id)::int ocupados,
  coalesce(round((count(a.id)::numeric / nullif(g.vagas, 0)) * 100, 2), 0) taxa_ocupacao
from public.grupos g
join public.projetos p on p.id = g.projeto_id
left join public.atendidos a on a.grupo_id = g.id and a.ativo
where g.ativo
group by p.id, p.nome, p.cidade, p.polo, p.modalidade, p.patrocinador, ano, mes, g.id, g.nome, g.vagas;

create or replace view public.vw_painel_projetos_status as
select
  p.id projeto_id,
  p.nome projeto,
  p.cidade,
  p.polo,
  p.modalidade,
  p.patrocinador,
  extract(year from p.created_at)::int ano,
  extract(month from p.created_at)::int mes,
  p.status,
  1::int total
from public.projetos p;

revoke all on
  public.vw_painel_pessoas,
  public.vw_painel_atendimentos,
  public.vw_painel_atividades,
  public.vw_painel_grupos,
  public.vw_painel_condicoes,
  public.vw_painel_frequencia_projeto,
  public.vw_painel_ocupacao_turma,
  public.vw_painel_projetos_status
from anon;

grant select on
  public.vw_painel_pessoas,
  public.vw_painel_atendimentos,
  public.vw_painel_atividades,
  public.vw_painel_grupos,
  public.vw_painel_condicoes,
  public.vw_painel_frequencia_projeto,
  public.vw_painel_ocupacao_turma,
  public.vw_painel_projetos_status
to authenticated;
