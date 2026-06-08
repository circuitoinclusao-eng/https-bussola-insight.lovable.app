import { atendidos, atendimentos, fontesPlanilha, logsProcessamento, projetos, registrosAtendimento } from '../data/mockData';
import type { Atendido, FiltrosGerenciais, FontePlanilha, MapeamentoColuna } from '../types';
import { agruparPor, filtrarRegistros, resumoPorGrau } from './consolidacao';
import { supabaseClient, supabaseConfigurado } from './supabaseClient';

type AtendidoDb = {
  id: string;
  id_pessoa: string;
  nome: string;
  data_nascimento: string;
  idade: number;
  faixa_etaria: string;
  sexo: string;
  tipo_deficiencia: string;
  grau: string;
  cidade: string;
  territorio: string;
  unidade: string;
  projeto: string;
  servico: string;
  responsavel: string;
  telefone: string;
  email: string;
  escola: string;
  observacoes: string;
  status: string;
  origem_fonte?: string;
  data_retirada?: string;
  motivo_retirada?: string;
  observacoes_retirada?: string;
  retirado_por?: string;
  deleted_at?: string;
  created_at?: string;
  updated_at?: string;
};

function toAtendidoDb(atendido: Atendido): AtendidoDb {
  return {
    id: atendido.id,
    id_pessoa: atendido.idPessoa,
    nome: atendido.nome,
    data_nascimento: atendido.dataNascimento,
    idade: atendido.idade,
    faixa_etaria: atendido.faixaEtaria,
    sexo: atendido.sexo,
    tipo_deficiencia: atendido.tipoDeficiencia,
    grau: atendido.grau,
    cidade: atendido.cidade,
    territorio: atendido.territorio,
    unidade: atendido.unidade,
    projeto: atendido.projeto,
    servico: atendido.servico,
    responsavel: atendido.responsavel,
    telefone: atendido.telefone,
    email: atendido.email,
    escola: atendido.escola,
    observacoes: atendido.observacoes,
    status: atendido.status,
    origem_fonte: atendido.origemFonte,
    data_retirada: atendido.dataRetirada,
    motivo_retirada: atendido.motivoRetirada,
    observacoes_retirada: atendido.observacoesRetirada,
    retirado_por: atendido.retiradoPor,
    deleted_at: atendido.deletedAt,
    created_at: atendido.createdAt,
    updated_at: atendido.updatedAt,
  };
}

