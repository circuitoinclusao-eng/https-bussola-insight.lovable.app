import { requireSupabase } from './supabase';

type JsonRecord = Record<string, string | number | boolean | null | undefined>;

async function insertAndReturn(table: string, payload: JsonRecord) {
  const db = requireSupabase();
  const { data, error } = await db.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export const createEdital = (payload: JsonRecord) => insertAndReturn('editais', payload);
export const createProjeto = (payload: JsonRecord) => insertAndReturn('projetos', payload);
export const createAtendido = (payload: JsonRecord) => insertAndReturn('atendidos', payload);
export const createGrupo = (payload: JsonRecord) => insertAndReturn('grupos', payload);
export const createAtividade = (payload: JsonRecord) => insertAndReturn('atividades', payload);
export const createFrequencia = (payload: JsonRecord) => insertAndReturn('frequencias', payload);
export const createAtendimento = (payload: JsonRecord) => insertAndReturn('atendimentos', payload);
export const createRelacionamento = (payload: JsonRecord) => insertAndReturn('relacionamento', payload);

export async function registerAccessLog(tabela: string, acao: string, registro_id?: string) {
  const db = requireSupabase();
  const { error } = await db.from('logs_acesso').insert({ tabela, acao, registro_id });
  if (error) throw error;
}
