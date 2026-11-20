import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { montarCatalogo } from '../js/dados/catalogo.js';

const codigo = fs.readFileSync(new URL('../apps-script/Logica.gs', import.meta.url), 'utf8');
const ctx = {};
vm.runInNewContext(codigo, ctx);
const {
  proximosNomesFotos, validarEnvio, registrarErroSenha,
  contarFotosNaArvore, tabelasParaReserva, mesmoConteudoReserva,
  gerarCodigo, textoSeguro, lerPreco, validarCamposPeca, linhaNovaPeca,
  pecasParaArea, criarPasse, passeValido, planoApagarFoto,
} = ctx;

const nomes = (cod, ns) => ns.map((n) => `fotos/${cod}-${n}.jpg`);

test('proximosNomesFotos acrescenta depois das fotos atuais', () => {
  const r = proximosNomesFotos('conjunto-joab', 2, 3, false);
  assert.deepEqual([...r.criar], nomes('conjunto-joab', [3, 4, 5]));
  assert.deepEqual([...r.apagar], []);
});

test('proximosNomesFotos trocar cria de 1 e apaga excedentes', () => {
  const r = proximosNomesFotos('conjunto-joab', 4, 2, true);
  assert.deepEqual([...r.criar], nomes('conjunto-joab', [1, 2]));
  assert.deepEqual([...r.apagar], nomes('conjunto-joab', [3, 4]));
});

test('proximosNomesFotos trocar com quantidade >= atuais não apaga nada', () => {
  const r = proximosNomesFotos('x', 2, 3, true);
  assert.deepEqual([...r.criar], nomes('x', [1, 2, 3]));
  assert.deepEqual([...r.apagar], []);
});

const base = () => ({
  bloqueado: false, autorizado: true,
  codigo: 'a', codigosValidos: ['a', 'b'],
  arquivos: [{ tipo: 'image/jpeg', base64: 'AAAA' }],
});

test('validarEnvio aceita envio correto', () => {
  assert.equal(validarEnvio(base()).ok, true);
});
test('validarEnvio erros na ordem', () => {
  assert.equal(validarEnvio({ ...base(), bloqueado: true }).erro, 'bloqueado');
  assert.equal(validarEnvio({ ...base(), autorizado: false }).erro, 'senha');
  assert.equal(validarEnvio({ ...base(), codigo: 'z' }).erro, 'codigo');
  assert.equal(validarEnvio({ ...base(), arquivos: [] }).erro, 'sem-arquivo');
  assert.equal(validarEnvio({ ...base(), arquivos: Array(9).fill({ tipo: 'image/jpeg', base64: 'A' }) }).erro, 'muitos');
  assert.equal(validarEnvio({ ...base(), arquivos: [{ tipo: 'image/png', base64: 'A' }] }).erro, 'tipo');
  assert.equal(validarEnvio({ ...base(), arquivos: [{ tipo: 'image/jpeg', base64: 'A'.repeat(2000001) }] }).erro, 'grande');
  assert.equal(validarEnvio({ ...base(), arquivos: [{ tipo: 'image/jpeg', base64: 'A'.repeat(2000000) }] }).ok, true);
});
test('validarEnvio bloqueado vale mesmo com senha certa', () => {
  const r = validarEnvio({ ...base(), bloqueado: true, autorizado: true });
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'bloqueado');
});
test('validarEnvio nunca aceita sem autorização', () => {
  for (const autorizado of [false, undefined, null, '', 0]) {
    const r = validarEnvio({ ...base(), autorizado });
    assert.equal(r.ok, false);
    assert.equal(r.erro, 'senha');
  }
});

test('registrarErroSenha', () => {
  assert.deepEqual({ ...registrarErroSenha(3) }, { contagem: 4, bloqueado: false });
  assert.deepEqual({ ...registrarErroSenha(4) }, { contagem: 5, bloqueado: true });
});

test('contarFotosNaArvore pega o maior N exato', () => {
  assert.equal(contarFotosNaArvore([
    'fotos/conjunto-joab-1.jpg', 'fotos/conjunto-joab-3.jpg',
    'fotos/conjunto-joab-x.jpg', 'fotos/conjunto-joab-10.jpg',
  ], 'conjunto-joab'), 10);
});
test('contarFotosNaArvore ignora outros códigos com prefixo e zero', () => {
  assert.equal(contarFotosNaArvore([
    'fotos/conjunto-joab-azul-1.jpg', 'fotos/conjunto-joab-0.jpg', 'fotos/conjunto-joab-2.png',
    'x/fotos/conjunto-joab-7.jpg',
  ], 'conjunto-joab'), 0);
  assert.equal(contarFotosNaArvore([], 'a'), 0);
});

