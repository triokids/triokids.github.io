// Carrinho persistido em JSON, com revalidação contra o catálogo atual.

export function encontrarVariante(catalogo, codigo) {
  for (const peca of catalogo.pecas) {
    const variante = peca.variantes.find((x) => x.codigo === codigo);
    if (variante) return { peca, variante };
  }
  return null;
}

function armazenamentoPadrao() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function lerItens(arm, chave) {
  if (!arm) return [];
  try {
    const lista = JSON.parse(arm.getItem(chave));
    if (!Array.isArray(lista)) return [];
    return lista.filter((i) => i && typeof i.codigo === 'string' && typeof i.tamanho === 'string'
      && Number.isInteger(i.quantidade) && i.quantidade > 0 && Number.isFinite(i.precoVisto));
  } catch {
    return [];
  }
}

export function criarCarrinho(armazenamento, chave) {
  const arm = armazenamento === undefined ? armazenamentoPadrao() : armazenamento;
  let lista = lerItens(arm, chave);
  const ouvintes = [];

  function persistir() {
    if (arm) {
      try { arm.setItem(chave, JSON.stringify(lista)); } catch { /* segue só em memória */ }
    }
    ouvintes.forEach((fn) => fn());
  }
  const achar = (codigo, tamanho) => lista.find((i) => i.codigo === codigo && i.tamanho === tamanho);

  return {
    itens: () => lista.map((i) => ({ ...i })),

    adicionar(codigo, tamanho, qtd, catalogo) {
      const achado = encontrarVariante(catalogo, codigo);
      if (!achado || !Object.hasOwn(achado.variante.estoque, tamanho)) return { ok: false, motivo: 'sem-tamanho' };
      const estoque = achado.variante.estoque[tamanho];
      if (estoque <= 0) return { ok: false, motivo: 'esgotado' };
      const existente = achar(codigo, tamanho);
      const desejado = (existente ? existente.quantidade : 0) + Math.max(1, Math.floor(qtd) || 1);
      const final = Math.min(desejado, estoque);
      if (existente) {
        existente.quantidade = final;
        existente.precoVisto = achado.variante.preco;
      } else {
        lista.push({ codigo, tamanho, quantidade: final, precoVisto: achado.variante.preco });
      }
      persistir();
      return final < desejado ? { ok: false, motivo: 'limite' } : { ok: true };
    },

    alterar(codigo, tamanho, qtd, catalogo) {
      const existente = achar(codigo, tamanho);
      if (!existente) return;
      if (!(qtd > 0)) {
        lista = lista.filter((i) => i !== existente);
      } else {
        const achado = encontrarVariante(catalogo, codigo);
        const estoque = achado ? achado.variante.estoque[tamanho] : undefined;
        const q = Math.floor(qtd);
        existente.quantidade = Number.isFinite(estoque) ? Math.min(q, estoque) : q;
      }
      persistir();
    },

    remover(codigo, tamanho) {
      lista = lista.filter((i) => !(i.codigo === codigo && i.tamanho === tamanho));
      persistir();
    },

    limpar() {
      lista = [];
      persistir();
    },

    aoMudar(fn) { ouvintes.push(fn); },
  };
}

// Pura: não grava nada. Prioridade: removida > esgotado > reduzido > preco-mudou > ok.
export function revalidarItens(itens, catalogo) {
  return itens.map((item) => {
    const achado = encontrarVariante(catalogo, item.codigo);
    if (!achado || !Object.hasOwn(achado.variante.estoque, item.tamanho)) {
      return { ...item, situacao: 'removida' };
    }
    const { peca, variante } = achado;
    const estoque = variante.estoque[item.tamanho];
    const base = { ...item, peca, variante, precoUnit: variante.preco };
    if (estoque <= 0) return { ...base, situacao: 'esgotado' };
    if (item.quantidade > estoque) return { ...base, quantidade: estoque, situacao: 'reduzido' };
    if (item.precoVisto !== variante.preco) return { ...base, situacao: 'preco-mudou' };
    return { ...base, situacao: 'ok' };
  });
}

export function totalDosItens(itensRevalidados) {
  const centavos = itensRevalidados
    .filter((i) => ['ok', 'reduzido', 'preco-mudou'].includes(i.situacao))
    .reduce((s, i) => s + Math.round(i.precoUnit * 100) * i.quantidade, 0);
  return centavos / 100;
}
