import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { criarAmbiente } from './dubles-google.js';

const PROPS = {
  SENHA_FORMULARIO: 'certa', GITHUB_TOKEN: 'ghp_segredo', GITHUB_DONO: 'dono',
  GITHUB_REPO: 'repo', PLANILHA_ID: 'planilha', EMAIL_DONO: 'dono@exemplo.com',
};
const CAB = ['codigo', 'nome', 'cor', 'categoria', 'colecao', 'preco', 'ativo', 'destaque', 'campanha', 'fotos', 'descricao', 'P', 'M', 'G', '1', '2', '3', '4', '6'];
const linhaPeca = (codigo, nome, cor, extra = {}) => {
  const base = {
    codigo, nome, cor, categoria: 'Bata', colecao: 'Linha Petit', preco: '59,90', ativo: 'sim',
    destaque: 'nao', campanha: 'sim', fotos: '3', descricao: 'Antiga', P: '1', M: '2', G: '', 1: '', 2: '', 3: '', 4: '1', 6: '',
  };
  const todos = { ...base, ...extra };
  return CAB.map((c) => todos[c] ?? '');
};
const tabela = () => [
  CAB,
  linhaPeca('vestido-lua', 'Vestido Lua', 'Azul', { categoria: 'Vestido' }),
  linhaPeca('vestido-lua-rosa', 'Vestido Lua', 'Rosa', { categoria: 'Vestido' }),
  linhaPeca('bata-anthony', 'Bata Anthony', ''),
];
const j = (x) => JSON.parse(JSON.stringify(x));
const col = (nome) => CAB.indexOf(nome);

function github(arvore, falharCommit) {
  return (c) => {
    const { metodo, url } = c;
    if (metodo === 'GET' && url.endsWith('git/ref/heads/main')) return { codigo: 200, json: { object: { sha: 'c0' } } };
    if (metodo === 'GET' && url.endsWith('git/commits/c0')) return { codigo: 200, json: { tree: { sha: 't0' } } };
    if (metodo === 'GET' && url.includes('git/trees/t0')) return { codigo: 200, json: { tree: arvore } };
    if (metodo === 'POST' && url.endsWith('git/blobs')) return { codigo: 201, json: { sha: 'novo-blob' } };
    if (metodo === 'POST' && url.endsWith('git/trees')) return { codigo: 201, json: { sha: 't1' } };
    if (metodo === 'POST' && url.endsWith('git/commits')) {
      return falharCommit ? { codigo: 500, texto: 'erro do github' } : { codigo: 201, json: { sha: 'c1' } };
    }
    if (metodo === 'PATCH') return { codigo: 200, json: {} };
    return { codigo: 404, texto: '' };
  };
}
const blob = (path, sha) => ({ path, sha, type: 'blob', mode: '100644' });

function ambiente(opcoes = {}) {
  return criarAmbiente({ props: PROPS, abaPecas: tabela(), ...opcoes });
}
function entrarOk(amb) {
  const r = amb.ctx.entrar('certa');
  assert.equal(r.ok, true);
  return r.passe;
}

test('entrar com senha certa devolve passe aceito por listarPecasArea', () => {
  const amb = ambiente();
  const r = amb.ctx.entrar('certa');
  assert.equal(r.ok, true);
  const lista = j(amb.ctx.listarPecasArea(r.passe));
  assert.equal(lista.ok, true);
  assert.equal(lista.pecas.length, 3);
  assert.deepEqual(lista.categorias, ['Bata', 'Vestido']);
  assert.deepEqual(lista.colecoes, ['Linha Petit']);
  assert.deepEqual(lista.pecas.map((p) => p.codigo), ['vestido-lua', 'vestido-lua-rosa', 'bata-anthony']);
  assert.equal(lista.pecas[0].descricao, 'Antiga');
});

test('entrar com senha errada 5 vezes bloqueia, mesmo com a senha certa depois', () => {
  const amb = ambiente();
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(j(amb.ctx.entrar('errada')), { ok: false, mensagem: 'Senha incorreta.' });
  }
  const quinta = j(amb.ctx.entrar('errada'));
  assert.equal(quinta.ok, false);
  assert.match(quinta.mensagem, /Muitas tentativas/);
  const depois = j(amb.ctx.entrar('certa'));
  assert.equal(depois.ok, false);
  assert.match(depois.mensagem, /Muitas tentativas/);
});