function fromAtendidoDb(row: AtendidoDb): Atendido {
  return {
    id: row.id,
    idPessoa: row.id_pessoa,
    nome: row.nome,
    dataNascimento: row.data_nascimento,
    idade: row.idade,
    faixaEtaria: row.faixa_etaria,
    sexo: row.sexo as Atendido['sexo'],
    tipoDeficiencia: row.tipo_deficiencia,
    grau: row.grau as Atendido['grau'],
    cidade: row.cidade,
    territorio: row.territorio,
    unidade: row.unidade,
    projeto: row.projeto,
    servico: row.servico,
    responsavel: row.responsavel,
    telefone: row.telefone,
    email: row.email,
    escola: row.escola,
    observacoes: row.observacoes,
    status: row.status as Atendido['status'],
    origemFonte: row.origem_fonte,
    dataRetirada: row.data_retirada,
    motivoRetirada: row.motivo_retirada,
    observacoesRetirada: row.observacoes_retirada,
    retiradoPor: row.retirado_por,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listarOuMock<T>(tabela: string, mock: T[], softDelete = false): Promise<T[]> {
  if (!supabaseConfigurado || !supabaseClient) return mock;
  const query = supabaseClient.from(tabela).select('*');
  const { data, error } = softDelete ? await query.is('deleted_at', null) : await query;
  if (error || !data?.length) return mock;
  return data as T[];
}

function registrarLogLocal(acao: string, quantidade: number, mensagem: string) {
  return {
    id: `log-${Date.now()}`,
    dataHora: new Date().toISOString(),
    fonte: 'Módulo Atendidos',
    status: 'Sucesso' as const,
    mensagem,
    linhasProcessadas: quantidade,
    quantidadeErros: 0,
    usuario: 'Sistema',
    acao,
    quantidadeRegistrosAfetados: quantidade,
  };
}

export const listarFontes = () => listarOuMock('fontes_planilha', fontesPlanilha);
export async function criarFonte(fonte: FontePlanilha) { return supabaseConfigurado && supabaseClient ? (await supabaseClient.from('fontes_planilha').insert(fonte)).data : fonte; }
export async function processarFonte(fonteId: string) { return { fonteId, status: 'Processada', mensagem: 'Fonte processada com fallback local quando Supabase não estiver configurado.' }; }
export async function salvarMapeamentoColunas(mapeamentos: MapeamentoColuna[]) { return supabaseConfigurado && supabaseClient ? (await supabaseClient.from('mapeamentos_colunas').upsert(mapeamentos)).data : mapeamentos; }
export const listarRegistrosAtendimento = () => listarOuMock('registros_atendimento', registrosAtendimento);
export async function listarAtendidos() {
  if (!supabaseConfigurado || !supabaseClient) return atendidos;
  const { data, error } = await supabaseClient.from('atendidos').select('*').is('deleted_at', null);
  if (error || !data?.length) return atendidos;
  return (data as AtendidoDb[]).map(fromAtendidoDb);
}
export const listarAtendimentos = () => listarOuMock('atendimentos', atendimentos);
export const listarProjetos = () => listarOuMock('projetos', projetos);
export const listarLogs = () => listarOuMock('logs_processamento', logsProcessamento);

export async function criarAtendido(atendido: Atendido) {
  if (!supabaseConfigurado || !supabaseClient) return { atendido, log: registrarLogLocal('criar_atendido', 1, `Aluno ${atendido.nome} cadastrado manualmente`) };
  const { data, error } = await supabaseClient.from('atendidos').insert(toAtendidoDb(atendido)).select().single();
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('criar_atendido', 1, `Aluno ${atendido.nome} cadastrado manualmente`));
  return { atendido: fromAtendidoDb(data as AtendidoDb) };
}

export async function atualizarAtendido(id: string, atendido: Atendido) {
  if (!supabaseConfigurado || !supabaseClient) return { atendido, log: registrarLogLocal('atualizar_atendido', 1, `Aluno ${atendido.nome} atualizado manualmente`) };
  const { data, error } = await supabaseClient.from('atendidos').update({ ...toAtendidoDb(atendido), updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('atualizar_atendido', 1, `Aluno ${atendido.nome} atualizado manualmente`));
  return { atendido: fromAtendidoDb(data as AtendidoDb) };
}

export async function deletarAtendido(id: string, nome = 'aluno') {
  const payload = { status: 'Excluído', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!supabaseConfigurado || !supabaseClient) return { id, ...payload, log: registrarLogLocal('deletar_atendido', 1, `Aluno ${nome} excluído da listagem de atendidos`) };
  const { error } = await supabaseClient.from('atendidos').update(payload).eq('id', id);
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('deletar_atendido', 1, `Aluno ${nome} excluído da listagem de atendidos`));
  return { id, ...payload };
}

export async function deletarAtendidosEmMassa(ids: string[]) {
  const payload = { status: 'Excluído', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!supabaseConfigurado || !supabaseClient) return { ids, ...payload, log: registrarLogLocal('deletar_atendidos_massa', ids.length, `${ids.length} alunos excluídos da listagem de atendidos`) };
  const { error } = await supabaseClient.from('atendidos').update(payload).in('id', ids);
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('deletar_atendidos_massa', ids.length, `${ids.length} alunos excluídos da listagem de atendidos`));
  return { ids, ...payload };
}

export async function importarAtendidos(novosAtendidos: Atendido[], nomeArquivo: string) {
  if (!supabaseConfigurado || !supabaseClient) return { atendidos: novosAtendidos, log: registrarLogLocal('importar_atendidos', novosAtendidos.length, `${novosAtendidos.length} alunos importados pela planilha ${nomeArquivo}`) };
  const { data, error } = await supabaseClient.from('atendidos').insert(novosAtendidos.map(toAtendidoDb)).select();
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('importar_atendidos', novosAtendidos.length, `${novosAtendidos.length} alunos importados pela planilha ${nomeArquivo}`));
  return { atendidos: (data as AtendidoDb[]).map(fromAtendidoDb) };
}


