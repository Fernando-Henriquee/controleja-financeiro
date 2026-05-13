# Plano financeiro

## ✅ Fase 1 — Ciclo financeiro
- `cycle_start_day` no perfil (1–28). Editável na sidebar.
- Helpers de ciclo em `src/lib/finance.ts` (`cycleKeyForDate`, `cycleRange`, `cycleDateRange`, `shiftCycleKey`, `cycleLabel`).
- Telas usam o ciclo configurado.

## ✅ Fase 2 — Faturas como entidade
- Tabela `card_invoices` (uma fatura por cartão por ciclo).
- `closing_day` / `due_day` opcionais por cartão (default = ciclo do perfil).
- Toda compra no crédito é vinculada à fatura aberta do ciclo correspondente (`expenses.invoice_id`).
- `payInvoice(invoiceId, fromDebitId?)`: marca paga, debita conta escolhida, gera lançamento histórico.
- `BankInvoices` mostra período, vencimento, status (Aberta/Fechada/Paga) e botão "Marcar como paga".
- `credit_used` continua sendo espelho para retro-compat.

## Próximo
- Fase 3: toggle "Atual | Próximo ciclo" + saldo livre.
- Fase 4: FAB global + atalho `N` + 1-clique pagar fatura no card de banco.
- Fase 5: linha do tempo do ciclo + recorrentes individuais agendadas.
