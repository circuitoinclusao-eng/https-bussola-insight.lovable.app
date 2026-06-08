import type { GrauDeficiencia, Sexo } from '../types';

export const NAO_INFORMADO = 'Não informado';

export function limparTexto(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return texto.trim().replace(/\s+/g, ' ');
}

function semAcento(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function textoOuNaoInformado(valor: unknown): string {
  const texto = limparTexto(valor);
  return texto || NAO_INFORMADO;
}

export function padronizarGrau(valor: unknown): GrauDeficiencia {
  const texto = semAcento(limparTexto(valor));
  if (!texto) return NAO_INFORMADO;
  if (['leve', 'grau leve', 'l'].includes(texto)) return 'Leve';
  if (['moderado', 'grau moderado', 'm'].includes(texto)) return 'Moderado';
  if (['grave', 'severo', 'grau severo', 'grau grave', 'g'].includes(texto)) return 'Grave/Severo';
  if (texto.includes('sever') || texto.includes('grav')) return 'Grave/Severo';
  if (texto.includes('moder')) return 'Moderado';
  if (texto.includes('leve')) return 'Leve';
  return NAO_INFORMADO;
}

export function padronizarTipoDeficiencia(valor: unknown): string {
  const original = limparTexto(valor);
  const texto = semAcento(original);
  if (!texto) return NAO_INFORMADO;
  if (texto.includes('fisic')) return 'Física';
  if (texto.includes('intelect')) return 'Intelectual';
  if (texto.includes('visual')) return 'Visual';
  if (texto.includes('audit')) return 'Auditiva';
  if (texto.includes('psicossocial') || texto.includes('mental')) return 'Psicossocial';
  if (texto.includes('multip')) return 'Múltipla';
  if (texto.includes('autis') || texto === 'tea') return 'Transtorno do Espectro Autista';
  return original;
}

export function padronizarSexo(valor: unknown): Sexo {
  const texto = semAcento(limparTexto(valor));
  if (texto.startsWith('f')) return 'Feminino';
  if (texto.startsWith('m')) return 'Masculino';
  return NAO_INFORMADO;
}

export function calcularFaixaEtaria(idade: number): string {
  if (idade <= 12) return '0 a 12 anos';
  if (idade <= 17) return '13 a 17 anos';
  if (idade <= 29) return '18 a 29 anos';
  if (idade <= 59) return '30 a 59 anos';
  return '60+';
}
