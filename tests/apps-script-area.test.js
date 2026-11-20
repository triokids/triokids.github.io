import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { criarAmbiente } from './dubles-google.js';

const ler = (caminho) => fs.readFileSync(new URL(caminho, import.meta.url), 'utf8');
const AREA = '../apps-script/Area.html';

test('Formulario.html foi removido e doGet serve Area', () => {
  assert.equal(fs.existsSync(new URL('../apps-script/Formulario.html', import.meta.url)), false);
  assert.match(ler('../apps-script/Codigo.gs'), /createTemplateFromFile\('Area'\)/);
});

test('Area.html não guarda o passe no aparelho', () => {
  assert.doesNotMatch(ler(AREA), /localStorage|sessionStorage|document\.cookie/);
});

test('Area.html chama só funções que existem no servidor', () => {
  const html = ler(AREA);
  const { ctx } = criarAmbiente({ props: {}, abaPecas: [['codigo']] });
  const achados = new Set();
  for (const m of html.matchAll(/\.(entrar|listarPecasArea|salvarPeca|criarPeca|enviarFotos|apagarFoto)\s*\(/g)) achados.add(m[1]);
  for (const nome of achados) assert.equal(typeof ctx[nome], 'function', nome);
  assert.deepEqual([...achados].sort(), ['apagarFoto', 'criarPeca', 'entrar', 'enviarFotos', 'listarPecasArea', 'salvarPeca']);
});

test('Area.html não usa innerHTML com dados e nem confirm/alert/prompt', () => {
  const html = ler(AREA);
  assert.doesNotMatch(html, /\b(confirm|alert|prompt)\(/);
  assert.doesNotMatch(html, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});

test('apps-script não cita o nome pessoal e a página se chama Área Adm', () => {
  for (const arq of fs.readdirSync(new URL('../apps-script/', import.meta.url))) {
    assert.doesNotMatch(ler('../apps-script/' + arq), /anne/i, arq);
  }
  assert.match(ler('../apps-script/Codigo.gs'), /setTitle\('Trio Kids - Área Adm'\)/);
  assert.match(ler(AREA), /<title>Trio Kids - Área Adm<\/title>/);
});

test('Area.html mantém a redução de fotos e os alvos de toque', () => {
  const html = ler(AREA);
  assert.match(html, /LADO_MAX = 1600/);
  assert.match(html, /QUALIDADE = 0\.8/);
  assert.match(html, /MAX_FOTOS = 8/);
  assert.match(html, /min-height: 44px/);
});

test('Area.html salva só o que mudou e avisa quando não há nada', () => {
  const html = ler(AREA);
  assert.match(html, /function camposAlterados\(/);
  assert.match(html, /Nada para salvar\./);
  const salvar = html.slice(html.indexOf("$('btn-salvar').addEventListener"));
  assert.match(salvar.slice(0, salvar.indexOf('}).salvarPeca(')), /camposAlterados\(\)/);
  assert.match(salvar, /salvarPeca\(passe, atual\.codigo, campos\)/);
  // a base de comparação passa a ser a peça devolvida pelo servidor
  assert.match(salvar.slice(0, salvar.indexOf('}).salvarPeca(')), /substituirPeca\(r\.peca\)/);
});

test('Area.html trava botões de foto, Salvar e Nova cor durante o envio ou a exclusão', () => {
  const html = ler(AREA);
  assert.match(html, /\['btn-trocar', 'btn-salvar', 'btn-nova-cor'\]/);
  assert.match(html, /#galeria button, #confirmar-foto button/);
  const apagar = html.slice(html.indexOf('function apagarFotoAtual('), html.indexOf('function semEstoque('));
  assert.match(apagar, /travarFotos\(true\)/);
  const enviar = html.slice(html.indexOf('function enviarDaPeca('), html.indexOf('// ---------- nova peça'));
  assert.match(enviar, /travarFotos\(true\)/);
});

test('Area.html recarrega a lista quando criar ou salvar volta ok sem peca', () => {
  const html = ler(AREA);
  assert.match(html, /if \(!r\.peca\) \{ recarregarComAviso\('aviso-lista'/);
  assert.match(html, /if \(!r\.peca\) \{ liberar\(\); recarregarComAviso\(/);
  assert.match(html, /function recarregarComAviso[\s\S]*carregarLista\(/);
});

test('Area.html tem versão de computador (900px) sem mexer no celular', () => {
  const html = ler(AREA);
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const ini = css.indexOf('@media (min-width: 900px)');
  assert.ok(ini > 0, 'falta @media (min-width: 900px)');
  const fora = css.slice(0, ini);
  const dentro = css.slice(ini);
  assert.match(fora, /max-width: 520px/);
  assert.match(dentro, /max-width: 1100px/);
  assert.match(dentro, /grid-template-columns: repeat\(auto-fill, minmax\(240px, 1fr\)\)/);
  assert.match(dentro, /:focus-visible/);
  assert.match(dentro, /:hover/);
  // o celular não ganha regra nova de grade na lista fora da media query
  assert.doesNotMatch(fora, /auto-fill/);
});

test('Area.html ignora resposta de salvar de outra peça e mantém Salvar travado enquanto salva', () => {
  const html = ler(AREA);
  assert.match(html, /emFotos = false, salvando = false;/);
  assert.match(html, /\$\(id\)\.disabled = emFotos \|\| \(id === 'btn-salvar' && salvando\)/);
  const salvar = html.slice(html.indexOf("$('btn-salvar').addEventListener"), html.indexOf('function substituirPeca('));
  assert.match(salvar, /var enviada = atual\.codigo/);
  assert.match(salvar, /atual\.codigo !== enviada/);
  assert.match(salvar, /substituirPeca\(r\.peca, false\)/);
});
