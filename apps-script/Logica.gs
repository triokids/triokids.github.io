// Lógica pura da Área Adm e do envio de fotos (sem APIs do Google nem do Node).
// Funções globais, compatíveis com Apps Script V8.

var MAX_ARQUIVOS = 8;
var MAX_BASE64 = 2000000;
var MAX_ERROS_SENHA = 5;

function caminhoFoto(codigo, n) {
  return 'fotos/' + codigo + '-' + n + '.jpg';
}

// acrescentar: cria atual+1.. ; trocar: cria 1..quantidade e apaga quantidade+1..atual.
function proximosNomesFotos(codigo, fotosAtuais, quantidade, trocar) {
  var criar = [];
  var apagar = [];
  var inicio = trocar ? 0 : fotosAtuais;
  for (var i = 1; i <= quantidade; i++) criar.push(caminhoFoto(codigo, inicio + i));
  if (trocar) {
    for (var n = quantidade + 1; n <= fotosAtuais; n++) apagar.push(caminhoFoto(codigo, n));
  }
  return { criar: criar, apagar: apagar };
}

function validarEnvio(e) {
  if (e.bloqueado) return { ok: false, erro: 'bloqueado' };
  if (!e.autorizado) return { ok: false, erro: 'senha' };
  if ((e.codigosValidos || []).indexOf(e.codigo) === -1) return { ok: false, erro: 'codigo' };
  var arquivos = e.arquivos || [];
  if (arquivos.length === 0) return { ok: false, erro: 'sem-arquivo' };
  if (arquivos.length > MAX_ARQUIVOS) return { ok: false, erro: 'muitos' };
  for (var i = 0; i < arquivos.length; i++) {
    if (String(arquivos[i].tipo || '').indexOf('image/jpeg') !== 0) return { ok: false, erro: 'tipo' };
  }
  for (var j = 0; j < arquivos.length; j++) {
    if (String(arquivos[j].base64 || '').length > MAX_BASE64) return { ok: false, erro: 'grande' };
  }
  return { ok: true };
}

function registrarErroSenha(contagemAnterior) {
  var contagem = contagemAnterior + 1;
  return { contagem: contagem, bloqueado: contagem >= MAX_ERROS_SENHA };
}

// Maior N entre fotos/<codigo>-N.jpg (N inteiro positivo, só dígitos).
function contarFotosNaArvore(caminhos, codigo) {
  var prefixo = 'fotos/' + codigo + '-';
  var maior = 0;
  for (var i = 0; i < caminhos.length; i++) {
    var c = caminhos[i];
    if (c.indexOf(prefixo) !== 0) continue;
    var m = /^([0-9]+)\.jpg$/.exec(c.slice(prefixo.length));
    if (!m) continue;
    var n = parseInt(m[1], 10);
    if (n > maior) maior = n;
  }
  return maior;
}

function tabelasParaReserva(pecas, config, campanha, agoraIso) {
  return JSON.stringify({ geradoEm: agoraIso, pecas: pecas, config: config, campanha: campanha }, null, 2);
}