test('entrar vazio ou sem senha configurada nunca devolve passe', () => {
  const amb = ambiente();
  for (const s of ['', undefined, null]) {
    const r = j(amb.ctx.entrar(s));
    assert.equal(r.ok, false);
    assert.equal(r.passe, undefined);
  }
  const semSenha = criarAmbiente({ props: { ...PROPS, SENHA_FORMULARIO: '' }, abaPecas: tabela() });
  for (const s of ['', 'qualquer', undefined]) {
    const r = j(semSenha.ctx.entrar(s));
    assert.equal(r.ok, false);
    assert.equal(r.passe, undefined);
  }
});

test('passe vencido ou forjado pede para entrar de novo', () => {
  const amb = ambiente();
  const sair = { ok: false, sair: true, mensagem: 'Sua entrada venceu. Digite a senha de novo.' };
  assert.deepEqual(j(amb.ctx.listarPecasArea('1.abc')), sair);
  assert.deepEqual(j(amb.ctx.listarPecasArea(undefined)), sair);
  const validade = String(Date.now() - 1000);
  const assinatura = crypto.createHmac('sha256', 'certa').update(validade).digest('hex');
  assert.deepEqual(j(amb.ctx.listarPecasArea(`${validade}.${assinatura}`)), sair);
  const futuro = String(Date.now() + 100000);
  assert.deepEqual(j(amb.ctx.listarPecasArea(`${futuro}.${assinatura}`)), sair);
  assert.deepEqual(j(amb.ctx.salvarPeca('1.abc', 'vestido-lua', {})), sair);
  assert.deepEqual(j(amb.ctx.criarPeca('1.abc', {})), sair);
  assert.deepEqual(j(amb.ctx.apagarFoto('1.abc', 'x', 1)), sair);
});

test('salvarPeca grava só as colunas editadas, achando a linha pelo código', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  amb.pecas.splice(1, 0, linhaPeca('novo-topo', 'Novo Topo', '')); // a linha de vestido-lua desce uma posição
  const antes = j(amb.pecas);
  const r = j(amb.ctx.salvarPeca(passe, 'vestido-lua', {
    preco: '99,90', categoria: 'Vestido', estoque: { 4: 3 }, ativo: false, destaque: true, campanha: true,
  }));
  assert.equal(r.ok, true);
  assert.equal(r.mensagem, 'Salvo! Aparece no site em até 10 min.');
  const linha = amb.pecas[2];
  assert.equal(linha[col('codigo')], 'vestido-lua');
  assert.equal(linha[col('preco')], 99.9);
  assert.equal(linha[col('4')], 3);
  assert.equal(linha[col('ativo')], 'nao');
  assert.equal(linha[col('destaque')], 'sim');
  assert.equal(linha[col('campanha')], 'sim');
  assert.equal(linha[col('nome')], 'Vestido Lua');
  assert.equal(linha[col('fotos')], '3');
  assert.equal(linha[col('descricao')], 'Antiga');
  assert.equal(linha[col('colecao')], 'Linha Petit');
  assert.equal(linha[col('P')], '1');
  assert.equal(linha[col('M')], '2');
  assert.deepEqual(j(amb.pecas[0]), antes[0]);
  assert.deepEqual(j(amb.pecas[1]), antes[1]);
  assert.deepEqual(j(amb.pecas[4]), antes[4]);
  assert.equal(r.peca.codigo, 'vestido-lua');
  assert.equal(r.peca.preco, 99.9);
  assert.equal(r.peca.estoque['4'], 3);
  assert.equal(r.peca.ativo, false);
  assert.equal(amb.travas.total, 1);
  assert.equal(amb.travas.ativas, 0);
  assert.equal(amb.travas.aninhada, false);
});

