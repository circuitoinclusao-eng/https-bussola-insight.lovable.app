import { requireSupabase } from './supabase';
import type { DashboardData, IndicatorFilters, ImpactRow, IntegratedPanelData, IntegratedPanelFilters, ReportRow, ResourceByProject } from './types';

export async function fetchDashboardData(): Promise<DashboardData> {
  const db = requireSupabase();
  const [metrics, atividadesMensais, projetosStatus, pessoasCidade, frequenciaProjeto, atendimentosTipo, ocupacaoGrupo] = await Promise.all([
    db.from('vw_dashboard_geral').select('*').single(),
    db.from('vw_atividades_mensais').select('*').order('mes'),
    db.from('vw_projetos_status').select('*').order('total', { ascending: false }),
    db.from('vw_atendidos_por_cidade').select('*').order('total', { ascending: false }),
    db.from('vw_frequencia_por_projeto').select('*').order('projeto'),
    db.from('vw_atendimentos_por_tipo').select('*').order('total', { ascending: false }),
    db.from('vw_ocupacao_por_grupo').select('*').order('grupo'),
  ]);

  const errors = [metrics, atividadesMensais, projetosStatus, pessoasCidade, frequenciaProjeto, atendimentosTipo, ocupacaoGrupo]
    .map((result) => result.error)
    .filter(Boolean);
  if (errors.length) throw errors[0];

  return {
    metrics: metrics.data,
    atividadesMensais: atividadesMensais.data ?? [],
    projetosStatus: (projetosStatus.data ?? []).map((row) => ({ nome: row.status, total: row.total })),
    pessoasCidade: (pessoasCidade.data ?? []).map((row) => ({ nome: row.cidade, total: row.total })),
    frequenciaProjeto: frequenciaProjeto.data ?? [],
    atendimentosTipo: (atendimentosTipo.data ?? []).map((row) => ({ nome: row.tipo, total: row.total })),
    ocupacaoGrupo: ocupacaoGrupo.data ?? [],
  };
}

export async function fetchIndicatorData(filters: IndicatorFilters) {
  const db = requireSupabase();
  let impactoQuery = db.from('vw_impacto_social').select('*');
  let recursosQuery = db.from('vw_recursos_por_projeto').select('*');

  if (filters.ano && filters.ano !== 'todos') impactoQuery = impactoQuery.eq('ano', filters.ano);
  if (filters.mes && filters.mes !== 'todos') impactoQuery = impactoQuery.eq('mes', filters.mes);
  (['projeto_id', 'cidade', 'polo', 'modalidade', 'patrocinador', 'fonte_recurso'] as const).forEach((key) => {
    const value = filters[key];
    if (value && value !== 'todos') {
      impactoQuery = impactoQuery.eq(key, value);
      recursosQuery = recursosQuery.eq(key, value);
    }
  });

  const [impacto, recursos] = await Promise.all([impactoQuery, recursosQuery]);
  if (impacto.error) throw impacto.error;
  if (recursos.error) throw recursos.error;
  return { impacto: (impacto.data ?? []) as ImpactRow[], recursos: (recursos.data ?? []) as ResourceByProject[] };
}


type FilterableQuery = { eq: (column: string, value: string | number) => FilterableQuery; order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown[] | null; error: unknown }> };

function applyPanelFilters(
  query: FilterableQuery,
  filters: IntegratedPanelFilters,
  allowed: Array<keyof IntegratedPanelFilters>,
) {
  let current = query;
  allowed.forEach((key) => {
    const value = filters[key];
    if (value && value !== 'todos') current = current.eq(key, value);
  });
  return current;
}