function mesmoConteudoReserva(jsonA, jsonB) {
  var a = JSON.parse(jsonA);
  var b = JSON.parse(jsonB);
  delete a.geradoEm;
  delete b.geradoEm;
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---- Área Adm ----

var TAMANHOS_PLANILHA = ['P', 'M', 'G', '1', '2', '3', '4', '6'];
var VALIDADE_PASSE_MS = 28800000;

function slug(texto) {
  var s = String(texto === undefined || texto === null ? '' : texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s.slice(0, 60).replace(/-+$/, '');
}

function gerarCodigo(nome, cor, existentes) {
  var base = slug(String(nome || '') + ' ' + String(cor || '')) || 'peca';
  var lista = existentes || [];
  if (lista.indexOf(base) === -1) return base;
  for (var n = 2; ; n++) {
    var sufixo = '-' + n;
    var cand = base.slice(0, 60 - sufixo.length).replace(/-+$/, '') + sufixo;
    if (lista.indexOf(cand) === -1) return cand;
  }
}

// Texto que vai para a planilha: sem espaços nas pontas e sem virar fórmula.
function textoSeguro(valor) {
  var t = String(valor === undefined || valor === null ? '' : valor).trim();
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

// Preço digitado: 139,90 / 139.90 / R$ 139,90 / 1.234,56. Devolve número > 0 ou null.
function lerPreco(texto) {
  if (texto === undefined || texto === null) return null;
  var t = String(texto).replace(/R\$/gi, '').replace(/\s+/g, '');
  var normal;
  if (/^\d{1,5}([.,]\d{1,2})?$/.test(t)) {
    normal = t.replace(',', '.');
  } else if (/^\d{1,2}(\.\d{3})+(,\d{1,2})?$/.test(t)) {
    normal = t.replace(/\./g, '').replace(',', '.');
  } else {
    return null;
  }
  var n = parseFloat(normal);
  return n > 0 && n <= 99999.99 ? n : null;
}

function sim_(valor) {
  return valor === true || valor === 'sim' ? 'sim' : 'nao';
}

// Campo undefined não entra em valores (salvar só grava o que veio).
function validarCamposPeca(campos, nova) {
  var c = campos || {};
  var v = {};
  function longo(chave, texto, max) {
    return texto.length > max ? { ok: false, mensagem: 'Texto grande demais em ' + chave + '.' } : null;
  }
  var erro;
  if (nova) {
    var nome = textoSeguro(c.nome);
    if (!nome) return { ok: false, mensagem: 'Escreva o nome da peça.' };
    if ((erro = longo('nome', nome, 80))) return erro;
    v.nome = nome;
    if (c.cor !== undefined) {
      var cor = textoSeguro(c.cor);
      if ((erro = longo('cor', cor, 60))) return erro;
      v.cor = cor;
    }
  }
  if (nova || c.categoria !== undefined) {
    var categoria = textoSeguro(c.categoria);
    if (!categoria) return { ok: false, mensagem: 'Escolha ou escreva a categoria.' };
    if ((erro = longo('categoria', categoria, 60))) return erro;
    v.categoria = categoria;
  }
  if (nova || c.preco !== undefined) {
    var preco = lerPreco(c.preco);
    if (preco === null) return { ok: false, mensagem: 'Preço inválido. Use só números, ex.: 139,90.' };
    v.preco = preco;
  }
  var est = c.estoque || {};
  for (var i = 0; i < TAMANHOS_PLANILHA.length; i++) {
    var tam = TAMANHOS_PLANILHA[i];
    var bruto = est[tam];
    if (bruto === undefined) continue;
    var txt = bruto === null ? '' : String(bruto).trim();
    if (txt === '') {
      v[tam.toLowerCase()] = '';
    } else if (/^\d{1,3}$/.test(txt)) {
      v[tam.toLowerCase()] = parseInt(txt, 10);
    } else {
      return { ok: false, mensagem: 'Estoque do tamanho ' + tam + ' precisa ser um número de 0 a 999.' };
    }
  }
  var limites = { colecao: 60, descricao: 1000 };
  for (var chave in limites) {
    if (c[chave] === undefined) continue;
    var texto = textoSeguro(c[chave]);
    if ((erro = longo(chave, texto, limites[chave]))) return erro;
    v[chave] = texto;
  }
  var flags = ['ativo', 'destaque', 'campanha'];
  for (var f = 0; f < flags.length; f++) {
    if (c[flags[f]] !== undefined) v[flags[f]] = sim_(c[flags[f]]);
  }
  return { ok: true, valores: v };
}

// Linha na ordem do cabeçalho; coluna sem valor fica vazia (0 continua 0).
function linhaNovaPeca(cabecalhoNormalizado, valores) {
  var linha = [];
  for (var i = 0; i < cabecalhoNormalizado.length; i++) {
    var k = cabecalhoNormalizado[i];
    var tem = Object.prototype.hasOwnProperty.call(valores, k) && valores[k] !== undefined && valores[k] !== null;
    linha.push(tem ? valores[k] : '');
  }
  return linha;
}

function boolCelula_(texto, padrao) {
  var t = String(texto === undefined || texto === null ? '' : texto).trim().toLowerCase();
  if (t === 'sim' || t === 's' || t === 'true' || t === 'x') return true;
  if (t === 'nao' || t === 'não' || t === 'n' || t === 'false') return false;
  return padrao;
}

function pecasParaArea(tabela) {
  var saida = [];
  if (!tabela || tabela.length === 0) return saida;
  var cab = [];
  for (var i = 0; i < tabela[0].length; i++) {
    cab.push(String(tabela[0][i]).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase());
  }
  for (var r = 1; r < tabela.length; r++) {
    var linha = tabela[r];
    var cel = function (nome) {
      var c = cab.indexOf(nome);
      return c === -1 || linha[c] === undefined || linha[c] === null ? '' : String(linha[c]).trim();
    };
    var codigo = cel('codigo');
    if (!codigo) continue;
    var fotos = /^\d+$/.test(cel('fotos')) ? parseInt(cel('fotos'), 10) : 0;
    var estoque = {};
    for (var t = 0; t < TAMANHOS_PLANILHA.length; t++) {
      var q = cel(TAMANHOS_PLANILHA[t].toLowerCase());
      estoque[TAMANHOS_PLANILHA[t]] = /^\d+$/.test(q) ? parseInt(q, 10) : '';
    }
    saida.push({
      codigo: codigo, nome: cel('nome'), cor: cel('cor'), categoria: cel('categoria'),
      colecao: cel('colecao'), descricao: cel('descricao'), preco: lerPreco(cel('preco')),
      ativo: boolCelula_(cel('ativo'), true), destaque: boolCelula_(cel('destaque'), false),
      campanha: boolCelula_(cel('campanha'), true), fotos: fotos, estoque: estoque,
    });
  }
  return saida;
}

function criarPasse(agoraMs, assinar) {
  var validade = String(agoraMs + VALIDADE_PASSE_MS);
  return validade + '.' + assinar(validade);
}

function passeValido(passe, agoraMs, assinar) {
  var m = /^(\d+)\.(.+)$/.exec(String(passe || ''));
  if (!m) return false;
  if (parseInt(m[1], 10) <= agoraMs) return false;
  var certa = String(assinar(m[1]));
  var dada = m[2];
  var diferente = certa.length !== dada.length ? 1 : 0;
  for (var i = 0; i < certa.length; i++) {
    diferente |= certa.charCodeAt(i) ^ (dada.charCodeAt(i) || 0);
  }
  return diferente === 0;
}

// Apaga a foto n (1..total): as seguintes sobem um número e a última some.
function planoApagarFoto(codigo, total, n) {
  if (!(n >= 1 && n <= total)) return null;
  var mover = [];
  for (var i = n + 1; i <= total; i++) mover.push({ de: caminhoFoto(codigo, i), para: caminhoFoto(codigo, i - 1) });
  return { mover: mover, apagar: caminhoFoto(codigo, total) };
}
