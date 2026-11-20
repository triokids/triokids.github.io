// Dublês dos serviços do Google para testar Codigo.gs no Node (só para teste).
import crypto from 'node:crypto';
import vm from 'node:vm';
import fs from 'node:fs';

function criarAba(linhas) {
  const dados = linhas.map((l) => [...l]);
  const aba = {
    dados,
    getDataRange: () => ({
      getDisplayValues: () => dados.map((l) => l.map((v) => String(v ?? ''))),
      getValues: () => dados.map((l) => [...l]),
    }),
    getRange(linha, coluna, nLinhas, nColunas) {
      return {
        getValue: () => (dados[linha - 1] || [])[coluna - 1] ?? '',
        setValue(v) {
          while (dados.length < linha) dados.push([]);
          dados[linha - 1][coluna - 1] = v;
        },
        setValues(m) {
          for (let i = 0; i < (nLinhas || 1); i++) {
            for (let j = 0; j < (nColunas || 1); j++) {
              while (dados.length < linha + i) dados.push([]);
              dados[linha - 1 + i][coluna - 1 + j] = m[i][j];
            }
          }
        },
      };
    },
    appendRow(linha) { dados.push([...linha]); },
  };
  return aba;
}

export function criarAmbiente({ props, abaPecas, abaConfig, abaCampanha, github } = {}) {
  const abas = {
    'Peças': criarAba(abaPecas || []),
    Config: criarAba(abaConfig || [['chave', 'valor']]),
    Campanha: criarAba(abaCampanha || [['texto']]),
  };
  const cacheMapa = new Map();
  const propriedades = { ...props };
  const emails = [];
  const chamadas = [];
  const travas = { ativas: 0, total: 0, aninhada: false };
  const respostas = github || (() => ({ codigo: 404, texto: '' }));

  const ambiente = {
    console,
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...propriedades }) }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cacheMapa.has(k) ? cacheMapa.get(k) : null),
        put: (k, v) => { cacheMapa.set(k, v); },
        remove: (k) => { cacheMapa.delete(k); },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock() {
          if (travas.ativas > 0) travas.aninhada = true;
          travas.ativas++; travas.total++;
        },
        releaseLock() { travas.ativas--; },
      }),
    },
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: (n) => abas[n] || null }),
      flush() {},
    },
    Utilities: {
      computeHmacSha256Signature: (texto, chave) =>
        [...crypto.createHmac('sha256', String(chave)).update(String(texto)).digest()].map((b) => (b > 127 ? b - 256 : b)),
      base64Decode: (s) => [...Buffer.from(s, 'base64')].map((b) => (b > 127 ? b - 256 : b)),
      base64Encode: (s) => Buffer.from(s).toString('base64'),
      newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes.map((b) => (b + 256) % 256)).toString('utf8') }),
      Charset: { UTF_8: 'UTF-8' },
    },
    MailApp: { sendEmail: (para, assunto, texto) => { emails.push({ para, assunto, texto }); } },
    UrlFetchApp: {
      fetch(url, opcoes) {
        const chamada = { url, metodo: opcoes.method, corpo: opcoes.payload ? JSON.parse(opcoes.payload) : undefined };
        chamadas.push(chamada);
        const r = respostas(chamada);
        return { getResponseCode: () => r.codigo, getContentText: () => (r.texto ?? (r.json === undefined ? '' : JSON.stringify(r.json))) };
      },
    },
    HtmlService: {
      createTemplateFromFile(nome) {
        const modelo = {
          nome,
          evaluate() {
            const pagina = { modelo, titulo: '', setTitle(t) { pagina.titulo = t; return pagina; }, addMetaTag() { return pagina; } };
            return pagina;
          },
        };
        return modelo;
      },
    },
  };
  const ctx = vm.createContext(ambiente);
  for (const arq of ['Logica.gs', 'Codigo.gs']) {
    vm.runInContext(fs.readFileSync(new URL(`../apps-script/${arq}`, import.meta.url), 'utf8'), ctx);
  }
  return { ctx, abas, pecas: abas['Peças'].dados, emails, chamadas, travas, cache: cacheMapa };
}
