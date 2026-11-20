// Formulário de fotos da Trio Kids: planilha, GitHub e catalogo.json de reserva.
// Usa as funções de Logica.gs (mesmo projeto Apps Script, escopo global).
// Segredos ficam só nas Script Properties (Configurações do projeto), nunca neste arquivo.

var PROPRIEDADES_OBRIGATORIAS = [
  'SENHA_FORMULARIO', 'GITHUB_TOKEN', 'GITHUB_DONO', 'GITHUB_REPO', 'PLANILHA_ID', 'EMAIL_DONO'
];
var CHAVE_ERROS_SENHA = 'erros_senha';
var MENSAGEM_FALHA = 'Não consegui enviar. Avise o dono.';
var MENSAGENS_VALIDACAO = {
  bloqueado: 'Muitas tentativas com senha errada. Tente de novo daqui a 1 hora.',
  senha: 'Senha incorreta.',
  codigo: 'Não achei essa peça. Escolha outra na lista.',
  'sem-arquivo': 'Escolha pelo menos uma foto.',
  muitos: 'No máximo ' + MAX_ARQUIVOS + ' fotos por envio.',
  tipo: 'Só fotos são aceitas.',
  grande: 'Uma das fotos ficou grande demais. Tente outra.'
};

// ---------- Configuração ----------

function lerPropriedades_() {
  return PropertiesService.getScriptProperties().getProperties();
}

function propriedadesFaltando_(props) {
  return PROPRIEDADES_OBRIGATORIAS.filter(function (nome) {
    return !props[nome];
  });
}

function mensagemFaltando_(faltando) {
  return 'Falta configurar: ' + faltando.join(', ') + '. Nada foi enviado.';
}

function branch_(props) {
  return props.GITHUB_BRANCH || 'main';
}

function urlSite_(props) {
  if (props.URL_SITE) return props.URL_SITE.replace(/\/?$/, '/');
  return props.GITHUB_DONO ? 'https://' + props.GITHUB_DONO + '.github.io/' : '';
}

// ---------- Página ----------

