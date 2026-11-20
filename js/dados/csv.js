// Parser de CSV (RFC 4180) por estados de caractere, e utilitários de preço.

export function parseCsv(texto) {
  let s = String(texto ?? '');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  let temConteudo = false;

  const fecharCampo = () => { linha.push(campo); campo = ''; };
  const fecharLinha = () => {
    fecharCampo();
    linhas.push(linha);
    linha = [];
    temConteudo = false;
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (aspas) {
      if (c === '"') {
        if (s[i + 1] === '"') { campo += '"'; i++; } else aspas = false;
      } else campo += c;
    } else if (c === '"') {
      aspas = true;
      temConteudo = true;
    } else if (c === ',') {
      fecharCampo();
      temConteudo = true;
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      fecharLinha();
    } else {
      campo += c;
      temConteudo = true;
    }
  }
  if (temConteudo || campo !== '' || linha.length) fecharLinha();
  return linhas;
}

export function parsePreco(valor) {
  let s = String(valor ?? '').replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatarPreco(n) {
  const [int, dec] = Number(n).toFixed(2).split('.');
  return `R$ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
}