test('salvarPeca replica categoria, colecao, descricao e destaque nas linhas de mesmo nome', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  const r = j(amb.ctx.salvarPeca(passe, 'vestido-lua-rosa', {
    categoria: 'Conjunto', colecao: 'Nova', descricao: 'Texto novo', destaque: true, preco: '10', ativo: false, estoque: { M: 9 },
  }));
  assert.equal(r.ok, true);
  const [, azul, rosa, bata] = amb.pecas;
  for (const l of [azul, rosa]) {
    assert.equal(l[col('categoria')], 'Conjunto');
    assert.equal(l[col('colecao')], 'Nova');
    assert.equal(l[col('descricao')], 'Texto novo');
    assert.equal(l[col('destaque')], 'sim');
  }
  // preço, ativo e estoque só na linha do código
  assert.equal(rosa[col('preco')], 10);
  assert.equal(azul[col('preco')], '59,90');
  assert.equal(rosa[col('ativo')], 'nao');
  assert.equal(azul[col('ativo')], 'sim');
  assert.equal(rosa[col('M')], 9);
  assert.equal(azul[col('M')], '2');
  assert.deepEqual(j(bata), j(linhaPeca('bata-anthony', 'Bata Anthony', '')));
});

test('salvarPeca de código que sumiu não grava nada', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  const antes = j(amb.pecas);
  const r = j(amb.ctx.salvarPeca(passe, 'nao-existe', { preco: '10', categoria: 'Vestido' }));
  assert.deepEqual(r, { ok: false, mensagem: 'Não achei essa peça. Atualize a lista.' });
  assert.deepEqual(j(amb.pecas), antes);
});

test('salvarPeca com preço inválido devolve a mensagem da validação', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  const antes = j(amb.pecas);
  const r = j(amb.ctx.salvarPeca(passe, 'vestido-lua', { preco: 'abc' }));
  assert.equal(r.ok, false);
  assert.equal(r.mensagem, 'Preço inválido. Use só números, ex.: 139,90.');
  assert.deepEqual(j(amb.pecas), antes);
});

test('criarPeca acrescenta na última linha com código gerado e fotos 0', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  const r = j(amb.ctx.criarPeca(passe, {
    nome: 'Vestido Lua', cor: 'Rosa', categoria: 'Vestido', preco: '120', colecao: '', estoque: { P: 2 },
  }));
  assert.equal(r.ok, true);
  assert.equal(r.codigo, 'vestido-lua-rosa-2');
  assert.equal(r.mensagem, 'Peça cadastrada! Agora envie as fotos.');
  assert.equal(amb.pecas.length, 5);
  const ultima = amb.pecas[4];
  assert.equal(ultima[col('codigo')], 'vestido-lua-rosa-2');
  assert.equal(ultima[col('fotos')], 0);
  assert.equal(ultima[col('colecao')], 'Linha Petit');
  assert.equal(ultima[col('nome')], 'Vestido Lua');
  assert.equal(ultima[col('preco')], 120);
  assert.equal(ultima[col('P')], 2);
  assert.equal(r.peca.codigo, 'vestido-lua-rosa-2');
  assert.equal(r.peca.fotos, 0);
  assert.equal(amb.travas.total, 1);
});

test('criarPeca com nome "=HACK" grava texto com apóstrofo', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  const r = j(amb.ctx.criarPeca(passe, { nome: '=HACK', cor: '', categoria: '+x', preco: '10', descricao: '@y' }));
  assert.equal(r.ok, true);
  const ultima = amb.pecas[amb.pecas.length - 1];
  assert.equal(ultima[col('nome')], "'=HACK");
  assert.equal(ultima[col('categoria')], "'+x");
  assert.equal(ultima[col('descricao')], "'@y");
  assert.equal(r.codigo, 'hack');
});

test('criarPeca com dados inválidos não grava nada', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  const r = j(amb.ctx.criarPeca(passe, { nome: '', categoria: 'Vestido', preco: '10' }));
  assert.equal(r.ok, false);
  assert.equal(r.mensagem, 'Escreva o nome da peça.');
  assert.equal(amb.pecas.length, 4);
});

const ARVORE = [
  blob('fotos/x-1.jpg', 's1'), blob('fotos/x-2.jpg', 's2'), blob('fotos/x-3.jpg', 's3'),
  { path: 'fotos', type: 'tree', sha: 'dir' }, blob('index.html', 'h'),
];
const tabelaComX = () => [...tabela(), linhaPeca('x', 'Peça X', '', { fotos: '3' })];

