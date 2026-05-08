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
Voce conversa em PT-BR, com respostas curtas (3-6 frases), sem moralizar.
Use o snapshot financeiro abaixo como contexto real do usuario para responder perguntas como:
- "o que pago primeiro?" -> priorize: contas essenciais (luz, agua, aluguel) > emprestimos com juros altos > fatura cartao (evite rotativo) > parcelas > recorrentes nao essenciais.
- "posso passar no credito?" -> avalie se a fatura atual ja esta alta vs limite, e se ele consegue pagar a vista no proximo mes. Se nao, evite.
- "deixo atrasar?" -> compare o juro do atraso (cartao ~14% a.m. / boleto multa 2% + juros) com alternativas.
- "como economizo?" -> aponte categorias com maior gasto.
Sempre cite numeros do snapshot quando relevante (em R$). Seja honesto: se ele esta no vermelho, diga.`;

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
