
## Fase 1 — Coach IA mais útil e persistente

### 1.1 Histórico de conversas por perfil + mês
- Nova tabela `coach_conversations`:
  - `id uuid pk`, `profile_id uuid`, `month_key text`, `messages jsonb` (array `{role, content, created_at}`), `updated_at timestamptz`.
  - RLS via `is_profile_owner(profile_id)` (mesma política das outras tabelas).
  - Índice único `(profile_id, month_key)` — uma thread por mês.
- Em `FinanceCoach.tsx`:
  - Ao montar / quando muda `activeProfile` ou `selectedMonth`, faz `select` da thread e popula `chat`.
  - Após cada mensagem completa (user + assistant final), faz `upsert` da thread.
  - Botão pequeno "Limpar conversa" (delete da row).
- Mantém streaming atual; só persiste quando assistente termina.

### 1.2 Lista "O que pagar primeiro" acionável
- Edge function `finance-chat` ganha um segundo modo: além do streaming livre, quando o usuário aciona o botão **"Gerar plano de pagamento"**, chamamos `finance-coach` (não-stream) com prompt que retorna JSON adicional:
  ```
  payment_plan: [
    { id, kind: "invoice"|"loan"|"recurring"|"installment",
      account_id?, recurring_id?, label, amount,
      priority: 1..n, reason, risk: "alta"|"media"|"baixa" }
  ]
  ```
- Novo componente `PaymentQueue.tsx` dentro do Coach (aba "Plano"):
  - Renderiza cards ordenados por prioridade com motivo curto + valor + selo de risco.
  - Botão **"Marcar como pago"** por item:
    - invoice → chama `payCreditInvoice(accountId)` já existente.
    - recurring → marca `paid_months` no `recurring_rules`.
    - loan → incrementa `paid_installments` e debita parcela do saldo escolhido.
    - installment → incrementa `paid_installments`.
  - Item desaparece (ou ganha check) e o snapshot recalcula → o limite diário se atualiza.

### 1.3 Resumo numérico que justifica a recomendação
- No edge `finance-chat`, reforçar o system prompt para SEMPRE terminar uma resposta com bloco markdown:
  ```
  ---
  **Por que:**
  - Receita prevista: R$ X
  - Faturas abertas: R$ Y
  - Sobra hoje: R$ Z
  - Impacto no limite diário: −R$ W (de R$ A → R$ B)
  ```
- Helper no client calcula "impacto no limite diário" de cada ação sugerida e o injeta no `snapshot.contexto_extra` enviado ao chat (juros estimados de fatura rotativa = `usado * 0.12` mensal como heurística declarada).
- Render do chat passa a usar `react-markdown` (já é prática recomendada) para o bloco "Por que" ficar tabulado.

---

## Fase 2 — Redesign UI/UX da Home (hero-first)

### 2.1 Nova arquitetura de seções (ordem em mobile e desktop)
```
HERO — Saúde do mês (full width, destaque máximo)
INTELIGÊNCIA — Insights + Coach (alertas + acesso ao chat)
CONTAS E CARTÕES — Cartões com severidade + saldos
PLANEJAMENTO — Calendário compacto + automações + renda
ÚLTIMOS GASTOS — entrada rápida + lista
```
- Em desktop ≥lg: HERO ocupa 12 colunas; abaixo, grid 7/5 só para INTELIGÊNCIA + CONTAS; demais seções viram full-width empilhado para dar respiro.

### 2.2 Novo componente `MonthHeroCard.tsx`
- Conteúdo:
  - Label: "Saúde de {mês}"
  - Número grande (font-display, ~5xl): **Sobra projetada do mês**
  - Sub-row em 3 colunas: Receita prevista · Gastos previstos · Status (badge ✅ Saudável / ⚠ Atenção / 🔴 Risco)
  - Rodapé discreto: "Limite diário seguro: R$ X · ~R$ Y/dia restantes"
- Fundo: gradient sutil reaproveitando `--gradient-primary`/`--gradient-surface`; borda fina; shadow-elegant.
- Responsivo: empilha sub-row em mobile.

### 2.3 `DailyLimitCard` rebaixado
- Vira `DailyLimitInline` (compacto): uma linha no rodapé do hero + um expansor "Ver detalhamento" que abre em sheet/drawer todo o conteúdo atual (breakdown + simulação). Lógica preservada, só muda a casca.

### 2.4 `MonthCalendar` compacto
- Reduzir altura, padding e bordas; toggle expand/collapse com `Collapsible` shadcn. Default: colapsado mostrando só "próximos 5 vencimentos".

### 2.5 `BankInvoices` com severidade
- Barra de utilização ganha cores: <60% safe, 60-85% warn, >85% danger (já temos tokens `--status-*`).
- Cartões em estado crítico ganham borda colorida sutil + chip "Próximo do limite".

### 2.6 Seção "Inteligência financeira"
- Wrapper que junta `BehaviorAlerts` + `FinanceCoach` num grupo só, com headline "Inteligência" e subcopy curto. Insights ganham ícones consistentes (lucide) + tom amigável.

### 2.7 Tipografia + respiro
- `index.css`: aumentar contraste de `--muted-foreground` em ~5-8%; criar utility classes `text-display-xl`, `text-display-lg`.
- Aumentar `space-y` entre seções de `5` → `8` em `Index.tsx`.
- Headers de seção em uppercase tracking — manter, mas aumentar margem inferior.

### 2.8 Itens NÃO alterados
- Cores base, fontes, identidade, lógica financeira, store, edge functions (exceto as já citadas em 1.x).

---

## Detalhes técnicos

**Migração SQL (1.1):**
```sql
create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  month_key text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (profile_id, month_key)
);
alter table public.coach_conversations enable row level security;
create policy coach_conv_select on public.coach_conversations for select to authenticated using (is_profile_owner(profile_id));
create policy coach_conv_insert on public.coach_conversations for insert to authenticated with check (is_profile_owner(profile_id));
create policy coach_conv_update on public.coach_conversations for update to authenticated using (is_profile_owner(profile_id)) with check (is_profile_owner(profile_id));
create policy coach_conv_delete on public.coach_conversations for delete to authenticated using (is_profile_owner(profile_id));
```

**Dependência nova:** `react-markdown` (leve, já recomendado para chats).

**Arquivos tocados (estimado):**
- novos: `src/components/MonthHeroCard.tsx`, `src/components/PaymentQueue.tsx`, `src/components/IntelligenceSection.tsx`
- editados: `src/components/FinanceCoach.tsx`, `src/components/DailyLimitCard.tsx`, `src/components/MonthCalendar.tsx`, `src/components/BankInvoices.tsx`, `src/pages/Index.tsx`, `src/index.css`, `supabase/functions/finance-chat/index.ts`, `supabase/functions/finance-coach/index.ts`

**Ordem de execução:** 1.1 → 1.2 → 1.3 → 2.1/2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7. Cada fase é independente e pode ser revisada antes de avançar.

Posso começar pela Fase 1 inteira e depois ir pra Fase 2, ou prefere que eu faça redesign primeiro?
