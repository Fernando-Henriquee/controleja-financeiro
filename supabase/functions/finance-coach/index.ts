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
- diagnosis: 1 frase em PT-BR explicando se esta no vermelho e quanto.
- actions: 3 a 5 acoes objetivas em PT-BR (frases curtas).
- savings_goal: meta de poupanca realista em R$ para o mes (numero).
- category_goals: para cada categoria relevante (use as categorias presentes em gastos_por_categoria), defina um teto de gasto em R$ ate o fim do mes (limite o total a no maximo a sobra disponivel + a poupanca sugerida).
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
          },
          required: ["diagnosis", "actions", "savings_goal", "category_goals"],
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
