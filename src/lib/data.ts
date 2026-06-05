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


function applyPanelFilters<T extends { eq: (column: string, value: string | number) => T }>(
  query: T,
  filters: IntegratedPanelFilters,
  allowed: Array<keyof IntegratedPanelFilters>,
) {
  return allowed.reduce((current, key) => {
    const value = filters[key];
    return value && value !== 'todos' ? current.eq(key, value) : current;
  }, query);
}

export async function fetchIntegratedPanelData(filters: IntegratedPanelFilters): Promise<IntegratedPanelData> {
  const db = requireSupabase();
  const temporalFilters: Array<keyof IntegratedPanelFilters> = ['ano', 'mes', 'projeto', 'cidade', 'polo', 'modalidade', 'patrocinador'];
  const dimensionFilters: Array<keyof IntegratedPanelFilters> = ['ano', 'mes', 'projeto', 'cidade', 'polo', 'modalidade', 'patrocinador'];

  const pessoasQuery = applyPanelFilters(db.from('vw_painel_pessoas').select('*'), filters, temporalFilters);
  const atendimentosQuery = applyPanelFilters(db.from('vw_painel_atendimentos').select('*'), filters, temporalFilters);
  const atividadesQuery = applyPanelFilters(db.from('vw_painel_atividades').select('*'), filters, temporalFilters);
  const gruposQuery = applyPanelFilters(db.from('vw_painel_grupos').select('*'), filters, dimensionFilters);
  const condicoesQuery = applyPanelFilters(db.from('vw_painel_condicoes').select('*'), filters, temporalFilters);
  const frequenciasQuery = applyPanelFilters(db.from('vw_painel_frequencia_projeto').select('*'), filters, temporalFilters);
  const ocupacaoQuery = applyPanelFilters(db.from('vw_painel_ocupacao_turma').select('*'), filters, dimensionFilters);
  const projetosStatusQuery = applyPanelFilters(db.from('vw_painel_projetos_status').select('*'), filters, dimensionFilters);

  const [pessoas, atendimentos, atividades, grupos, condicoes, frequencias, ocupacao, projetosStatus] = await Promise.all([
    pessoasQuery.order('total', { ascending: false }),
    atendimentosQuery.order('total', { ascending: false }),
    atividadesQuery.order('ano').order('mes'),
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
    pessoas: pessoas.data ?? [],
    atendimentos: atendimentos.data ?? [],
    atividades: atividades.data ?? [],
    grupos: grupos.data ?? [],
    condicoes: condicoes.data ?? [],
    frequencias: frequencias.data ?? [],
    ocupacao: ocupacao.data ?? [],
    projetosStatus: projetosStatus.data ?? [],
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
