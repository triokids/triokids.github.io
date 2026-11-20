// Guia de tamanhos: layout da página fixa + calculadora de tamanho.
import { montarLayout } from '../ui/layout.js';
import { CONFIG } from '../../config.js';
import { IDADES, recomendarTamanho, tamanhosNoCatalogo } from '../loja/tamanho.js';
import { filtrosParaUrl } from '../loja/filtros-url.js';
import { linkWhatsApp } from '../loja/whatsapp.js';

const principal = document.getElementById('conteudo');
const conteudo = principal.innerHTML;
try {
  await montarLayout({ pagina: document.body.dataset.pagina });
} catch {
  // Sem catálogo o conteúdo fixo continua valendo: o layout trocou o miolo pela mensagem de erro, devolvemos o texto.
  principal.innerHTML = conteudo;
}

// Liga a calculadora depois do layout (o catch acima recria o HTML).
const $ = (id) => document.getElementById(id);
const form = $('calc-form');
const estatura = $('calc-estatura');
const idade = $('calc-idade');
const erro = $('calc-erro');
const resultado = $('calc-resultado');

for (const o of IDADES) idade.add(new Option(o.rotulo, o.valor));

function nota(texto) {
  const li = document.createElement('li');
  li.textContent = texto;
  return li;
}

function mostrarErro(mensagem) {
  erro.textContent = mensagem;
  erro.hidden = false;
  resultado.hidden = true;
  estatura.setAttribute('aria-invalid', 'true');
  estatura.focus();
}

function mostrar(r) {
  erro.hidden = true;
  estatura.removeAttribute('aria-invalid');
  const notas = $('calc-notas');
  notas.replaceChildren();
  $('calc-tamanho').textContent = r.tamanho;
  $('calc-tamanho').classList.toggle('calc-selo-duplo', r.tamanho.includes('/'));
  const acoes = $('calc-acoes');
  acoes.replaceChildren();
  const nome = r.tamanho.replace('/', ' ou ');
  let pergunta;

  if (r.tipo === 'acima') {
    $('calc-res-titulo').textContent = 'Acima da nossa grade';
    $('calc-res-sub').textContent = `O tamanho 06 vai até ${r.ate} cm. Fale com a gente antes de comprar: algumas peças vestem mais folgadas.`;
    pergunta = `Olá, ${CONFIG.vendedora}! Minha criança tem ${r.estatura} cm. Tem alguma peça que serve?`;
  } else {
    $('calc-res-titulo').textContent = `Tamanho recomendado: ${nome}`;
    $('calc-res-sub').textContent = `Idade de referência: ${r.idadeReferencia}.`;
    notas.append(nota(`Pela estatura (${r.estatura} cm), o tamanho é ${nome}, que vai até ${r.ate} cm.`));
    if (r.proximo) {
      notas.append(nota(`Está bem perto do limite do ${nome}. Se quiser que a peça dure mais, o ${r.proximo.replace('/', ' ou ')} também é uma boa escolha.`));
    } else {
      notas.append(nota(`Sobram ${String(r.folga).replace('.', ',')} cm de folga para crescer.`));
    }
    if (r.pelaIdade) {
      notas.append(nota(`Pela idade seria o ${r.pelaIdade.replace('/', ' ou ')}, mas quem decide é a estatura: crianças da mesma idade têm alturas diferentes.`));
    }
    if (r.tamanho.includes('/')) {
      notas.append(nota('Os tamanhos 3 e 4 têm a mesma medida: escolha pela peça que você gostar mais.'));
    }
    for (const t of tamanhosNoCatalogo(r.tamanho)) {
      const a = document.createElement('a');
      a.className = 'botao';
      a.href = `catalogo.html${filtrosParaUrl({ tamanho: t })}`;
      a.textContent = `Ver peças no tamanho ${t}`;
      acoes.append(a);
    }
    pergunta = `Olá, ${CONFIG.vendedora}! Minha criança tem ${r.estatura} cm e a calculadora do site indicou o tamanho ${nome}. Pode me ajudar a confirmar?`;
  }
  $('calc-whats').href = linkWhatsApp(CONFIG.whatsapp, pergunta);
  resultado.hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const r = recomendarTamanho({ estatura: estatura.value, idade: idade.value });
  if (r.tipo === 'erro') mostrarErro(r.mensagem);
  else mostrar(r);
});
