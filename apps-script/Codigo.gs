// Área da loja da Trio Kids (peças e fotos): planilha, GitHub e catalogo.json de reserva.
// Usa as funções de Logica.gs (mesmo projeto Apps Script, escopo global).
// Segredos ficam só nas Script Properties (Configurações do projeto), nunca neste arquivo.

var PROPRIEDADES_OBRIGATORIAS = [
  'SENHA_FORMULARIO', 'GITHUB_TOKEN', 'GITHUB_DONO', 'GITHUB_REPO', 'PLANILHA_ID', 'EMAIL_DONO'
];
var CHAVE_ERROS_SENHA = 'erros_senha';
var MENSAGEM_FALHA = 'Não consegui enviar. Avise o dono.';
var MENSAGEM_SAIR = 'Sua entrada venceu. Digite a senha de novo.';
var MENSAGEM_PECA_SUMIU = 'Não achei essa peça. Atualize a lista.';
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
  var modelo = HtmlService.createTemplateFromFile('Area');
  modelo.urlLogo = urlSite_(props) + 'img/logo.png';
  modelo.urlSite = urlSite_(props);
  modelo.faltando = propriedadesFaltando_(props).length ? mensagemFaltando_(propriedadesFaltando_(props)) : '';
  return modelo.evaluate()
    .setTitle('Trio Kids - Área Adm')
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
  return arvore.tree
    .filter(function (item) { return item.type === 'blob'; })
    .map(function (item) { return { path: item.path, sha: item.sha }; });
}

// ---------- Envio de fotos ----------

function mensagemErroSenha_(codigoErro) {
  return MENSAGENS_VALIDACAO[codigoErro] || 'Envio recusado.';
}

function enviarFotos(dados) {
  dados = dados || {};
  return comPasse_('enviarFotos', dados.passe, function (props) {
    var codigos = lerPecas_(props);
    var codigosValidos = [];
    for (var i = 1; i < codigos.tabela.length; i++) {
      var c = String(codigos.tabela[i][codigos.iCodigo]).trim();
      if (c) codigosValidos.push(c);
    }
    var codigo = String(dados.codigo || '');
    var arquivos = dados.arquivos || [];
    var validacao = validarEnvio({
      bloqueado: false,
      autorizado: true,
      codigo: codigo,
      codigosValidos: codigosValidos,
      arquivos: arquivos
    });
    if (!validacao.ok) return { ok: false, mensagem: mensagemErroSenha_(validacao.erro) };
    var total = enviarComTrava_(props, codigo, !!dados.trocar, arquivos);
    return { ok: true, mensagem: 'Enviado! Aparece no site em alguns minutos.', fotos: total };
  });
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
    var caminhos = caminhosDaArvore_(props, commitBase.tree.sha).map(function (item) { return item.path; });
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
    return total;
  } catch (erro) {
    if (gravado) {
      try { desfazerTotalFotos_(gravado); } catch (ignorado) { /* o e-mail ao dono já avisa */ }
    }
    throw erro;
  } finally {
    trava.releaseLock();
  }
}

// ---------- Área Adm: entrada e passe ----------

function assinar_(props) {
  return function (texto) {
    var bytes = Utilities.computeHmacSha256Signature(texto, props.SENHA_FORMULARIO);
    return bytes.map(function (b) {
      var h = ((b + 256) % 256).toString(16);
      return h.length < 2 ? '0' + h : h;
    }).join('');
  };
}

function passeAceito_(props, passe) {
  return passeValido(passe, Date.now(), assinar_(props));
}

function respostaSair_() {
  return { ok: false, sair: true, mensagem: MENSAGEM_SAIR };
}

function entrar(senha) {
  return protegido_('entrar', function (props) {
    var cache = CacheService.getScriptCache();
    var erros = Number(cache.get(CHAVE_ERROS_SENHA)) || 0;
    if (erros >= MAX_ERROS_SENHA) return { ok: false, mensagem: mensagemErroSenha_('bloqueado') };
    var certa = typeof senha === 'string' && senha !== '' && senha === props.SENHA_FORMULARIO;
    if (!certa) {
      var registro = registrarErroSenha(erros);
      cache.put(CHAVE_ERROS_SENHA, String(registro.contagem), 3600);
      return { ok: false, mensagem: mensagemErroSenha_(registro.bloqueado ? 'bloqueado' : 'senha') };
    }
    cache.remove(CHAVE_ERROS_SENHA);
    return { ok: true, passe: criarPasse(Date.now(), assinar_(props)) };
  });
}

// Lê e confere a configuração e roda a ação; qualquer erro inesperado vira
// aviso ao dono e mensagem simples. Nunca lança para a página.
function protegido_(origem, acao) {
  var props = {};
  try {
    props = lerPropriedades_();
    var faltando = propriedadesFaltando_(props);
    if (faltando.length) return { ok: false, mensagem: mensagemFaltando_(faltando) };
    return acao(props);
  } catch (erro) {
    avisarDono_(props, origem, erro);
    return { ok: false, mensagem: MENSAGEM_FALHA };
  }
}