function doGet() {
  var props = lerPropriedades_();
  var modelo = HtmlService.createTemplateFromFile('Formulario');
  modelo.urlLogo = urlSite_(props) + 'img/logo.png';
  modelo.faltando = propriedadesFaltando_(props).length ? mensagemFaltando_(propriedadesFaltando_(props)) : '';
  return modelo.evaluate()
    .setTitle('Fotos - Trio Kids')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ---------- Planilha ----------

function normalizar_(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function abrirPlanilha_(props) {
  return SpreadsheetApp.openById(props.PLANILHA_ID);
}

function lerAba_(planilha, nome) {
  var aba = planilha.getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  return aba.getDataRange().getDisplayValues();
}

function indiceColuna_(cabecalho, nome) {
  for (var i = 0; i < cabecalho.length; i++) {
    if (normalizar_(cabecalho[i]) === nome) return i;
  }
  return -1;
}

function lerPecas_(props) {
  var tabela = lerAba_(abrirPlanilha_(props), 'Peças');
  var iCodigo = indiceColuna_(tabela[0] || [], 'codigo');
  if (iCodigo === -1) throw new Error('Coluna codigo não encontrada na aba Peças');
  return { tabela: tabela, iCodigo: iCodigo };
}

function listarPecas() {
  var props = lerPropriedades_();
  if (!props.PLANILHA_ID) throw new Error(mensagemFaltando_(['PLANILHA_ID']));
  var dados = lerPecas_(props);
  var iNome = indiceColuna_(dados.tabela[0], 'nome');
  var iCor = indiceColuna_(dados.tabela[0], 'cor');
  var lista = [];
  for (var i = 1; i < dados.tabela.length; i++) {
    var codigo = String(dados.tabela[i][dados.iCodigo]).trim();
    if (!codigo) continue;
    var nome = iNome === -1 ? '' : String(dados.tabela[i][iNome]).trim();
    var cor = iCor === -1 ? '' : String(dados.tabela[i][iCor]).trim();
    lista.push({ codigo: codigo, rotulo: [nome, cor].filter(Boolean).join(' - ') || codigo });
  }
  return lista;
}

// Grava o total de fotos na linha do código; devolve o valor anterior para desfazer.
function gravarTotalFotos_(props, codigo, total) {
  var planilha = abrirPlanilha_(props);
  var aba = planilha.getSheetByName('Peças');
  if (!aba) throw new Error('Aba não encontrada: Peças');
  var tabela = aba.getDataRange().getDisplayValues();
  var iCodigo = indiceColuna_(tabela[0], 'codigo');
  var iFotos = indiceColuna_(tabela[0], 'fotos');
  if (iCodigo === -1 || iFotos === -1) throw new Error('Colunas codigo/fotos não encontradas na aba Peças');
  for (var i = 1; i < tabela.length; i++) {
    if (String(tabela[i][iCodigo]).trim() === codigo) {
      var celula = aba.getRange(i + 1, iFotos + 1);
      var anterior = celula.getValue();
      celula.setValue(total);
      SpreadsheetApp.flush();
      return { aba: aba, linha: i + 1, coluna: iFotos + 1, anterior: anterior };
    }
  }
  throw new Error('Código não encontrado na planilha: ' + codigo);
}

function desfazerTotalFotos_(registro) {
  registro.aba.getRange(registro.linha, registro.coluna).setValue(registro.anterior);
  SpreadsheetApp.flush();
}

function jsonReserva_(props) {
  var planilha = abrirPlanilha_(props);
  return tabelasParaReserva(
    lerAba_(planilha, 'Peças'),
    lerAba_(planilha, 'Config'),
    lerAba_(planilha, 'Campanha'),
    new Date().toISOString()
  );
}

// ---------- GitHub ----------

function github_(props, metodo, caminho, corpo) {
  var url = 'https://api.github.com/repos/' + props.GITHUB_DONO + '/' + props.GITHUB_REPO + '/' + caminho;
  var opcoes = {
    method: metodo,
    headers: {
      Authorization: 'Bearer ' + props.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json'
    },
    muteHttpExceptions: true
  };
  if (corpo !== undefined) {
    opcoes.contentType = 'application/json';
    opcoes.payload = JSON.stringify(corpo);
  }
  var resposta = UrlFetchApp.fetch(url, opcoes);
  var codigo = resposta.getResponseCode();
  var texto = resposta.getContentText();
  if (codigo === 404 && metodo === 'GET') return { naoExiste: true };
  if (codigo < 200 || codigo >= 300) {
    // Nunca inclui o token na mensagem.
    throw new Error('GitHub ' + metodo + ' ' + caminho + ' respondeu ' + codigo + ': ' + texto.slice(0, 300));
  }
  return texto ? JSON.parse(texto) : {};
}

function caminhosDaArvore_(props, shaArvore) {
  var arvore = github_(props, 'GET', 'git/trees/' + shaArvore + '?recursive=1');
  if (arvore.naoExiste) throw new Error('Árvore do repositório não encontrada');
  if (arvore.truncated) throw new Error('Árvore do repositório grande demais para listar');
  return arvore.tree.map(function (item) { return item.path; });
}

// ---------- Envio de fotos ----------

function mensagemErroSenha_(codigoErro) {
  return MENSAGENS_VALIDACAO[codigoErro] || 'Envio recusado.';
}

function enviarFotos(dados) {
  var props = lerPropriedades_();
  var faltando = propriedadesFaltando_(props);
  if (faltando.length) return { ok: false, mensagem: mensagemFaltando_(faltando) };

  var cache = CacheService.getScriptCache();
  var erros = Number(cache.get(CHAVE_ERROS_SENHA)) || 0;
  dados = dados || {};

  try {
    var codigos = lerPecas_(props);
    var codigosValidos = [];
    for (var i = 1; i < codigos.tabela.length; i++) {
      var c = String(codigos.tabela[i][codigos.iCodigo]).trim();
      if (c) codigosValidos.push(c);
    }
    var codigo = String(dados.codigo || '');
    var arquivos = dados.arquivos || [];
    var validacao = validarEnvio({
      bloqueado: erros >= MAX_ERROS_SENHA,
      senhaInformada: dados.senha,
      senhaCerta: props.SENHA_FORMULARIO,
      codigo: codigo,
      codigosValidos: codigosValidos,
      arquivos: arquivos
    });
    if (!validacao.ok) {
      if (validacao.erro === 'senha') {
        var registro = registrarErroSenha(erros);
        cache.put(CHAVE_ERROS_SENHA, String(registro.contagem), 3600);
        if (registro.bloqueado) return { ok: false, mensagem: mensagemErroSenha_('bloqueado') };
      }
      return { ok: false, mensagem: mensagemErroSenha_(validacao.erro) };
    }
    cache.remove(CHAVE_ERROS_SENHA);
    return enviarComTrava_(props, codigo, !!dados.trocar, arquivos);
  } catch (erro) {
    avisarDono_(props, 'enviarFotos', erro);
    return { ok: false, mensagem: MENSAGEM_FALHA };
  }
}

function enviarComTrava_(props, codigo, trocar, arquivos) {
  var trava = LockService.getScriptLock();
  trava.waitLock(30000);
  var gravado = null;
  try {
    var ramo = branch_(props);
    var ref = github_(props, 'GET', 'git/ref/heads/' + ramo);
    var shaBase = ref.object.sha;
    var commitBase = github_(props, 'GET', 'git/commits/' + shaBase);
    var caminhos = caminhosDaArvore_(props, commitBase.tree.sha);
    var fotosAtuais = contarFotosNaArvore(caminhos, codigo);
    var nomes = proximosNomesFotos(codigo, fotosAtuais, arquivos.length, trocar);

    var entradas = [];
    for (var i = 0; i < nomes.criar.length; i++) {
      var base64 = String(arquivos[i].base64).replace(/^data:[^,]*,/, '');
      var blob = github_(props, 'POST', 'git/blobs', { content: base64, encoding: 'base64' });
      entradas.push({ path: nomes.criar[i], mode: '100644', type: 'blob', sha: blob.sha });
    }
    nomes.apagar.forEach(function (caminho) {
      if (caminhos.indexOf(caminho) !== -1) {
        entradas.push({ path: caminho, mode: '100644', type: 'blob', sha: null });
      }
    });

    var total = trocar ? arquivos.length : fotosAtuais + arquivos.length;
    gravado = gravarTotalFotos_(props, codigo, total);
    entradas.push({ path: 'catalogo.json', mode: '100644', type: 'blob', content: jsonReserva_(props) });

    var arvore = github_(props, 'POST', 'git/trees', { base_tree: commitBase.tree.sha, tree: entradas });
    var commit = github_(props, 'POST', 'git/commits', {
      message: 'Fotos: ' + codigo,
      tree: arvore.sha,
      parents: [shaBase]
    });
    github_(props, 'PATCH', 'git/refs/heads/' + ramo, { sha: commit.sha });
    gravado = null;
    return { ok: true, mensagem: 'Enviado! Aparece no site em alguns minutos.' };
  } catch (erro) {
    if (gravado) {
      try { desfazerTotalFotos_(gravado); } catch (ignorado) { /* o e-mail ao dono já avisa */ }
    }
    throw erro;
  } finally {
    trava.releaseLock();
  }
}

// ---------- Reserva diária ----------

function gerarReserva() {
  var props = lerPropriedades_();
  var faltando = propriedadesFaltando_(props);
  if (faltando.length) {
    avisarDono_(props, 'gerarReserva', new Error(mensagemFaltando_(faltando)));
    return { ok: false, mensagem: MENSAGEM_FALHA };
  }
  try {
    var trava = LockService.getScriptLock();
    trava.waitLock(30000);
    try {
      var novo = jsonReserva_(props);
      var caminho = 'contents/catalogo.json?ref=' + encodeURIComponent(branch_(props));
      var atual = github_(props, 'GET', caminho);
      var sha = null;
      if (!atual.naoExiste) {
        sha = atual.sha;
        var textoAtual = Utilities.newBlob(Utilities.base64Decode(String(atual.content).replace(/\s/g, ''))).getDataAsString('UTF-8');
        if (mesmoConteudoReserva(textoAtual, novo)) {
          return { ok: true, mensagem: 'catalogo.json já está atualizado.' };
        }
      }
      var corpo = {
        message: 'Reserva diária do catálogo',
        content: Utilities.base64Encode(novo, Utilities.Charset.UTF_8),
        branch: branch_(props)
      };
      if (sha) corpo.sha = sha;
      github_(props, 'PUT', 'contents/catalogo.json', corpo);
      return { ok: true, mensagem: 'catalogo.json atualizado.' };
    } finally {
      trava.releaseLock();
    }
  } catch (erro) {
    avisarDono_(props, 'gerarReserva', erro);
    return { ok: false, mensagem: MENSAGEM_FALHA };
  }
}

function instalarGatilhoDiario() {
  ScriptApp.getProjectTriggers().forEach(function (g) {
    if (g.getHandlerFunction() === 'gerarReserva') ScriptApp.deleteTrigger(g);
  });
  ScriptApp.newTrigger('gerarReserva').timeBased().everyDays(1).atHour(6).create();
}

// ---------- Aviso ao dono ----------

function avisarDono_(props, origem, erro) {
  try {
    if (!props.EMAIL_DONO) return;
    var texto = String((erro && erro.message) || erro);
    if (props.GITHUB_TOKEN) texto = texto.split(props.GITHUB_TOKEN).join('***');
    MailApp.sendEmail(props.EMAIL_DONO, 'Trio Kids: erro em ' + origem, texto);
  } catch (ignorado) {
    // Sem como avisar; o erro fica no registro de execuções.
  }
}