test('apagarFoto monta um commit que move as seguintes e grava fotos - 1', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE) });
  const passe = entrarOk(amb);
  const r = j(amb.ctx.apagarFoto(passe, 'x', 1));
  assert.equal(r.ok, true);
  assert.equal(r.fotos, 2);
  const arvores = amb.chamadas.filter((c) => c.metodo === 'POST' && c.url.endsWith('git/trees'));
  assert.equal(arvores.length, 1);
  const entradas = arvores[0].corpo.tree.map((e) => ({ path: e.path, sha: e.sha }));
  assert.deepEqual(entradas.slice(0, 3), [
    { path: 'fotos/x-1.jpg', sha: 's2' }, { path: 'fotos/x-2.jpg', sha: 's3' }, { path: 'fotos/x-3.jpg', sha: null },
  ]);
  assert.equal(entradas.length, 4);
  assert.equal(entradas[3].path, 'catalogo.json');
  assert.equal(arvores[0].corpo.base_tree, 't0');
  const commits = amb.chamadas.filter((c) => c.metodo === 'POST' && c.url.endsWith('git/commits'));
  assert.equal(commits.length, 1);
  assert.equal(commits[0].corpo.message, 'Fotos: x (apaga 1)');
  assert.equal(amb.pecas[4][col('fotos')], 2);
  assert.equal(amb.travas.total, 1);
  assert.equal(amb.travas.aninhada, false);
});

test('apagarFoto da última só apaga, sem mover', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE) });
  const passe = entrarOk(amb);
  assert.equal(amb.ctx.apagarFoto(passe, 'x', '3').ok, true);
  const arv = amb.chamadas.find((c) => c.url.endsWith('git/trees') && c.metodo === 'POST');
  assert.deepEqual(arv.corpo.tree.slice(0, 1).map((e) => ({ path: e.path, sha: e.sha })), [{ path: 'fotos/x-3.jpg', sha: null }]);
  assert.equal(arv.corpo.tree.length, 2);
});

test('apagarFoto recusa n inválido ou foto inexistente sem gravar no GitHub', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE) });
  const passe = entrarOk(amb);
  for (const n of ['a', 1.5, -1, 0, null, undefined, '1.5']) {
    const r = j(amb.ctx.apagarFoto(passe, 'x', n));
    assert.equal(r.ok, false, `n=${n}`);
  }
  assert.equal(amb.chamadas.some((c) => c.metodo === 'POST'), false);
  const r = j(amb.ctx.apagarFoto(passe, 'x', 4));
  assert.deepEqual(r, { ok: false, mensagem: 'Essa foto não existe mais. Atualize a lista.' });
  assert.equal(amb.chamadas.some((c) => c.metodo === 'POST'), false);
  assert.equal(amb.pecas[4][col('fotos')], '3');
});

test('apagarFoto desfaz o total na planilha se o commit falhar e avisa o dono sem vazar o token', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE, true) });
  const passe = entrarOk(amb);
  const r = j(amb.ctx.apagarFoto(passe, 'x', 2));
  assert.deepEqual(r, { ok: false, mensagem: 'Não consegui enviar. Avise o dono.' });
  assert.equal(String(amb.pecas[4][col('fotos')]), '3');
  assert.equal(amb.emails.length, 1);
  assert.doesNotMatch(JSON.stringify(amb.emails), /ghp_segredo/);
  assert.equal(amb.travas.ativas, 0);
});

test('enviarFotos sem passe válido devolve sair:true e não chama o GitHub', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE) });
  const r = j(amb.ctx.enviarFotos({ passe: 'lixo', codigo: 'x', arquivos: [{ tipo: 'image/jpeg', base64: 'AAAA' }] }));
  assert.deepEqual(r, { ok: false, sair: true, mensagem: 'Sua entrada venceu. Digite a senha de novo.' });
  assert.equal(amb.chamadas.length, 0);
  assert.equal(amb.cache.size, 0); // não conta como erro de senha
});

