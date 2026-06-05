import { readFileSync } from 'node:fs';

const importer = readFileSync('src/lib/importer.ts', 'utf8');
const importPage = readFileSync('src/pages/Importacao.tsx', 'utf8');
const data = readFileSync('src/lib/data.ts', 'utf8');
const hook = readFileSync('src/hooks/useSupabaseQuery.ts', 'utf8');
const readme = readFileSync('README.md', 'utf8');

const requiredKinds = ['atendidos', 'atividades', 'frequencias', 'atendimentos', 'projetos', 'grupos'];
const requiredImporterFunctions = ['guessColumnMapping', 'buildImportRecords', 'findExistingDuplicates', 'canImportData', 'importRows'];
const requiredUiMarkers = ['Mapeamento de colunas', 'Pré-visualização', 'Confirmar e importar', 'Erros por linha', 'Acesso restrito'];

for (const kind of requiredKinds) {
  if (!importer.includes(`${kind}:`) && !importer.includes(`'${kind}'`)) {
    throw new Error(`Tipo de importação ausente: ${kind}`);
  }
  if (!readme.toLowerCase().includes(kind === 'frequencias' ? 'frequência' : kind)) {
    throw new Error(`README não documenta a base: ${kind}`);
  }
}

for (const fn of requiredImporterFunctions) {
  if (!importer.includes(`function ${fn}`) && !importer.includes(`async function ${fn}`)) {
    throw new Error(`Função obrigatória ausente no importer: ${fn}`);
  }
}

for (const marker of requiredUiMarkers) {
  if (!importPage.includes(marker)) throw new Error(`Marcador de UI ausente: ${marker}`);
}

if (!importer.includes("['administrador', 'coordenacao']")) {
  throw new Error('Importação deve ser restrita a administrador e coordenação.');
}

if (!importer.includes('sensitive: true') || !importPage.includes('displayValue(record[field.key], field.sensitive)')) {
  throw new Error('Pré-visualização deve mascarar campos sensíveis.');
}

if (!importer.includes('bulkInsertAndReturnIds')) {
  throw new Error('Importação deve persistir pela camada centralizada de operações.');
}

if (!hook.includes('IMPORT_COMPLETED_EVENT') || !importer.includes('IMPORT_COMPLETED_EVENT')) {
  throw new Error('Dashboard/Painel devem poder atualizar após importação via evento compartilhado.');
}

const integratedPanelFunction = data.match(/export async function fetchIntegratedPanelData[\s\S]*?\n}\n\nexport async function/);
if (!integratedPanelFunction) throw new Error('fetchIntegratedPanelData não encontrado.');
const froms = [...integratedPanelFunction[0].matchAll(/db\.from\('([^']+)'\)/g)].map((match) => match[1]);
if (!froms.length || froms.some((source) => !source.startsWith('vw_'))) {
  throw new Error('fetchIntegratedPanelData deve consultar somente views agregadas.');
}

console.log('Importação Bússola verificada com sucesso.');
