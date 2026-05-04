import type { AppState, Expense, PaymentMethod } from "./types";

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: ["almoço", "almoco", "jantar", "café", "cafe", "lanche", "comida", "ifood", "rappi", "restaurante", "padaria", "mercado", "supermercado"],
  Transporte: ["uber", "99", "gasolina", "combustível", "combustivel", "estacionamento", "ônibus", "onibus", "metro", "metrô", "passagem"],
  Lazer: ["cinema", "bar", "show", "balada", "netflix", "spotify", "jogo", "game", "viagem"],
  Saúde: ["farmácia", "farmacia", "remédio", "remedio", "médico", "medico", "consulta", "academia", "gym"],
  Moradia: ["aluguel", "luz", "água", "agua", "internet", "condomínio", "condominio", "gás", "gas"],
  Compras: ["roupa", "tênis", "tenis", "amazon", "shopee", "mercado livre", "presente"],
  Outros: [],
};

const METHOD_KEYWORDS: Record<PaymentMethod, string[]> = {
  credit: ["credito", "crédito", "credit", "cartão", "cartao", "cc"],
  debit: ["debito", "débito", "debit"],
  pix: ["pix"],
  cash: ["dinheiro", "cash", "espécie", "especie"],
};

export function parseExpense(input: string, accounts: AppState["accounts"]): Omit<Expense, "id" | "date"> | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // amount: first number (allow comma/dot)
  const amountMatch = text.match(/(\d+[.,]?\d*)/);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(",", "."));
  if (!isFinite(amount) || amount <= 0) return null;

  // method
  let method: PaymentMethod = "debit";
  for (const [m, kws] of Object.entries(METHOD_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) { method = m as PaymentMethod; break; }
  }

  // account
  let accountId = accounts[0]?.id ?? "itau";
  for (const a of accounts) {
    const n = a.name.toLowerCase().replace(/\s+/g, "");
    if (text.includes(n) || text.includes(a.name.toLowerCase().split(" ")[0])) {
      accountId = a.id;
      break;
    }
  }

  // category
  let category = "Outros";
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    if (kws.some(k => text.includes(k))) { category = cat; break; }
  }

  // description = remove number and keep rest
  const description = input.replace(amountMatch[0], "").trim() || category;

  return { amount, description, category, method, accountId, raw: input };
}
