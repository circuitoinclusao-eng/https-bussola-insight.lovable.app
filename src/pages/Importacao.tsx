import * as XLSX from 'xlsx';
import { useState } from 'react';
import { insertImportLog } from '../lib/data';

type ValidationError = { linha: number; campo: string; mensagem: string };
const requiredByType = { atendidos: ['nome', 'projeto_id'], atividades: ['projeto_id', 'data', 'tipo'], frequencias: ['atividade_id', 'atendido_id', 'status'] } as const;

export function Importacao() {
  const [tipo, setTipo] = useState<keyof typeof requiredByType>('atendidos');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [message, setMessage] = useState('');

  async function validate(file: File) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
    const seen = new Set<string>();
    const validationErrors: ValidationError[] = [];
    rows.forEach((row, index) => {
      requiredByType[tipo].forEach((field) => {
        if (!row[field]) validationErrors.push({ linha: index + 2, campo: field, mensagem: 'Campo obrigatório ausente' });
      });
      const fingerprint = JSON.stringify(row).toLowerCase();
      if (seen.has(fingerprint)) validationErrors.push({ linha: index + 2, campo: 'duplicado', mensagem: 'Registro duplicado no arquivo' });
      seen.add(fingerprint);
    });
    setErrors(validationErrors);
    await insertImportLog(tipo, file.name, rows.length, validationErrors);
    setMessage(validationErrors.length ? 'Erros encontrados antes de importar.' : 'Arquivo validado. Indicadores serão atualizados automaticamente ao inserir no Supabase.');
  }

  return (
    <div className="page-stack">
      <header className="page-header"><div><span>Importação Bússola</span><h1>CSV/Excel com validação e log</h1></div></header>
      <section className="import-card">
        <label>Base<select value={tipo} onChange={(event) => setTipo(event.target.value as keyof typeof requiredByType)}><option value="atendidos">Atendidos</option><option value="atividades">Atividades</option><option value="frequencias">Frequência</option></select></label>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(event) => event.target.files?.[0] && validate(event.target.files[0])} />
        <p>{message || 'Selecione um arquivo para validar duplicidades e campos obrigatórios antes da importação.'}</p>
      </section>
      {errors.length > 0 && <table><thead><tr><th>Linha</th><th>Campo</th><th>Erro</th></tr></thead><tbody>{errors.map((error, index) => <tr key={index}><td>{error.linha}</td><td>{error.campo}</td><td>{error.mensagem}</td></tr>)}</tbody></table>}
    </div>
  );
}
