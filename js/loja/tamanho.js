// Calculadora de tamanho: quem decide é a estatura. Puro, sem DOM.

// Estatura máxima (cm) de cada tamanho, igual à tabela de tamanhos.html.
// O tamanho 3 usa a mesma medida do 4, por isso os dois ficam numa linha só.
export const GRADE = [
  { tamanho: 'P', idade: '2 a 4 meses', ate: 62 },
  { tamanho: 'M', idade: '3 a 6 meses', ate: 68 },
  { tamanho: 'G', idade: '6 a 9 meses', ate: 73 },
  { tamanho: '01', idade: '9 a 12 meses', ate: 80 },
  { tamanho: '02', idade: '12 a 24 meses', ate: 90 },
  { tamanho: '03/04', idade: '3 a 4 anos', ate: 103 },
  { tamanho: '06', idade: '5 a 6 anos', ate: 116 },
];

// Opções de idade e o tamanho que a idade sugeriria (só para comparar).
export const IDADES = [
  { valor: '0-2m', rotulo: '0 a 2 meses', tamanho: 'P' },
  { valor: '2-4m', rotulo: '2 a 4 meses', tamanho: 'P' },
  { valor: '4-6m', rotulo: '4 a 6 meses', tamanho: 'M' },
  { valor: '6-9m', rotulo: '6 a 9 meses', tamanho: 'G' },
  { valor: '9-12m', rotulo: '9 a 12 meses', tamanho: '01' },
  { valor: '1a', rotulo: '1 ano', tamanho: '02' },
  { valor: '2a', rotulo: '2 anos', tamanho: '02' },
  { valor: '3a', rotulo: '3 anos', tamanho: '03/04' },
  { valor: '4a', rotulo: '4 anos', tamanho: '03/04' },
  { valor: '5a', rotulo: '5 anos', tamanho: '06' },
  { valor: '6a', rotulo: '6 anos', tamanho: '06' },
  { valor: '7a+', rotulo: '7 anos ou mais', tamanho: '06+' },
];

export const ESTATURA_MIN = 40;
export const ESTATURA_MAX = 150;
// Folga (cm) a partir da qual não sugerimos o próximo tamanho.
const PERTO_DO_LIMITE = 2;

function lerEstatura(valor) {
  if (typeof valor === 'number') return valor;
  const t = String(valor ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

export function recomendarTamanho({ estatura, idade } = {}) {
  const cm = lerEstatura(estatura);
  if (!Number.isFinite(cm) || cm < ESTATURA_MIN || cm > ESTATURA_MAX) {
    return { tipo: 'erro', mensagem: `Informe a estatura da criança em centímetros, entre ${ESTATURA_MIN} e ${ESTATURA_MAX} (ex.: 74).` };
  }
  const i = GRADE.findIndex((g) => cm <= g.ate);
  if (i === -1) {
    const ultimo = GRADE[GRADE.length - 1];
    return { tipo: 'acima', estatura: cm, tamanho: `${ultimo.tamanho}+`, ate: ultimo.ate };
  }
  const g = GRADE[i];
  const folga = Math.round((g.ate - cm) * 10) / 10;
  const r = { tipo: 'ok', estatura: cm, tamanho: g.tamanho, idadeReferencia: g.idade, ate: g.ate, folga };
  if (folga <= PERTO_DO_LIMITE && GRADE[i + 1]) r.proximo = GRADE[i + 1].tamanho;
  const pelaIdade = IDADES.find((o) => o.valor === idade)?.tamanho;
  if (pelaIdade && pelaIdade !== g.tamanho) r.pelaIdade = pelaIdade;
  return r;
}

// "01" na tabela é "1" no filtro do catálogo; "03/04" vira ["3", "4"].
export function tamanhosNoCatalogo(tamanho) {
  return String(tamanho).split('/').map((t) => t.replace(/^0+(?=\d)/, ''));
}
