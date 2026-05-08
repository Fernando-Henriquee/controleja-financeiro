## Objetivo

Reorganizar a Receita para refletir que sua renda PJ varia mês a mês (horas reais), permitir escolher em qual conta o dinheiro entra e habilitar cheque especial nas contas de débito.

---

## 1. Renda PJ por mês (snapshot mensal)

Hoje a tabela `income_records` já guarda renda **por mês** (`month_key`), mas a UI sempre edita o mês selecionado e nunca propaga para o futuro. Vou mudar o comportamento:

- **Editar o mês atual ou um mês passado** → salva apenas naquele mês (não sobrescreve outros).
- **Editar e marcar "aplicar nos próximos meses"** (default ligado quando o mês editado é o atual) → grava o mesmo registro do mês selecionado até dezembro do ano corrente, **sem tocar em meses anteriores já registrados**.
- Meses passados sem registro continuam usando o último snapshot conhecido (comportamento atual de fallback), mas a UI deixa explícito: "este mês ainda não tem registro próprio".

Resultado: você atualiza no início de cada mês as horas reais, e os meses futuros já entram com o novo valor automaticamente, sem alterar histórico.

---

## 2. Novo campo "Horas trabalhadas no mês"

- Adicionar coluna `worked_hours` em `income_records` (default = `working_days * 8`).
- Em `IncomeSheet` no modo PJ:
  - Mostrar `valor hora`, `dias úteis (auto)` e `horas trabalhadas (editável)`.
  - Cálculo PJ passa de `hourly_rate × 8 × working_days` para `hourly_rate × worked_hours`.
  - Texto auxiliar: "Padrão: dias úteis × 8h. Edite para refletir suas horas reais do mês."
- `expectedMonthlyIncome()` em `src/lib/finance.ts` passa a usar `worked_hours` quando presente.
- Campo "Extras (PIX e avulsos)" continua igual.

---

## 3. Conta destino da renda

- Adicionar coluna `deposit_account_id uuid` em `income_records` (nullable).
- No `IncomeSheet`, novo seletor "Cair em qual conta?" listando contas de débito do perfil.
- Quando definido, o valor previsto da renda é exibido como crédito esperado naquela conta (apenas informativo no card da conta — sem mexer em saldo automaticamente, para não duplicar lançamentos).
- Persistido por mês: você pode mudar de conta destino mês a mês.

---

## 4. Cheque especial em contas de débito

- Adicionar coluna `overdraft_limit numeric` (nullable, default null) em `accounts`.
- Em `AccountsList` (form de débito), novo campo opcional "Cheque especial (R$)".
- No card da conta de débito:
  - Se houver `overdraft_limit > 0`, mostrar barra "Cheque especial usado" quando `balance < 0`, com `usado = min(|balance|, overdraft_limit)` e cor de severidade (warning > 50%, danger > 85%).
  - Saldo disponível para limite diário passa a considerar `balance + overdraft_limit` para contas de débito que tenham cheque especial habilitado.
- Atualizar `src/lib/finance.ts` (cálculo do limite diário e `monthPlan`) para somar `overdraft_limit` ao caixa disponível por conta de débito.

---

## Detalhes técnicos

**Migração SQL (uma única):**

```sql
ALTER TABLE public.income_records ADD COLUMN worked_hours numeric;
ALTER TABLE public.income_records ADD COLUMN deposit_account_id uuid;
ALTER TABLE public.accounts ADD COLUMN overdraft_limit numeric;
```

**Tipos (`src/lib/types.ts`):**

- `Income` ganha `worked_hours?: number` e `deposit_account_id?: string | null`.
- `Account` ganha `overdraft_limit?: number | null`.

**Store (`src/lib/store.tsx`):**

- `loadIncomeForMonth` lê `worked_hours` e `deposit_account_id`.
- `updateIncome({...}, { applyToFuture: boolean })`: quando `applyToFuture=true` e `month_key >= currentMonth`, faz upsert em batch para todos os meses do mês selecionado até dezembro do ano.
- `updateAccount` aceita `overdraft_limit`.

**UI:**

- `IncomeSheet.tsx`: toggle "Aplicar nos próximos meses" (default on quando edita mês atual ou futuro), campo `worked_hours`, seletor `deposit_account_id`.
- `AccountsList.tsx`: campo `overdraft_limit` no formulário de conta débito; barra de cheque especial no card.
- `DailyLimitCard.tsx` / `monthPlan.ts`: incluir `overdraft_limit` no caixa disponível.

**Sem mudança visual fora dos pontos acima** — mantemos o redesign já feito do hero, calendário, etc.

&nbsp;

o cheque especial deve ser inserido no gerenciamento de cartoes, e em todos os lugares, gerenciamento de cartao, contas, emprestimos, gastos todos devem ter lugar onde editar, valor, banco, categoria tudo