// Como protegido_, e exige passe válido.
function comPasse_(origem, passe, acao) {
  return protegido_(origem, function (props) {
    if (!passeAceito_(props, passe)) return respostaSair_();
    return acao(props);
  });
}

function distintosOrdenados_(valores) {
  var vistos = {};
  var lista = [];
  valores.forEach(function (v) {
    if (v && !vistos[v]) { vistos[v] = true; lista.push(v); }
  });
  return lista.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
}

function listarPecasArea(passe) {
  return comPasse_('listarPecasArea', passe, function (props) {
    var pecas = pecasParaArea(lerPecas_(props).tabela);
    return {
      ok: true,
      pecas: pecas,
      categorias: distintosOrdenados_(pecas.map(function (p) { return p.categoria; })),
      colecoes: distintosOrdenados_(pecas.map(function (p) { return p.colecao; }))
    };
  });
}

// ---------- Área Adm: peças ----------

// O site lê estes campos da primeira linha de cada nome; por isso valem para todas as cores.
var CAMPOS_NIVEL_PECA = ['categoria', 'colecao', 'descricao', 'destaque'];

function chaveNome_(texto) {
  return String(texto === undefined || texto === null ? '' : texto).trim().replace(/\s+/g, ' ');
}

function abaPecas_(props) {
  var aba = abrirPlanilha_(props).getSheetByName('Peças');
  if (!aba) throw new Error('Aba não encontrada: Peças');
  return aba;
}

function cabecalhoNormalizado_(tabela) {
  return (tabela[0] || []).map(normalizar_);
}

function linhaDoCodigo_(tabela, cab, codigo) {
  var iCodigo = cab.indexOf('codigo');
  if (iCodigo === -1) throw new Error('Coluna codigo não encontrada na aba Peças');
  for (var i = 1; i < tabela.length; i++) {
    if (String(tabela[i][iCodigo]).trim() === codigo) return i;
  }
  return -1;
}

function pecaDoCodigo_(aba, codigo) {
  var lista = pecasParaArea(aba.getDataRange().getDisplayValues());
  for (var i = 0; i < lista.length; i++) if (lista[i].codigo === codigo) return lista[i];
  return null;
}

function salvarPeca(passe, codigo, campos) {
  return comPasse_('salvarPeca', passe, function (props) {
    var validacao = validarCamposPeca(campos, false);
    if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };
    codigo = String(codigo === undefined || codigo === null ? '' : codigo).trim();
    var trava = LockService.getScriptLock();
    trava.waitLock(30000);
    try {
      var aba = abaPecas_(props);
      var tabela = aba.getDataRange().getDisplayValues();
      var cab = cabecalhoNormalizado_(tabela);
      var alvo = codigo ? linhaDoCodigo_(tabela, cab, codigo) : -1;
      if (alvo === -1) return { ok: false, mensagem: MENSAGEM_PECA_SUMIU };
      var iNome = cab.indexOf('nome');
      var nomeAlvo = iNome === -1 ? '' : chaveNome_(tabela[alvo][iNome]);
      for (var chave in validacao.valores) {
        var c = cab.indexOf(chave);
        if (c === -1) continue;
        var nivelPeca = CAMPOS_NIVEL_PECA.indexOf(chave) !== -1 && nomeAlvo !== '';
        for (var i = 1; i < tabela.length; i++) {
          if (i === alvo || (nivelPeca && chaveNome_(tabela[i][iNome]) === nomeAlvo)) {
            aba.getRange(i + 1, c + 1).setValue(validacao.valores[chave]);
          }
        }
      }
      SpreadsheetApp.flush();
      return { ok: true, mensagem: 'Salvo! Aparece no site em até 10 min.', peca: pecaDoCodigo_(aba, codigo) };
    } finally {
      trava.releaseLock();
    }
  });
}

