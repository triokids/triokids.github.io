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
