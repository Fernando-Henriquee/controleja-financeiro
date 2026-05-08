import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, snapshot } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const systemPrompt = `Voce e um coach financeiro brasileiro pratico, direto e empatico.
Voce conversa em PT-BR com respostas curtas (3-6 frases), sem moralizar. Use **markdown** (negrito, listas).

Use o snapshot financeiro como contexto REAL para responder perguntas como:
- "o que pago primeiro?" -> priorize: contas essenciais (luz, agua, aluguel, internet) > emprestimos com juros altos > fatura cartao (evite rotativo ~14% a.m.) > parcelas > recorrentes nao essenciais.
- "posso passar no credito?" -> compare \`faturas_por_cartao.usado / limite\`. Se >70%, evite. Se ele nao tem como pagar a vista no mes seguinte, evite.
- "deixo atrasar?" -> juros estimados: cartao ~14% a.m., boleto multa 2% + ~1% a.m. Compare com alternativas.
- "como economizo?" -> aponte top 2 categorias em \`gastos_por_categoria\`.

REGRA OBRIGATORIA DE FORMATO:
Sempre encerre a resposta com um bloco markdown delimitado, citando NUMEROS do snapshot que justificam a recomendacao:

---
**Por que:**
- Receita prevista: R$ X
- Faturas abertas: R$ Y (use ~14% a.m. de juro se rotativo)
- Sobra disponivel hoje: R$ Z
- Impacto no limite diario: de R$ A para R$ B (variacao de R$ W)

Use os numeros REAIS do snapshot (nao invente). Se algum nao se aplica, omita aquela linha.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: "Snapshot financeiro do usuario:\n" + JSON.stringify(snapshot, null, 2) },
          ...messages,
        ],
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