const pecas = [
  ['codigo', 'nome', 'cor', 'categoria', 'colecao', 'preco', 'ativo', 'destaque', 'campanha', 'fotos', 'descricao', 'P', 'M', 'G', '1', '2', '3', '4', '6'],
  ['vestido-a', 'Vestido A', '', 'Vestido', 'Linha', '139,90', 'sim', 'sim', 'sim', '2', '', '', '', '', '1', '', '1', '', ''],
];
const config = [['chave', 'valor'], ['whatsapp', '5562993379366'], ['desconto_campanha', '10']];
const campanha = [['texto'], ['Primeiro parágrafo']];

test('tabelasParaReserva gera JSON que passa por montarCatalogo', () => {
  const json = tabelasParaReserva(pecas, config, campanha, '2026-11-20T10:00:00Z');
  const obj = JSON.parse(json);
  assert.deepEqual(Object.keys(obj), ['geradoEm', 'pecas', 'config', 'campanha']);
  assert.equal(obj.geradoEm, '2026-11-20T10:00:00Z');
  const cat = montarCatalogo({ pecas: obj.pecas, config: obj.config, campanha: obj.campanha }, { whatsapp: '0', descontoCampanha: 10 });
  assert.equal(cat.pecas[0].variantes[0].preco, 139.9);
});

test('mesmoConteudoReserva ignora geradoEm', () => {
  const a = tabelasParaReserva(pecas, config, campanha, '2026-11-20T10:00:00Z');
  const b = tabelasParaReserva(pecas, config, campanha, '2026-11-21T10:00:00Z');
  assert.equal(mesmoConteudoReserva(a, b), true);
  const c = tabelasParaReserva([pecas[0], [...pecas[1].slice(0, 5), '149,90', ...pecas[1].slice(6)]], config, campanha, '2026-11-20T10:00:00Z');
  assert.equal(mesmoConteudoReserva(a, c), false);
});

const json = (x) => JSON.parse(JSON.stringify(x));

