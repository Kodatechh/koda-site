export const KODABOT_LAUNCH_AT = "2026-10-17T00:00:00-03:00";
export const KODABOT_PREORDER_PRICE_CENTS = 9990;
export const KODABOT_REGULAR_PRICE_CENTS = 12990;

export function getKodaBotOffer(now = Date.now()) {
  const preorder = now < Date.parse(KODABOT_LAUNCH_AT);
  return {
    preorder,
    priceCents: preorder ? KODABOT_PREORDER_PRICE_CENTS : KODABOT_REGULAR_PRICE_CENTS,
    label: preorder ? "Pré-venda" : "Disponível",
  };
}

export function formatReleasePrice(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
