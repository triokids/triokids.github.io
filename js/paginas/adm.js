// adm.html: atalho fácil para a Área Adm (Google Apps Script). Só redireciona; a senha é pedida lá.
import { CONFIG } from '../../config.js';

// Devolve o endereço se for um aplicativo do Apps Script (https://script.google.com/...), senão null.
export function destinoAdm(url) {
  const texto = String(url ?? '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(texto) ? texto : null;
}

if (typeof document !== 'undefined') {
  const destino = destinoAdm(CONFIG.urlAdm);
  if (destino) {
    window.location.replace(destino);
  } else {
    document.getElementById('mensagem').textContent =
      'A Área Adm ainda não foi configurada. Avise o dono (campo urlAdm do config.js).';
  }
}
