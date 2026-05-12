Vou aplicar em **fases** porque o conjunto é grande e cada fase precisa ser validada antes da próxima — senão quebra dados existentes. Começo pelas duas que mudam a base do app.

## Fase 1 — Ciclo financeiro (base de tudo)

**O que muda:**
- Novo campo no perfil: `cycle_start_day` (1–28, default 1 = comportamento atual; você vai setar 11).
- Toda a lógica de "mês" passa a usar **ciclo**: ex. ciclo "Mai/26" = 11/05 a 10/06.
- `MonthSelector`, `MonthHeroCard`, `StatsGrid`, `Dashboard`, `MonthCalendar`, `RecentExpenses`, recorrentes, faturas — tudo agrupa por ciclo, não por mês de calendário.
- Label do seletor mostra ambos: "Ciclo Mai (11/05 → 10/06)".
- Lançamentos futuros (`is_pending`) continuam como hoje, mas alocados no ciclo correto.

**Por que primeiro:** sem isso, "paguei fatura de abril em maio" continua confuso. Com isso, o registro do dia 10 já cai no ciclo certo automaticamente.

## Fase 2 — Faturas como entidade própria

**O que muda:**
- Nova tabela `card_invoices`: uma fatura por cartão por ciclo, com `period_start`, `period_end`, `due_date`, `total`, `status` (`open` | `closed` | `paid`), `paid_from_account_id`.
- Toda compra no crédito é vinculada à fatura aberta do cartão naquele ciclo.
- Quando fecha o ciclo: fatura vira `closed` e é criada uma despesa programada (`is_pending`) na conta de débito de pagamento, com data = vencimento.
- Card do banco em `BankInvoices` mostra: período, valor, vencimento, botão **"Marcar como paga"** (1 clique).
- Compras futuras no crédito não somam mais no `credit_used` direto — somam na fatura.

## Fase 3 — Visão "Próximo ciclo" + Saldo livre

- Toggle no topo: **Atual | Próximo**.
- No próximo ciclo: renda prevista + faturas que vão vencer + recorrentes + agendados + **saldo projetado no fim**.
- `MonthHeroCard` mostra dois números: **Saldo total** e **Saldo livre** (= saldo − tudo que já tem dono no ciclo).

## Fase 4 — Registro rápido (FAB global + atalho)

- Botão flutuante "+" presente em todas as páginas.
- Atalho `N` abre modal com `FastInput` + form em campos.
- Ação "Pagar fatura" de 1 clique nos cards de banco.

## Fase 5 — Polimentos

- Linha do tempo do ciclo (barra horizontal: hoje, próxima renda, vencimentos).
- Notificação "X lançamentos vão debitar hoje".
- Recorrentes aparecem como linhas individuais programadas no ciclo.

---

## Detalhes técnicos (fase 1 e 2)

**Migrações:**
```sql
-- Fase 1
ALTER TABLE profiles ADD COLUMN cycle_start_day INT NOT NULL DEFAULT 1
  CHECK (cycle_start_day BETWEEN 1 AND 28);

-- Fase 2
CREATE TABLE card_invoices (
  id UUID PK,
  profile_id UUID,
  account_id UUID,           -- cartão (kind=credit)
  cycle_key TEXT,            -- ex "2026-05"
  period_start DATE,
  period_end DATE,
  due_date DATE,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',   -- open | closed | paid
  paid_from_account_id UUID,    -- conta débito
  paid_at TIMESTAMPTZ
);
ALTER TABLE expenses ADD COLUMN invoice_id UUID;
```

**Helper novo em `src/lib/finance.ts`:**
- `cycleKeyForDate(date, startDay)`
- `cycleRange(cycleKey, startDay)` → `{start, end}`
- `cycleLabel(cycleKey, startDay)`
- substitui usos de `monthKey` em telas, mantém `monthKey` só para compat de dados antigos.

**Compatibilidade:**
- Perfis existentes ficam com `cycle_start_day=1` (comportamento idêntico ao atual).
- Você muda pra 11 nas configs do perfil quando quiser.
- Despesas antigas continuam funcionando — são re-agrupadas por ciclo na hora de exibir.

---

## Proposta

Aplico **Fase 1 + Fase 2 agora** (a base). Depois você valida e seguimos pras 3, 4, 5.

Confirma?