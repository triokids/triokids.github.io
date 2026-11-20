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
  bloqueado: false, senhaInformada: 'abc', senhaCerta: 'abc',
  codigo: 'a', codigosValidos: ['a', 'b'],
  arquivos: [{ tipo: 'image/jpeg', base64: 'AAAA' }],
});

test('validarEnvio aceita envio correto', () => {
  assert.equal(validarEnvio(base()).ok, true);
});
test('validarEnvio erros na ordem', () => {
  assert.equal(validarEnvio({ ...base(), bloqueado: true }).erro, 'bloqueado');
  assert.equal(validarEnvio({ ...base(), senhaInformada: 'x' }).erro, 'senha');
  assert.equal(validarEnvio({ ...base(), codigo: 'z' }).erro, 'codigo');
  assert.equal(validarEnvio({ ...base(), arquivos: [] }).erro, 'sem-arquivo');
  assert.equal(validarEnvio({ ...base(), arquivos: Array(9).fill({ tipo: 'image/jpeg', base64: 'A' }) }).erro, 'muitos');
  assert.equal(validarEnvio({ ...base(), arquivos: [{ tipo: 'image/png', base64: 'A' }] }).erro, 'tipo');
  assert.equal(validarEnvio({ ...base(), arquivos: [{ tipo: 'image/jpeg', base64: 'A'.repeat(2000001) }] }).erro, 'grande');
  assert.equal(validarEnvio({ ...base(), arquivos: [{ tipo: 'image/jpeg', base64: 'A'.repeat(2000000) }] }).ok, true);
});
test('validarEnvio bloqueado vale mesmo com senha certa', () => {
  const r = validarEnvio({ ...base(), bloqueado: true, senhaInformada: 'abc' });
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'bloqueado');
});
test('validarEnvio nunca aceita sem senha configurada', () => {
  for (const certa of ['', undefined, null]) {
    const r = validarEnvio({ ...base(), senhaCerta: certa, senhaInformada: certa ?? '' });
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
