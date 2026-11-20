// Comportamento da busca no cabeçalho: sugestões ao digitar e navegação pelo teclado.
import { sugerir } from '../loja/busca.js';
import { htmlSugestoes } from './html.js';

export function ligarBusca({ getCatalogo }) {
  const campo = document.getElementById('busca-campo');
  const lista = document.getElementById('busca-sugestoes');
  if (!campo || !lista) return;
  const form = campo.form;
  let ativa = -1;

  const opcoes = () => [...lista.querySelectorAll('li[role="option"]')];

  function fechar() {
    lista.hidden = true;
    lista.innerHTML = '';
    ativa = -1;
    campo.setAttribute('aria-expanded', 'false');
    campo.removeAttribute('aria-activedescendant');
  }

  function marcar(i) {
    const itens = opcoes();
    itens.forEach((li) => li.classList.remove('ativa'));
    ativa = i;
    if (i < 0 || !itens[i]) { campo.removeAttribute('aria-activedescendant'); return; }
    itens[i].classList.add('ativa');
    campo.setAttribute('aria-activedescendant', itens[i].id);
  }

  function desenhar() {
    const termo = campo.value.trim();
    const html = htmlSugestoes(sugerir(getCatalogo().pecas, termo), termo);
    if (!html) { fechar(); return; }
    lista.innerHTML = html;
    lista.hidden = false;
    ativa = -1;
    campo.setAttribute('aria-expanded', 'true');
    campo.removeAttribute('aria-activedescendant');
  }

  campo.addEventListener('input', desenhar);
  campo.addEventListener('keydown', (e) => {
    const n = opcoes().length;
    if (e.key === 'Escape') { fechar(); return; }
    if (!n) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcar((ativa + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar(ativa <= 0 ? n - 1 : ativa - 1); }
    else if (e.key === 'Enter' && ativa >= 0) {
      e.preventDefault();
      const link = opcoes()[ativa].querySelector('a');
      if (link) location.href = link.href;
    }
  });
  document.addEventListener('click', (e) => { if (!form.contains(e.target)) fechar(); });
}
