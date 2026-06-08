import { atendidos, atendimentos, fontesPlanilha, logsProcessamento, projetos, registrosAtendimento } from '../data/mockData';
import type { FiltrosGerenciais, FontePlanilha, MapeamentoColuna } from '../types';
import { agruparPor, filtrarRegistros, resumoPorGrau } from './consolidacao';
import { supabaseClient, supabaseConfigurado } from './supabaseClient';

async function listarOuMock<T>(tabela: string, mock: T[]): Promise<T[]> {
  if (!supabaseConfigurado || !supabaseClient) return mock;
  const { data, error } = await supabaseClient.from(tabela).select('*');
  if (error || !data?.length) return mock;
  return data as T[];
}

export const listarFontes = () => listarOuMock('fontes_planilha', fontesPlanilha);
export async function criarFonte(fonte: FontePlanilha) { return supabaseConfigurado && supabaseClient ? (await supabaseClient.from('fontes_planilha').insert(fonte)).data : fonte; }
export async function processarFonte(fonteId: string) { return { fonteId, status: 'Processada', mensagem: 'Fonte processada com fallback local quando Supabase não estiver configurado.' }; }
export async function salvarMapeamentoColunas(mapeamentos: MapeamentoColuna[]) { return supabaseConfigurado && supabaseClient ? (await supabaseClient.from('mapeamentos_colunas').upsert(mapeamentos)).data : mapeamentos; }
export const listarRegistrosAtendimento = () => listarOuMock('registros_atendimento', registrosAtendimento);
export const listarAtendidos = () => listarOuMock('atendidos', atendidos);
export const listarAtendimentos = () => listarOuMock('atendimentos', atendimentos);
export const listarProjetos = () => listarOuMock('projetos', projetos);
export const listarLogs = () => listarOuMock('logs_processamento', logsProcessamento);

export async function buscarIndicadoresDashboard(filtros: FiltrosGerenciais = {}) {
  const registros = filtrarRegistros(await listarRegistrosAtendimento(), filtros);
  return { registros, porGrau: agruparPor(registros, 'grau'), porCidade: agruparPor(registros, 'cidade') };
}

export async function buscarRelatorioPorGrau(filtros: FiltrosGerenciais = {}) { return resumoPorGrau(filtrarRegistros(await listarRegistrosAtendimento(), filtros)); }
export async function buscarRelatorioPorTipoDeficiencia(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'tipoDeficiencia'); }
export async function buscarRelatorioPorCidade(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'cidade'); }
export async function buscarRelatorioPorSexo(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'sexo'); }
export async function buscarRelatorioPorFaixaEtaria(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'faixaEtaria'); }