export async function fetchIntegratedPanelData(filters: IntegratedPanelFilters): Promise<IntegratedPanelData> {
  const db = requireSupabase();
  const temporalFilters: Array<keyof IntegratedPanelFilters> = ['ano', 'mes', 'projeto', 'cidade', 'polo', 'modalidade', 'patrocinador'];
  const dimensionFilters: Array<keyof IntegratedPanelFilters> = ['ano', 'mes', 'projeto', 'cidade', 'polo', 'modalidade', 'patrocinador'];

  const pessoasBase = db.from('vw_painel_pessoas').select('*') as unknown as FilterableQuery;
  const pessoasQuery = applyPanelFilters(pessoasBase, filters, temporalFilters);
  const atendimentosBase = db.from('vw_painel_atendimentos').select('*') as unknown as FilterableQuery;
  const atendimentosQuery = applyPanelFilters(atendimentosBase, filters, temporalFilters);
  const atividadesBase = db.from('vw_painel_atividades').select('*') as unknown as FilterableQuery;
  const atividadesQuery = applyPanelFilters(atividadesBase, filters, temporalFilters);
  const gruposBase = db.from('vw_painel_grupos').select('*') as unknown as FilterableQuery;
  const gruposQuery = applyPanelFilters(gruposBase, filters, dimensionFilters);
  const condicoesBase = db.from('vw_painel_condicoes').select('*') as unknown as FilterableQuery;
  const condicoesQuery = applyPanelFilters(condicoesBase, filters, temporalFilters);
  const frequenciasBase = db.from('vw_painel_frequencia_projeto').select('*') as unknown as FilterableQuery;
  const frequenciasQuery = applyPanelFilters(frequenciasBase, filters, temporalFilters);
  const ocupacaoBase = db.from('vw_painel_ocupacao_turma').select('*') as unknown as FilterableQuery;
  const ocupacaoQuery = applyPanelFilters(ocupacaoBase, filters, dimensionFilters);
  const projetosStatusBase = db.from('vw_painel_projetos_status').select('*') as unknown as FilterableQuery;
  const projetosStatusQuery = applyPanelFilters(projetosStatusBase, filters, dimensionFilters);

  const [pessoas, atendimentos, atividades, grupos, condicoes, frequencias, ocupacao, projetosStatus] = await Promise.all([
    pessoasQuery.order('total', { ascending: false }),
    atendimentosQuery.order('total', { ascending: false }),
    atividadesQuery.order('ano'),
    gruposQuery.order('projeto'),
    condicoesQuery.order('total', { ascending: false }),
    frequenciasQuery.order('projeto'),
    ocupacaoQuery.order('grupo'),
    projetosStatusQuery.order('status'),
  ]);

  const errors = [pessoas, atendimentos, atividades, grupos, condicoes, frequencias, ocupacao, projetosStatus]
    .map((result) => result.error)
    .filter(Boolean);
  if (errors.length) throw errors[0];

  return {
    pessoas: (pessoas.data ?? []) as IntegratedPanelData['pessoas'],
    atendimentos: (atendimentos.data ?? []) as IntegratedPanelData['atendimentos'],
    atividades: (atividades.data ?? []) as IntegratedPanelData['atividades'],
    grupos: (grupos.data ?? []) as IntegratedPanelData['grupos'],
    condicoes: (condicoes.data ?? []) as IntegratedPanelData['condicoes'],
    frequencias: (frequencias.data ?? []) as IntegratedPanelData['frequencias'],
    ocupacao: (ocupacao.data ?? []) as IntegratedPanelData['ocupacao'],
    projetosStatus: (projetosStatus.data ?? []) as IntegratedPanelData['projetosStatus'],
  };
}

export async function fetchReport(kind: string, filters: IndicatorFilters & { inicio?: string; fim?: string }): Promise<ReportRow[]> {
  const db = requireSupabase();
  let query = db.from('relatorios').select('tipo, periodo_inicio, periodo_fim, projeto_id, cidade, conteudo, indicadores, created_at').eq('tipo', kind);
  if (filters.projeto_id && filters.projeto_id !== 'todos') query = query.eq('projeto_id', filters.projeto_id);
  if (filters.cidade && filters.cidade !== 'todos') query = query.eq('cidade', filters.cidade);
  if (filters.inicio) query = query.gte('periodo_inicio', filters.inicio);
  if (filters.fim) query = query.lte('periodo_fim', filters.fim);
  const { data, error } = await query.order('periodo_inicio', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function insertImportLog(tipo: string, arquivo: string, total: number, erros: unknown[]) {
  const db = requireSupabase();
  const { error } = await db.from('logs_importacao').insert({ tipo, arquivo, total_registros: total, erros });
  if (error) throw error;
}
