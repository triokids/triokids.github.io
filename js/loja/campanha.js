// Preço com desconto de campanha, arredondado a centavos.
export function precoComCampanha(preco, pct) {
  return Math.round(Math.round(preco * 100) * (100 - pct) / 100) / 100;
}
