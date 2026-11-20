import { montarLayout } from '../ui/layout.js';
import { htmlCampanha } from '../ui/html.js';

try {
  const { catalogo } = await montarLayout({ pagina: 'abraca' });
  document.getElementById('conteudo').innerHTML = htmlCampanha(catalogo.campanha, catalogo.config.descontoCampanha);
} catch {
  // montarLayout já mostrou a mensagem de erro e o botão do WhatsApp.
}
