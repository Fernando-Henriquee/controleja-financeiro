import type { Account, Expense, ExpensePattern, PaymentMethod } from "./types";

export type SmartSuggestion = {
  label: string;
  fillText: string;
  confidence: number;
};

export interface SuggestionProvider {
  suggest(input: string, expenses: Expense[], accounts: Account[], patterns: ExpensePattern[]): SmartSuggestion[];
}

const KNOWN_CATEGORIES = [
  "almoço",
  "almoco",
  "gasolina",
  "uber",
  "mercado",
  "ifood",
  "farmacia",
  "farmácia",
  "luz",
  "internet",
];

function normalize(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractDescription(input: string): string {
  return normalize(input)
    .replace(/\d+[.,]?\d*/g, "")
    .replace(/\b(credito|credit|debito|debit|pix|dinheiro|cash)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectMethod(raw: string): PaymentMethod | null {
  const n = normalize(raw);
  if (/\b(credito|credit|cartao|cartão|cc)\b/.test(n)) return "credit";
  if (/\b(debito|debit)\b/.test(n)) return "debit";
  if (/\bpix\b/.test(n)) return "pix";
  if (/\b(dinheiro|cash)\b/.test(n)) return "cash";
  return null;
}

function humanMethod(method: PaymentMethod): string {
  if (method === "credit") return "credito";
  if (method === "debit") return "debito";
  if (method === "pix") return "pix";
  return "dinheiro";
}

function accountToken(name: string): string {
  const first = normalize(name).split(" ")[0];
  return first || normalize(name);
}

class LocalHistorySuggestionProvider implements SuggestionProvider {
  suggest(input: string, expenses: Expense[], accounts: Account[], patterns: ExpensePattern[]): SmartSuggestion[] {
    const cleanInput = input.trim();
    if (!cleanInput) return [];

    const amountMatch = cleanInput.match(/(\d+[.,]?\d*)/);
    const amount = amountMatch ? amountMatch[1].replace(",", ".") : "";
    const description = extractDescription(cleanInput);
    const typedMethod = detectMethod(cleanInput);
    const baseNeedle = description || normalize(cleanInput);

    const ranked = new Map<string, { description: string; method: PaymentMethod; account_id: string; count: number }>();

    for (const exp of expenses) {
      const expDesc = normalize(exp.description);
      if (!expDesc) continue;
      const categoryMatch = KNOWN_CATEGORIES.some((k) => baseNeedle.includes(k) && expDesc.includes(k));
      const textMatch = baseNeedle.length >= 2 && expDesc.includes(baseNeedle);
      if (!categoryMatch && !textMatch) continue;
      if (typedMethod && exp.method !== typedMethod) continue;

      const key = `${expDesc}|${exp.method}|${exp.account_id}`;
      const current = ranked.get(key);
      if (current) {
        current.count += 1;
      } else {
        ranked.set(key, {
          description: exp.description,
          method: exp.method,
          account_id: exp.account_id,
          count: 1,
        });
      }
    }

    const top = [...ranked.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const patternMatches = patterns
      .filter((p) => normalize(p.pattern).includes(baseNeedle))
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 2)
      .map((p) => ({
        description: p.pattern,
        method: p.method,
        account_id: p.account_id,
        count: Math.max(1, p.use_count),
      }));

    return [...patternMatches, ...top].slice(0, 4).map((entry) => {
      const account = accounts.find((a) => a.id === entry.account_id);
      const accountName = account ? accountToken(account.name) : "itau";
      const fillText = `${amount || "0"} ${entry.description} ${humanMethod(entry.method)} ${accountName}`.trim();
      return {
        label: `${entry.description} -> ${account?.name ?? "Conta"} ${humanMethod(entry.method)}`,
        fillText,
        confidence: Math.min(0.99, 0.5 + entry.count * 0.1),
      };
    });
  }
}

export const localSuggestionProvider: SuggestionProvider = new LocalHistorySuggestionProvider();