test('enviarFotos com passe válido envia, devolve o total novo e ignora senha no corpo', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE) });
  const passe = entrarOk(amb);
  const r = j(amb.ctx.enviarFotos({
    passe, senha: 'errada', codigo: 'x', trocar: false,
    arquivos: [{ tipo: 'image/jpeg', base64: 'AAAA' }, { tipo: 'image/jpeg', base64: 'BBBB' }],
  }));
  assert.equal(r.ok, true);
  assert.equal(r.fotos, 5);
  assert.equal(amb.pecas[4][col('fotos')], 5);
  assert.equal(amb.travas.total, 1);
  const arv = amb.chamadas.find((c) => c.url.endsWith('git/trees') && c.metodo === 'POST');
  assert.deepEqual(arv.corpo.tree.slice(0, 2).map((e) => e.path), ['fotos/x-4.jpg', 'fotos/x-5.jpg']);
});

test('enviarFotos com código inexistente ou sem fotos recusa com a mensagem de validação', () => {
  const amb = criarAmbiente({ props: PROPS, abaPecas: tabelaComX(), github: github(ARVORE) });
  const passe = entrarOk(amb);
  assert.equal(amb.ctx.enviarFotos({ passe, codigo: 'zzz', arquivos: [{ tipo: 'image/jpeg', base64: 'A' }] }).ok, false);
  assert.equal(amb.ctx.enviarFotos({ passe, codigo: 'x', arquivos: [] }).mensagem, 'Escolha pelo menos uma foto.');
  assert.equal(amb.chamadas.length, 0);
});

test('doGet serve o modelo Area com o título da Área Adm', () => {
  const amb = ambiente();
  const pagina = amb.ctx.doGet();
  assert.equal(pagina.modelo.nome, 'Area');
  assert.equal(pagina.titulo, 'Trio Kids - Área Adm');
  assert.equal(pagina.modelo.urlLogo, 'https://dono.github.io/img/logo.png');
  assert.equal(pagina.modelo.urlSite, 'https://dono.github.io/');
  assert.equal(pagina.modelo.faltando, '');
});

test('listarPecas antiga foi removida', () => {
  assert.equal(typeof ambiente().ctx.listarPecas, 'undefined');
});

test('sem configuração completa as funções devolvem mensagem e não lançam', () => {
  const amb = criarAmbiente({ props: { ...PROPS, GITHUB_TOKEN: '' }, abaPecas: tabela() });
  const respostas = [
    amb.ctx.entrar('certa'), amb.ctx.listarPecasArea('x'), amb.ctx.salvarPeca('x', 'a', {}),
    amb.ctx.criarPeca('x', {}), amb.ctx.apagarFoto('x', 'a', 1), amb.ctx.enviarFotos({}),
  ];
  for (const r of respostas) {
    assert.equal(r.ok, false);
    assert.match(r.mensagem, /Falta configurar: GITHUB_TOKEN/);
  }
});

test('erro inesperado em serviço do Google não faz as funções lançarem', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  amb.ctx.PropertiesService = { getScriptProperties: () => { throw new Error('serviço fora do ar'); } };
  const respostas = [
    () => amb.ctx.entrar('certa'), () => amb.ctx.listarPecasArea(passe), () => amb.ctx.salvarPeca(passe, 'vestido-lua', {}),
    () => amb.ctx.criarPeca(passe, {}), () => amb.ctx.apagarFoto(passe, 'x', 1), () => amb.ctx.enviarFotos({ passe }),
  ];
  for (const chamar of respostas) {
    let r;
    assert.doesNotThrow(() => { r = j(chamar()); });
    assert.deepEqual(r, { ok: false, mensagem: 'Não consegui enviar. Avise o dono.' });
  }
});

test('erro inesperado depois de ler a configuração avisa o dono e devolve a mensagem de falha', () => {
  const amb = ambiente();
  const passe = entrarOk(amb);
  amb.ctx.SpreadsheetApp = { openById: () => { throw new Error('planilha fora do ar'); }, flush() {} };
  const r = j(amb.ctx.listarPecasArea(passe));
  assert.deepEqual(r, { ok: false, mensagem: 'Não consegui enviar. Avise o dono.' });
  assert.equal(amb.emails.length, 1);
  const rr = j(amb.ctx.entrar('errada'));
  assert.equal(rr.ok, false);
});
