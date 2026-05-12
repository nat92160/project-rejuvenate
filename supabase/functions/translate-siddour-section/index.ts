const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function stripHtmlAndNikud(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const hebrew: unknown = body?.hebrew;
    const sectionTitle: string = typeof body?.title === 'string' ? body.title : 'Prière';

    if (!Array.isArray(hebrew) || hebrew.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Champ "hebrew" (array) requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Préparer les versets nettoyés, en gardant les indices originaux
    type Item = { i: number; raw: string; clean: string };
    const items: Item[] = (hebrew as string[]).map((raw, i) => ({
      i,
      raw: typeof raw === 'string' ? raw : '',
      clean: stripHtmlAndNikud(typeof raw === 'string' ? raw : ''),
    }));

    const translatable = items.filter(it => it.clean.length > 0);

    if (translatable.length === 0) {
      return new Response(
        JSON.stringify({ success: true, french: items.map(() => '') }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Numéroter pour le LLM
    const numbered = translatable.map((it, k) => `[${k + 1}] ${it.clean}`).join('\n');

    const systemPrompt = [
      "Tu es un traducteur érudit du judaïsme rabbinique.",
      "Traduis du HÉBREU LITURGIQUE vers un FRANÇAIS clair, fluide et fidèle au sens.",
      "Style: respectueux, sobre, sans archaïsme inutile. Public francophone juif moderne.",
      "IMPORTANT — règles strictes :",
      "1. Garde le sens littéral, pas de paraphrase libre.",
      "2. Conserve les noms propres usuels en transcription française (Israël, Moïse, l'Éternel, le Saint béni soit-Il…).",
      "3. Pour le Tétragramme יהוה : 'l'Éternel'. Pour אלוהינו : 'notre Dieu'.",
      "4. Réponds UNIQUEMENT par un objet JSON, sans markdown ni texte avant/après.",
      "5. Préserve l'ordre et la numérotation des versets.",
    ].join('\n');

    const userPrompt = `Section : ${sectionTitle}\n\nTraduis chaque ligne numérotée en français :\n\n${numbered}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_translations',
              description: 'Retourne la traduction française de chaque ligne numérotée.',
              parameters: {
                type: 'object',
                properties: {
                  translations: {
                    type: 'array',
                    description: 'Une entrée par ligne, dans l\'ordre.',
                    items: {
                      type: 'object',
                      properties: {
                        n: { type: 'integer', description: 'Numéro de la ligne (1-based)' },
                        fr: { type: 'string', description: 'Traduction française' },
                      },
                      required: ['n', 'fr'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['translations'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'return_translations' } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Trop de requêtes. Réessaie dans une minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Crédit IA épuisé. Recharge ton workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const t = await aiResp.text();
      console.error('AI gateway error', aiResp.status, t);
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur du service de traduction.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let translations: { n: number; fr: string }[] = [];
    try {
      const args = JSON.parse(toolCall?.function?.arguments || '{}');
      translations = Array.isArray(args.translations) ? args.translations : [];
    } catch (e) {
      console.error('Failed to parse tool args', e);
    }

    // Mapper sur les indices originaux
    const french: string[] = items.map(() => '');
    for (const t of translations) {
      const k = (typeof t.n === 'number' ? t.n : 0) - 1;
      if (k >= 0 && k < translatable.length) {
        french[translatable[k].i] = String(t.fr || '').trim();
      }
    }

    return new Response(
      JSON.stringify({ success: true, french }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('translate-siddour-section error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});