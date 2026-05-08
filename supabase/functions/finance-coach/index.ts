import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const snapshot = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const systemPrompt = `Voce e um coach financeiro brasileiro pratico e empatico.
Receba o snapshot financeiro (JSON) e use a ferramenta financial_advice para responder.

- diagnosis: 1-2 frases em PT-BR explicando a situacao do mes (vermelho/amarelo/verde) e quanto.
- actions: 3-5 acoes objetivas em PT-BR (frases curtas).
- savings_goal: meta de poupanca realista em R$ para o mes (0 se nao houver folga).
- category_goals: para cada categoria relevante (use as categorias presentes em gastos_por_categoria), defina um teto em R$ ate o fim do mes.
- payment_plan: lista ordenada de "o que pagar primeiro" com base nas obrigacoes do snapshot.
  * Inclua APENAS itens REAIS do snapshot:
    - Cada item de \`faturas_por_cartao\` com usado > 0 -> kind="invoice", id = nome do cartao, amount = usado.
    - Cada loan implicito em \`emprestimos_mes\` (se existir, agregue como kind="loan" amount=emprestimos_mes).
    - Cada recorrente NAO paga em \`recorrentes\` -> kind="recurring", id = desc, amount = valor.
    - Parcelas de cartao agregadas se \`parcelas_cartao_mes\` > 0 -> kind="installment".
  * Priorize: contas essenciais (luz/agua/aluguel/internet) > emprestimos com juros altos > faturas para evitar rotativo > parcelas > recorrentes nao essenciais.
  * Para cada item: { kind, label (texto curto que o humano reconhece), amount, priority (1=mais urgente), reason (1 frase), risk: "alta"|"media"|"baixa" }.
  * Maximo 8 itens.
Seja direto, sem moralizar.`;

    const tool = {
      type: "function",
      function: {
        name: "financial_advice",
        description: "Conselho financeiro estruturado",
        parameters: {
          type: "object",
          properties: {
            diagnosis: { type: "string" },
            actions: { type: "array", items: { type: "string" } },
            savings_goal: { type: "number" },
            category_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  monthly_cap: { type: "number" },
                },
                required: ["category", "monthly_cap"],
                additionalProperties: false,
              },
            },
            payment_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  kind: { type: "string", enum: ["invoice", "loan", "recurring", "installment", "other"] },
                  label: { type: "string" },
                  amount: { type: "number" },
                  priority: { type: "number" },
                  reason: { type: "string" },
                  risk: { type: "string", enum: ["alta", "media", "baixa"] },
                },
                required: ["kind", "label", "amount", "priority", "reason", "risk"],
                additionalProperties: false,
              },
            },
          },
          required: ["diagnosis", "actions", "savings_goal", "category_goals", "payment_plan"],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Snapshot:\n" + JSON.stringify(snapshot, null, 2) },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "financial_advice" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Muitas requisicoes. Tente em alguns segundos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Creditos do Lovable AI esgotados." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      return new Response(JSON.stringify({ error: "Erro do gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let advice: any = null;
    if (call?.function?.arguments) {
      try { advice = JSON.parse(call.function.arguments); } catch { /* ignore */ }
    }
    if (!advice) {
      return new Response(JSON.stringify({ error: "IA nao retornou conselho estruturado." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(advice.payment_plan)) advice.payment_plan = [];

    return new Response(JSON.stringify(advice), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coach error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