export async function retirarAtendidos(ids: string[], retirada: { dataRetirada: string; motivoRetirada: string; observacoesRetirada: string; retiradoPor: string }) {
  const payload = {
    status: 'Retirado',
    data_retirada: retirada.dataRetirada,
    motivo_retirada: retirada.motivoRetirada,
    observacoes_retirada: retirada.observacoesRetirada,
    retirado_por: retirada.retiradoPor,
    updated_at: new Date().toISOString(),
  };
  const mensagem = ids.length === 1 ? `Aluno retirado do projeto por ${retirada.motivoRetirada}.` : `${ids.length} alunos retirados em massa.`;
  if (!supabaseConfigurado || !supabaseClient) return { ids, ...payload, log: registrarLogLocal('retirar_atendidos', ids.length, mensagem) };
  const { error } = await supabaseClient.from('atendidos').update(payload).in('id', ids);
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('retirar_atendidos', ids.length, mensagem));
  return { ids, ...payload };
}

export async function reativarAtendido(id: string, nome = 'aluno') {
  const payload = { status: 'Ativo', updated_at: new Date().toISOString() };
  if (!supabaseConfigurado || !supabaseClient) return { id, ...payload, log: registrarLogLocal('reativar_atendido', 1, `Aluno ${nome} reativado na lista de atendidos.`) };
  const { error } = await supabaseClient.from('atendidos').update(payload).eq('id', id);
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('reativar_atendido', 1, `Aluno ${nome} reativado na lista de atendidos.`));
  return { id, ...payload };
}

export async function excluirAtendidoDefinitivamente(id: string, nome = 'aluno') {
  if (!supabaseConfigurado || !supabaseClient) return { id, log: registrarLogLocal('excluir_atendido_definitivo', 1, `Aluno ${nome} excluído definitivamente.`) };
  const { error } = await supabaseClient.from('atendidos').delete().eq('id', id);
  if (error) throw error;
  await supabaseClient.from('logs_processamento').insert(registrarLogLocal('excluir_atendido_definitivo', 1, `Aluno ${nome} excluído definitivamente.`));
  return { id };
}

export async function buscarAtendidosFiltrados(filtros: Partial<Pick<Atendido, 'cidade' | 'projeto' | 'tipoDeficiencia' | 'grau' | 'status'>> & { busca?: string }) {
  const lista = await listarAtendidos();
  const termo = filtros.busca?.toLowerCase().trim();
  return lista.filter((item) => !item.deletedAt && item.status !== 'Excluído'
    && (filtros.status || item.status !== 'Retirado')
    && (!termo || item.nome.toLowerCase().includes(termo))
    && (!filtros.cidade || item.cidade === filtros.cidade)
    && (!filtros.projeto || item.projeto === filtros.projeto)
    && (!filtros.tipoDeficiencia || item.tipoDeficiencia === filtros.tipoDeficiencia)
    && (!filtros.grau || item.grau === filtros.grau)
    && (!filtros.status || item.status === filtros.status));
}

export async function buscarIndicadoresDashboard(filtros: FiltrosGerenciais = {}) {
  const registros = filtrarRegistros(await listarRegistrosAtendimento(), filtros);
  return { registros, porGrau: agruparPor(registros, 'grau'), porCidade: agruparPor(registros, 'cidade') };
}

export async function buscarRelatorioPorGrau(filtros: FiltrosGerenciais = {}) { return resumoPorGrau(filtrarRegistros(await listarRegistrosAtendimento(), filtros)); }
export async function buscarRelatorioPorTipoDeficiencia(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'tipoDeficiencia'); }
export async function buscarRelatorioPorCidade(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'cidade'); }
export async function buscarRelatorioPorSexo(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'sexo'); }
export async function buscarRelatorioPorFaixaEtaria(filtros: FiltrosGerenciais = {}) { return agruparPor(filtrarRegistros(await listarRegistrosAtendimento(), filtros), 'faixaEtaria'); }