test('gerarCodigo tira acento, junta cor e evita repetido', () => {
  assert.equal(gerarCodigo('Vestido Lua', 'Rosa', []), 'vestido-lua-rosa');
  assert.equal(gerarCodigo('Vestido Maria Júlia', '', []), 'vestido-maria-julia');
  assert.equal(gerarCodigo('Vestido Lua', 'Rosa', ['vestido-lua-rosa', 'vestido-lua-rosa-2']), 'vestido-lua-rosa-3');
  assert.equal(gerarCodigo('  ***  ', '', []), 'peca');
  assert.ok(gerarCodigo('x'.repeat(100), '', []).length <= 60);
  const longo = 'x'.repeat(100);
  const base60 = gerarCodigo(longo, '', []);
  const r = gerarCodigo(longo, '', [base60]);
  assert.ok(r.length <= 60);
  assert.notEqual(r, base60);
  assert.match(r, /-2$/);
});
test('textoSeguro impede fórmula', () => {
  assert.equal(textoSeguro('=SOMA(A1)'), "'=SOMA(A1)");
  assert.equal(textoSeguro('-promo'), "'-promo");
  assert.equal(textoSeguro('+1'), "'+1");
  assert.equal(textoSeguro('@x'), "'@x");
  assert.equal(textoSeguro('Vestido'), 'Vestido');
  assert.equal(textoSeguro('  oi  '), 'oi');
  assert.equal(textoSeguro(undefined), '');
});
test('lerPreco aceita formatos comuns e recusa inválidos', () => {
  for (const t of ['139,90', '139,9', '139.90', 'R$ 139,90', ' 139,90 ', 139.9]) assert.equal(lerPreco(t), 139.9);
  for (const t of ['abc', '0', '-5', '', '1,999', '0,00', '100000', null, undefined]) assert.equal(lerPreco(t), null);
  assert.equal(lerPreco('1.234,56'), 1234.56);
  assert.equal(lerPreco('1234,56'), 1234.56);
  assert.equal(lerPreco('R$ 1.299,90'), 1299.9);
  assert.equal(lerPreco('99999,99'), 99999.99);
  assert.equal(lerPreco('139'), 139);
});
test('validarCamposPeca monta valores da planilha', () => {
  const r = validarCamposPeca({ nome: 'Vestido Lua', cor: 'Rosa', categoria: 'Vestido', colecao: 'Linha Petit',
    descricao: '=x', preco: '129,90', ativo: true, destaque: false, campanha: true,
    estoque: { P: '', M: '', G: '', 1: 2, 2: 0, 3: '', 4: '1', 6: '' } }, true);
  assert.equal(r.ok, true);
  assert.equal(r.valores.preco, 129.9);
  assert.equal(r.valores.ativo, 'sim');
  assert.equal(r.valores.destaque, 'nao');
  assert.equal(r.valores.descricao, "'=x");
  assert.equal(r.valores['1'], 2);
  assert.equal(r.valores['2'], 0);
  assert.equal(r.valores['4'], 1);
  assert.equal(r.valores.p, '');
  assert.equal(r.valores.nome, 'Vestido Lua');
});
test('validarCamposPeca recusa com mensagem', () => {
  const ok = { categoria: 'Vestido', preco: '10', estoque: {} };
  assert.equal(validarCamposPeca({ ...ok, preco: 'abc' }, false).mensagem, 'Preço inválido. Use só números, ex.: 139,90.');
  assert.equal(validarCamposPeca({ ...ok, categoria: ' ' }, false).mensagem, 'Escolha ou escreva a categoria.');
  assert.equal(validarCamposPeca({ ...ok }, true).mensagem, 'Escreva o nome da peça.');
  assert.equal(validarCamposPeca({ ...ok, estoque: { 4: -1 } }, false).mensagem, 'Estoque do tamanho 4 precisa ser um número de 0 a 999.');
  assert.equal(validarCamposPeca({ ...ok, estoque: { P: '1000' } }, false).mensagem, 'Estoque do tamanho P precisa ser um número de 0 a 999.');
  assert.equal(validarCamposPeca({ ...ok, estoque: { M: '1,5' } }, false).mensagem, 'Estoque do tamanho M precisa ser um número de 0 a 999.');
  assert.equal(validarCamposPeca({ ...ok, descricao: 'x'.repeat(1001) }, false).mensagem, 'Texto grande demais em descricao.');
  assert.equal(validarCamposPeca({ ...ok, nome: 'x'.repeat(81) }, true).mensagem, 'Texto grande demais em nome.');
  assert.equal('nome' in validarCamposPeca({ ...ok, nome: 'X' }, false).valores, false);
  assert.equal('cor' in validarCamposPeca({ ...ok, cor: 'X' }, false).valores, false);
});
test('validarCamposPeca não inclui o que não veio (não apaga dados)', () => {
  const r = validarCamposPeca({ categoria: 'Vestido', preco: '10', estoque: { 4: 3 } }, false);
  assert.equal(r.ok, true);
  assert.deepEqual(Object.keys(r.valores).sort(), ['4', 'categoria', 'preco']);
  const v = validarCamposPeca({ categoria: 'Vestido', preco: '10', colecao: '', descricao: '', estoque: { P: '' } }, false).valores;
  assert.equal(v.colecao, '');
  assert.equal(v.descricao, '');
  assert.equal(v.p, '');
});
test('linhaNovaPeca segue a ordem do cabeçalho e deixa o resto vazio', () => {
  const cab = ['codigo', 'nome', 'preco', 'fotos', 'p', 'outra'];
  assert.deepEqual(json(linhaNovaPeca(cab, { codigo: 'a', nome: 'A', preco: 10, fotos: 0, p: 3 })), ['a', 'A', 10, 0, 3, '']);
});
test('pecasParaArea lê a tabela de exibição', () => {
  const t = [['codigo', 'nome', 'cor', 'categoria', 'preco', 'ativo', 'destaque', 'campanha', 'fotos', 'P', '4'],
             ['vl', 'Vestido Lua', 'Rosa', 'Vestido', '129,90', 'nao', '', '', '2', '', '0'],
             ['', 'sem código', '', '', '', '', '', '', '', '', ''],
             ['vm', 'Vestido M', '', 'Vestido', 'R$ 1.299,90', 'X', 'sim', 'não', 'abc', '3', '']];
  const [p, q, ...resto] = pecasParaArea(t);
  assert.equal(resto.length, 0);
  assert.equal(p.codigo, 'vl');
  assert.equal(p.preco, 129.9);
  assert.equal(p.ativo, false);
  assert.equal(p.destaque, false);
  assert.equal(p.campanha, true);
  assert.equal(p.fotos, 2);
  assert.equal(p.estoque.P, '');
  assert.equal(p.estoque['4'], 0);
  assert.equal(q.preco, 1299.9);
  assert.equal(q.ativo, true);
  assert.equal(q.destaque, true);
  assert.equal(q.campanha, false);
  assert.equal(q.fotos, 0);
  assert.equal(q.estoque.P, 3);
  assert.equal(pecasParaArea([]).length, 0);
});
test('passe vale 8 horas e não aceita adulteração', () => {
  const assinar = (t) => 'sig' + t;
  const passe = criarPasse(1000, assinar);
  assert.equal(passeValido(passe, 1000, assinar), true);
  assert.equal(passeValido(passe, 1000 + 28800000, assinar), false);
  assert.equal(passeValido(passe.replace(/\d$/, '9'), 1000, assinar), false);
  assert.equal(passeValido('', 1000, assinar), false);
  assert.equal(passeValido('abc', 1000, assinar), false);
  assert.equal(passeValido(undefined, 1000, assinar), false);
});
test('planoApagarFoto renumera as seguintes', () => {
  const f = (n) => `fotos/x-${n}.jpg`;
  assert.deepEqual(json(planoApagarFoto('x', 4, 2)),
    { mover: [{ de: f(3), para: f(2) }, { de: f(4), para: f(3) }], apagar: f(4) });
  assert.deepEqual(json(planoApagarFoto('x', 3, 3)), { mover: [], apagar: f(3) });
  assert.equal(planoApagarFoto('x', 3, 0), null);
  assert.equal(planoApagarFoto('x', 3, 4), null);
});