function criarPeca(passe, campos) {
  return comPasse_('criarPeca', passe, function (props) {
    var entrada = {};
    for (var k in (campos || {})) entrada[k] = campos[k];
    if (chaveNome_(entrada.colecao) === '') entrada.colecao = 'Linha Petit';
    var validacao = validarCamposPeca(entrada, true);
    if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };
    var trava = LockService.getScriptLock();
    trava.waitLock(30000);
    try {
      var aba = abaPecas_(props);
      var tabela = aba.getDataRange().getDisplayValues();
      var cab = cabecalhoNormalizado_(tabela);
      var iCodigo = cab.indexOf('codigo');
      if (iCodigo === -1) throw new Error('Coluna codigo não encontrada na aba Peças');
      var existentes = [];
      for (var i = 1; i < tabela.length; i++) existentes.push(String(tabela[i][iCodigo]).trim());
      var valores = validacao.valores;
      // Nova cor de peça que já existe: os campos de nível da peça vêm da primeira linha do mesmo nome.
      var iNome = cab.indexOf('nome');
      var chaveNova = chaveNome_(valores.nome);
      if (iNome !== -1 && chaveNova !== '') {
        for (var l = 1; l < tabela.length; l++) {
          if (chaveNome_(tabela[l][iNome]) !== chaveNova) continue;
          for (var n = 0; n < CAMPOS_NIVEL_PECA.length; n++) {
            var cn = cab.indexOf(CAMPOS_NIVEL_PECA[n]);
            if (cn !== -1) valores[CAMPOS_NIVEL_PECA[n]] = tabela[l][cn];
          }
          break;
        }
      }
      var codigo = gerarCodigo(valores.nome, valores.cor, existentes);
      valores.codigo = codigo;
      valores.fotos = 0;
      aba.appendRow(linhaNovaPeca(cab, valores));
      SpreadsheetApp.flush();
      return {
        ok: true, codigo: codigo, mensagem: 'Peça cadastrada! Agora envie as fotos.',
        peca: pecaDoCodigo_(aba, codigo)
      };
    } finally {
      trava.releaseLock();
    }
  });
}

// ---------- Área Adm: apagar foto ----------

var MENSAGEM_FOTO_SUMIU = 'Essa foto não existe mais. Atualize a lista.';

function apagarFoto(passe, codigo, n) {
  return comPasse_('apagarFoto', passe, function (props) {
    codigo = String(codigo === undefined || codigo === null ? '' : codigo).trim();
    if (!/^\d+$/.test(String(n === undefined || n === null ? '' : n).trim())) {
      return { ok: false, mensagem: MENSAGEM_FOTO_SUMIU };
    }
    n = parseInt(n, 10);
    var trava = LockService.getScriptLock();
    trava.waitLock(30000);
    var gravado = null;
    try {
      var dados = lerPecas_(props);
      var cab = cabecalhoNormalizado_(dados.tabela);
      var linha = codigo ? linhaDoCodigo_(dados.tabela, cab, codigo) : -1;
      if (linha === -1) return { ok: false, mensagem: MENSAGEM_PECA_SUMIU };
      var iFotos = cab.indexOf('fotos');
      var fotosPlanilha = iFotos === -1 ? 0 : parseInt(String(dados.tabela[linha][iFotos]).trim(), 10) || 0;

      var ramo = branch_(props);
      var ref = github_(props, 'GET', 'git/ref/heads/' + ramo);
      var shaBase = ref.object.sha;
      var commitBase = github_(props, 'GET', 'git/commits/' + shaBase);
      var itens = caminhosDaArvore_(props, commitBase.tree.sha);
      var shaDe = {};
      itens.forEach(function (item) { shaDe[item.path] = item.sha; });
      var caminhos = itens.map(function (item) { return item.path; });
      var total = Math.max(fotosPlanilha, contarFotosNaArvore(caminhos, codigo));
      var plano = planoApagarFoto(codigo, total, n);
      if (!plano) return { ok: false, mensagem: MENSAGEM_FOTO_SUMIU };

      var entradas = [];
      plano.mover.forEach(function (m) {
        if (shaDe[m.de]) {
          entradas.push({ path: m.para, mode: '100644', type: 'blob', sha: shaDe[m.de] });
        } else if (shaDe[m.para]) {
          entradas.push({ path: m.para, mode: '100644', type: 'blob', sha: null });
        }
      });
      if (shaDe[plano.apagar]) entradas.push({ path: plano.apagar, mode: '100644', type: 'blob', sha: null });

      gravado = gravarTotalFotos_(props, codigo, total - 1);
      entradas.push({ path: 'catalogo.json', mode: '100644', type: 'blob', content: jsonReserva_(props) });
      var arvore = github_(props, 'POST', 'git/trees', { base_tree: commitBase.tree.sha, tree: entradas });
      var commit = github_(props, 'POST', 'git/commits', {
        message: 'Fotos: ' + codigo + ' (apaga ' + n + ')',
        tree: arvore.sha,
        parents: [shaBase]
      });
      github_(props, 'PATCH', 'git/refs/heads/' + ramo, { sha: commit.sha });
      gravado = null;
      return { ok: true, mensagem: 'Foto apagada. Aparece no site em alguns minutos.', fotos: total - 1 };
    } catch (erro) {
      if (gravado) {
        try { desfazerTotalFotos_(gravado); } catch (ignorado) { /* o e-mail ao dono já avisa */ }
      }
      throw erro;
    } finally {
      trava.releaseLock();
    }
  });
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
