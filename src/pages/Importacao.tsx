import * as XLSX from 'xlsx';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { insertImportLog } from '../lib/data';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  buildImportRecords,
  canImportData,
  findExistingDuplicates,
  guessColumnMapping,
  importConfigs,
  importRows,
  type ColumnMapping,
  type ImportKind,
  type RawImportRow,
  type ValidationError,
} from '../lib/importer';

const importKinds = Object.keys(importConfigs) as ImportKind[];
const maxPreviewRows = 8;

function collectHeaders(rows: RawImportRow[]) {
  return Array.from(rows.reduce((headers, row) => {
    Object.keys(row).forEach((header) => headers.add(header));
    return headers;
  }, new Set<string>()));
}

function displayValue(value: unknown, sensitive?: boolean) {
  if (value === null || value === undefined || value === '') return '—';
  if (!sensitive) return String(value);
  const text = String(value);
  return text.length > 4 ? `•••• ${text.slice(-4)}` : '••••';
}

export function Importacao() {
  const [tipo, setTipo] = useState<ImportKind>('atendidos');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(() => guessColumnMapping('atendidos', []));
  const [message, setMessage] = useState('Selecione um arquivo CSV ou Excel para mapear colunas e validar antes da importação.');
  const [saving, setSaving] = useState(false);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [canImport, setCanImport] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [databaseErrors, setDatabaseErrors] = useState<ValidationError[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setPermissionLoading(false);
      return;
    }
    let mounted = true;
    canImportData()
      .then((allowed) => {
        if (mounted) setCanImport(allowed);
      })
      .catch((error: Error) => {
        if (mounted) setPermissionError(error.message);
      })
      .finally(() => {
        if (mounted) setPermissionLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const config = importConfigs[tipo];
  const { records, errors } = useMemo(() => buildImportRecords(tipo, rawRows, mapping), [tipo, rawRows, mapping]);
  const allErrors = useMemo(() => [...errors, ...databaseErrors], [errors, databaseErrors]);
  const validRows = Math.max(records.length - new Set(allErrors.filter((error) => error.linha > 0).map((error) => error.linha)).size, 0);
  const requiredMapped = config.fields.filter((field) => field.required).every((field) => Boolean(mapping[field.key]));
  const canConfirm = Boolean(rawRows.length && requiredMapped && !allErrors.length && !saving && !checkingDuplicates && canImport);

  useEffect(() => {
    if (!canImport || !rawRows.length || errors.length || !requiredMapped) {
      setDatabaseErrors([]);
      return;
    }
    let mounted = true;
    setCheckingDuplicates(true);
    findExistingDuplicates(tipo, records)
      .then((duplicates) => {
        if (mounted) setDatabaseErrors(duplicates);
      })
      .catch((error: Error) => {
        if (mounted) setDatabaseErrors([{ linha: 0, campo: 'duplicados_supabase', mensagem: error.message }]);
      })
      .finally(() => {
        if (mounted) setCheckingDuplicates(false);
      });
    return () => {
      mounted = false;
    };
  }, [canImport, errors.length, rawRows.length, records, requiredMapped, tipo]);

  function resetImport(nextKind = tipo, nextHeaders: string[] = [], nextRows: RawImportRow[] = []) {
    setDatabaseErrors([]);
    setHeaders(nextHeaders);
    setRawRows(nextRows);
    setMapping(guessColumnMapping(nextKind, nextHeaders));
  }

  function updateTipo(nextKind: ImportKind) {
    setTipo(nextKind);
    setMapping(guessColumnMapping(nextKind, headers));
  }

  function updateMapping(field: string, source: string) {
    setMapping((current) => ({ ...current, [field]: source }));
  }

  async function loadFile(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<RawImportRow>(sheet, { defval: '' });
    const detectedHeaders = collectHeaders(rows);
    setFileName(file.name);
    resetImport(tipo, detectedHeaders, rows);
    setMessage(rows.length ? `${rows.length} linhas carregadas. Revise o mapeamento, a pré-visualização e os erros antes de confirmar.` : 'Arquivo sem linhas importáveis.');
  }

  async function confirmImport() {
    if (!rawRows.length) return;
    if (allErrors.length || !requiredMapped) {
      await insertImportLog(tipo, fileName, rawRows.length, allErrors);
      setMessage('Importação bloqueada: revise erros e campos obrigatórios. O log de validação foi registrado.');
      return;
    }
    if (!window.confirm(`Confirmar importação de ${records.length} registros de ${config.label}? Os indicadores serão atualizados automaticamente pelas views do Supabase.`)) return;
    setSaving(true);
    try {
      const result = await importRows(tipo, records);
      await insertImportLog(tipo, fileName, result.inserted || rawRows.length, result.errors);
      if (result.errors.length) {
        setMessage(`Importação não concluída. ${result.errors.length} erro(s) foram registrados no log.`);
        return;
      }
      setMessage(`${result.inserted} registro(s) importado(s). Dashboard e Painel Integrado já passam a refletir os dados reais pelas views agregadas.`);
      resetImport(tipo);
      setFileName('');
    } catch (error) {
      setMessage(`Erro ao importar: ${error instanceof Error ? error.message : 'falha inesperada'}`);
    } finally {
      setSaving(false);
    }
  }

  if (!isSupabaseConfigured) return <EmptyState title="Supabase não configurado" action="Configure o Supabase para importar dados reais do Bússola." />;
  if (permissionLoading) return <p className="status">Verificando permissão de importação...</p>;
  if (permissionError) return <p className="status error">Erro ao verificar perfil de importação: {permissionError}</p>;
  if (!canImport) return <EmptyState title="Acesso restrito" action="Apenas Administrador e Coordenação podem importar dados." />;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span>Importação Bússola</span>
          <h1>CSV/Excel com mapeamento, validação e log</h1>
        </div>
        <strong>Administrador e Coordenação • RLS/LGPD ativo</strong>
      </header>

      <section className="import-card">
        <label>Base
          <select value={tipo} onChange={(event) => updateTipo(event.target.value as ImportKind)}>
            {importKinds.map((kind) => <option key={kind} value={kind}>{importConfigs[kind].label}</option>)}
          </select>
        </label>
        <label>Arquivo CSV/Excel
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => event.target.files?.[0] && loadFile(event.target.files[0])} />
        </label>
        <p>{message}</p>
        {checkingDuplicates && <p className="status">Verificando duplicados já existentes no Supabase...</p>}
        {fileName && <small>Arquivo selecionado: <strong>{fileName}</strong></small>}
      </section>

      {headers.length > 0 && (
        <section className="import-card wide">
          <div className="section-title">
            <div>
              <span>Mapeamento de colunas</span>
              <h2>Relacione a planilha aos campos do Supabase</h2>
            </div>
            <strong>{requiredMapped ? 'Obrigatórios mapeados' : 'Mapeie todos os obrigatórios'}</strong>
          </div>
          <div className="mapping-grid">
            {config.fields.map((field) => (
              <label key={field.key}>{field.label}{field.required ? ' *' : ''}{field.sensitive ? ' (restrito LGPD)' : ''}
                <select value={mapping[field.key] ?? ''} onChange={(event) => updateMapping(field.key, event.target.value)}>
                  <option value="">Não importar</option>
                  {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>
        </section>
      )}

      {rawRows.length > 0 && (
        <section className="import-card wide">
          <div className="section-title">
            <div>
              <span>Pré-visualização</span>
              <h2>{records.length} linhas lidas • {validRows} sem erro</h2>
            </div>
            <button disabled={!canConfirm} onClick={confirmImport}>{saving ? 'Importando...' : 'Confirmar e importar'}</button>
          </div>
          <p className="status">Dados sensíveis aparecem mascarados nesta prévia e nunca são usados em dashboards públicos; após salvar, as views agregadas atualizam Dashboard e Painel Integrado automaticamente.</p>
          <div className="table-scroll">
            <table>
              <thead><tr>{config.fields.filter((field) => mapping[field.key]).map((field) => <th key={field.key}>{field.label}</th>)}</tr></thead>
              <tbody>
                {records.slice(0, maxPreviewRows).map((record, index) => (
                  <tr key={index}>{config.fields.filter((field) => mapping[field.key]).map((field) => <td key={field.key}>{displayValue(record[field.key], field.sensitive)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {allErrors.length > 0 && (
        <section className="import-card wide">
          <div className="section-title">
            <div>
              <span>Erros por linha</span>
              <h2>{allErrors.length} inconsistência(s) antes de importar</h2>
            </div>
            <button onClick={confirmImport}>Registrar log de validação</button>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Linha</th><th>Campo</th><th>Erro</th></tr></thead>
              <tbody>{allErrors.map((error: ValidationError, index) => <tr key={index}><td>{error.linha}</td><td>{error.campo}</td><td>{error.mensagem}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
