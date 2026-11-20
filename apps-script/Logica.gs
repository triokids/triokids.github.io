// Lógica pura do formulário de fotos (sem APIs do Google nem do Node).
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
  var certa = e.senhaCerta;
  if (certa === undefined || certa === null || certa === '' || e.senhaInformada !== certa) {
    return { ok: false, erro: 'senha' };
  }
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
