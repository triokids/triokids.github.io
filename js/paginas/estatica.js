// Páginas de conteúdo fixo (guia de tamanhos, sobre): só cabeçalho, rodapé e gaveta.
import { montarLayout } from '../ui/layout.js';

const principal = document.getElementById('conteudo');
const conteudo = principal.innerHTML;
try {
  await montarLayout({ pagina: document.body.dataset.pagina });
} catch {
  // Sem catálogo o conteúdo fixo continua valendo: o layout trocou o miolo pela mensagem de erro, devolvemos o texto.
  principal.innerHTML = conteudo;
}
