import { requireSupabase } from './supabase';

export type ImportKind = 'atendidos' | 'atividades' | 'frequencias' | 'atendimentos' | 'projetos' | 'grupos';
export type RawImportRow = Record<string, unknown>;
export type ImportValue = string | number | boolean | null;
export type ImportRecord = Record<string, ImportValue>;
export type ColumnMapping = Record<string, string>;
export type ValidationError = { linha: number; campo: string; mensagem: string };
export type ImportFieldType = 'text' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'uuid' | 'attendance_status';
export type ImportField = { key: string; label: string; required?: boolean; type: ImportFieldType; aliases: string[]; sensitive?: boolean };
export type ImportConfig = { label: string; table: string; fields: ImportField[]; duplicateKey: (row: ImportRecord) => string };

type ImportSummary = { inserted: number; errors: ValidationError[] };

const duplicateSelectByKind: Record<ImportKind, string> = {
  atendidos: 'projeto_id,nome,data_nascimento,cpf',
  atividades: 'projeto_id,grupo_id,data,titulo',
  frequencias: 'atividade_id,atendido_id',
  atendimentos: 'atendido_id,tipo,data',
  projetos: 'nome,cidade',
  grupos: 'projeto_id,nome',
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const importConfigs: Record<ImportKind, ImportConfig> = {
  atendidos: {
    label: 'Atendidos',
    table: 'atendidos',
    fields: [
      { key: 'projeto_id', label: 'ID do projeto', required: true, type: 'uuid', aliases: ['projeto_id', 'id_projeto', 'projeto'] },
      { key: 'grupo_id', label: 'ID do grupo/turma', type: 'uuid', aliases: ['grupo_id', 'turma_id', 'id_grupo', 'id_turma'] },
      { key: 'nome', label: 'Nome do atendido', required: true, type: 'text', aliases: ['nome', 'nome_completo', 'atendido'] },
      { key: 'cidade', label: 'Cidade', required: true, type: 'text', aliases: ['cidade', 'municipio'] },
      { key: 'bairro', label: 'Bairro/endereço parcial', type: 'text', aliases: ['bairro', 'endereco', 'endereço'], sensitive: true },
      { key: 'data_nascimento', label: 'Data de nascimento', type: 'date', aliases: ['data_nascimento', 'nascimento', 'data_de_nascimento'], sensitive: true },
      { key: 'genero', label: 'Gênero', type: 'text', aliases: ['genero', 'gênero', 'sexo'] },
      { key: 'raca_cor', label: 'Raça/cor', type: 'text', aliases: ['raca_cor', 'raça_cor', 'cor', 'raca', 'raça'] },
      { key: 'cpf', label: 'CPF', type: 'text', aliases: ['cpf', 'documento'], sensitive: true },
      { key: 'telefone', label: 'Telefone', type: 'text', aliases: ['telefone', 'celular', 'whatsapp'], sensitive: true },
      { key: 'deficiencia', label: 'Deficiência', type: 'text', aliases: ['deficiencia', 'deficiência', 'pcd'] },
      { key: 'condicao', label: 'Condição', type: 'text', aliases: ['condicao', 'condição', 'diagnostico', 'diagnóstico'] },
      { key: 'laudo', label: 'Laudo', type: 'text', aliases: ['laudo', 'laudo_medico', 'laudo_médico'], sensitive: true },
      { key: 'consentimento_lgpd', label: 'Consentimento LGPD', type: 'boolean', aliases: ['consentimento_lgpd', 'lgpd', 'termo_lgpd'] },
      { key: 'termo_imagem', label: 'Termo de imagem', type: 'boolean', aliases: ['termo_imagem', 'imagem', 'autorizacao_imagem', 'autorização_imagem'] },
      { key: 'ativo', label: 'Ativo', type: 'boolean', aliases: ['ativo', 'status_ativo'] },
    ],
    duplicateKey: (row) => row.cpf ? `cpf:${row.cpf}` : `atendido:${row.projeto_id}:${row.nome}:${row.data_nascimento ?? ''}`,
  },
  atividades: {
    label: 'Atividades',
    table: 'atividades',
    fields: [
      { key: 'projeto_id', label: 'ID do projeto', required: true, type: 'uuid', aliases: ['projeto_id', 'id_projeto', 'projeto'] },
      { key: 'grupo_id', label: 'ID do grupo/turma', type: 'uuid', aliases: ['grupo_id', 'turma_id', 'id_grupo', 'id_turma'] },
      { key: 'professor_id', label: 'ID do professor', type: 'uuid', aliases: ['professor_id', 'id_professor'] },
      { key: 'tipo', label: 'Tipo', required: true, type: 'text', aliases: ['tipo', 'tipo_atividade'] },
      { key: 'titulo', label: 'Título', required: true, type: 'text', aliases: ['titulo', 'título', 'atividade', 'nome'] },
      { key: 'local', label: 'Local', type: 'text', aliases: ['local', 'espaco', 'espaço'] },
      { key: 'data', label: 'Data', required: true, type: 'date', aliases: ['data', 'data_atividade'] },
      { key: 'inicio', label: 'Início', type: 'time', aliases: ['inicio', 'início', 'hora_inicio'] },
      { key: 'fim', label: 'Fim', type: 'time', aliases: ['fim', 'hora_fim'] },
      { key: 'atendimentos_dia', label: 'Atendimentos do dia', type: 'integer', aliases: ['atendimentos_dia', 'atendimentos', 'presentes_estimados'] },
    ],
    duplicateKey: (row) => `atividade:${row.projeto_id}:${row.grupo_id ?? ''}:${row.data}:${row.titulo}`,
  },
  frequencias: {
    label: 'Frequência',
    table: 'frequencias',
    fields: [
      { key: 'atividade_id', label: 'ID da atividade', required: true, type: 'uuid', aliases: ['atividade_id', 'id_atividade', 'atividade'] },
      { key: 'atendido_id', label: 'ID do atendido', required: true, type: 'uuid', aliases: ['atendido_id', 'id_atendido', 'pessoa_id'] },
      { key: 'status', label: 'Status', required: true, type: 'attendance_status', aliases: ['status', 'presenca', 'presença', 'frequencia', 'frequência'] },
      { key: 'justificativa', label: 'Justificativa', type: 'text', aliases: ['justificativa', 'motivo'] },
    ],
    duplicateKey: (row) => `frequencia:${row.atividade_id}:${row.atendido_id}`,
  },
  atendimentos: {
    label: 'Atendimentos',
    table: 'atendimentos',
    fields: [
      { key: 'atendido_id', label: 'ID do atendido', required: true, type: 'uuid', aliases: ['atendido_id', 'id_atendido', 'pessoa_id'] },
      { key: 'projeto_id', label: 'ID do projeto', type: 'uuid', aliases: ['projeto_id', 'id_projeto', 'projeto'] },
      { key: 'tecnico_id', label: 'ID do técnico', type: 'uuid', aliases: ['tecnico_id', 'id_tecnico', 'técnico_id'] },
      { key: 'tipo', label: 'Tipo', required: true, type: 'text', aliases: ['tipo', 'tipo_atendimento'] },
      { key: 'data', label: 'Data/hora', type: 'date', aliases: ['data', 'data_atendimento'] },
      { key: 'encaminhamento', label: 'Encaminhamento', type: 'text', aliases: ['encaminhamento', 'encaminhado_para'] },
      { key: 'encaminhamento_status', label: 'Status do encaminhamento', type: 'text', aliases: ['encaminhamento_status', 'status_encaminhamento'] },
      { key: 'observacao_restrita', label: 'Observação restrita', type: 'text', aliases: ['observacao_restrita', 'observação_restrita', 'observacoes', 'observações'], sensitive: true },
    ],
    duplicateKey: (row) => `atendimento:${row.atendido_id}:${row.tipo}:${row.data ?? ''}`,
  },
  projetos: {
    label: 'Projetos',
    table: 'projetos',
    fields: [
      { key: 'edital_id', label: 'ID do edital', type: 'uuid', aliases: ['edital_id', 'id_edital', 'edital'] },
      { key: 'nome', label: 'Nome do projeto', required: true, type: 'text', aliases: ['nome', 'projeto', 'nome_projeto'] },
      { key: 'status', label: 'Status', type: 'text', aliases: ['status', 'situacao', 'situação'] },
      { key: 'cidade', label: 'Cidade', required: true, type: 'text', aliases: ['cidade', 'municipio'] },
      { key: 'polo', label: 'Polo', type: 'text', aliases: ['polo', 'núcleo', 'nucleo'] },
      { key: 'modalidade', label: 'Modalidade', type: 'text', aliases: ['modalidade'] },
      { key: 'patrocinador', label: 'Patrocinador', type: 'text', aliases: ['patrocinador', 'financiador'] },
      { key: 'fonte_recurso', label: 'Fonte de recurso', type: 'text', aliases: ['fonte_recurso', 'fonte', 'recurso'] },
      { key: 'valor_aprovado', label: 'Valor aprovado', type: 'number', aliases: ['valor_aprovado', 'aprovado'] },
      { key: 'valor_executado', label: 'Valor executado', type: 'number', aliases: ['valor_executado', 'executado'] },
      { key: 'data_inicio', label: 'Data início', type: 'date', aliases: ['data_inicio', 'início', 'inicio'] },
      { key: 'data_fim', label: 'Data fim', type: 'date', aliases: ['data_fim', 'fim'] },
    ],
    duplicateKey: (row) => `projeto:${row.nome}:${row.cidade}`,
  },
  grupos: {
    label: 'Grupos/Turmas',
    table: 'grupos',
    fields: [
      { key: 'projeto_id', label: 'ID do projeto', required: true, type: 'uuid', aliases: ['projeto_id', 'id_projeto', 'projeto'] },
      { key: 'nome', label: 'Nome do grupo/turma', required: true, type: 'text', aliases: ['nome', 'grupo', 'turma'] },
      { key: 'cidade', label: 'Cidade', type: 'text', aliases: ['cidade', 'municipio'] },
      { key: 'polo', label: 'Polo', type: 'text', aliases: ['polo', 'núcleo', 'nucleo'] },
      { key: 'modalidade', label: 'Modalidade', type: 'text', aliases: ['modalidade'] },
      { key: 'professor_id', label: 'ID do professor', type: 'uuid', aliases: ['professor_id', 'id_professor'] },
      { key: 'vagas', label: 'Vagas', type: 'integer', aliases: ['vagas', 'capacidade'] },
      { key: 'ativo', label: 'Ativo', type: 'boolean', aliases: ['ativo', 'status_ativo'] },
    ],
    duplicateKey: (row) => `grupo:${row.projeto_id}:${row.nome}`,
  },
};

export function normalizeColumnName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function guessColumnMapping(kind: ImportKind, headers: string[]): ColumnMapping {
  const normalizedHeaders = new Map(headers.map((header) => [normalizeColumnName(header), header]));
  return Object.fromEntries(importConfigs[kind].fields.map((field) => {
    const source = field.aliases.map(normalizeColumnName).find((alias) => normalizedHeaders.has(alias));
    return [field.key, source ? normalizedHeaders.get(source) ?? '' : ''];
  }));
}

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === '';
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const brDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (brDate) {
    const year = brDate[3].length === 2 ? `20${brDate[3]}` : brDate[3];
    return `${year}-${brDate[2].padStart(2, '0')}-${brDate[1].padStart(2, '0')}`;
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString().slice(0, 10);
  return text;
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return value;
  const normalized = String(value).trim().replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Number(normalized);
}

function parseBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeColumnName(String(value));
  if (['sim', 's', 'true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['nao', 'n', 'false', '0', 'no'].includes(normalized)) return false;
  return Boolean(value);
}

export function parseImportValue(value: unknown, field: ImportField): ImportValue {
  if (isBlank(value)) return null;
  if (field.type === 'number') return parseNumber(value);
  if (field.type === 'integer') return Math.trunc(parseNumber(value));
  if (field.type === 'boolean') return parseBoolean(value);
  if (field.type === 'date') return parseDate(value);
  if (field.type === 'time') return String(value).trim();
  if (field.type === 'attendance_status') {
    const normalized = normalizeColumnName(String(value));
    if (['p', 'presente', 'presenca', 'presenca_confirmada'].includes(normalized)) return 'presente';
    if (['f', 'falta', 'ausente'].includes(normalized)) return 'falta';
    if (['j', 'justificada', 'falta_justificada'].includes(normalized)) return 'justificada';
    return String(value).trim();
  }
  return String(value).trim();
}

function validateValue(rowNumber: number, field: ImportField, value: ImportValue, errors: ValidationError[]) {
  if (field.required && (value === null || value === '')) {
    errors.push({ linha: rowNumber, campo: field.key, mensagem: 'Campo obrigatório ausente' });
    return;
  }
  if (value === null || value === '') return;
  if (field.type === 'uuid' && !uuidPattern.test(String(value))) errors.push({ linha: rowNumber, campo: field.key, mensagem: 'UUID inválido' });
  if ((field.type === 'number' || field.type === 'integer') && typeof value === 'number' && Number.isNaN(value)) errors.push({ linha: rowNumber, campo: field.key, mensagem: 'Número inválido' });
  if (field.type === 'attendance_status' && !['presente', 'falta', 'justificada'].includes(String(value))) errors.push({ linha: rowNumber, campo: field.key, mensagem: 'Status deve ser presente, falta ou justificada' });
}

export function buildImportRecords(kind: ImportKind, rows: RawImportRow[], mapping: ColumnMapping) {
  const config = importConfigs[kind];
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  const records = rows.map((row, index) => {
    const line = index + 2;
    const record: ImportRecord = {};
    config.fields.forEach((field) => {
      const source = mapping[field.key];
      const value = source ? parseImportValue(row[source], field) : null;
      validateValue(line, field, value, errors);
      if (value !== null && value !== '') record[field.key] = value;
    });
    if (hasRequiredValues(config, record)) {
      const duplicateKey = config.duplicateKey(record).toLowerCase();
      if (seen.has(duplicateKey)) errors.push({ linha: line, campo: 'duplicado', mensagem: 'Registro duplicado no arquivo' });
      seen.add(duplicateKey);
    }
    return record;
  });
  return { records, errors };
}


function hasRequiredValues(config: ImportConfig, row: ImportRecord) {
  return config.fields.filter((field) => field.required).every((field) => row[field.key] !== null && row[field.key] !== undefined && row[field.key] !== '');
}

export async function findExistingDuplicates(kind: ImportKind, records: ImportRecord[]): Promise<ValidationError[]> {
  const db = requireSupabase();
  const config = importConfigs[kind];
  const completeRecords = records.filter((record) => hasRequiredValues(config, record));
  if (!completeRecords.length) return [];
  const { data, error } = await db.from(config.table).select(duplicateSelectByKind[kind]).limit(10000);
  if (error) throw error;
  const existing = new Set((data ?? []).map((row) => config.duplicateKey(row as ImportRecord).toLowerCase()));
  return records.flatMap((record, index) => {
    if (!hasRequiredValues(config, record)) return [];
    return existing.has(config.duplicateKey(record).toLowerCase())
      ? [{ linha: index + 2, campo: 'duplicado', mensagem: 'Registro já existe no Supabase' }]
      : [];
  });
}

export async function canImportData() {
  const db = requireSupabase();
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return false;
  const { data, error } = await db.from('perfis').select('papel').eq('ativo', true).in('papel', ['administrador', 'coordenacao']);
  if (error) throw error;
  return Boolean(data?.length);
}

export async function importRows(kind: ImportKind, records: ImportRecord[]): Promise<ImportSummary> {
  if (!records.length) return { inserted: 0, errors: [] };
  const db = requireSupabase();
  const config = importConfigs[kind];
  const { data, error } = await db.from(config.table).insert(records).select('id');
  if (error) {
    return { inserted: 0, errors: [{ linha: 0, campo: config.table, mensagem: error.message }] };
  }
  window.dispatchEvent(new CustomEvent('circuito:importacao-concluida', { detail: { kind, inserted: data?.length ?? records.length } }));
  return { inserted: data?.length ?? records.length, errors: [] };
}
