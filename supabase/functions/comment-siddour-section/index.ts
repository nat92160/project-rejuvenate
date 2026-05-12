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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const hebrew: unknown = body?.hebrew;
    const sectionTitle: string = typeof body?.title === 'string' ? body.title : 'Prière';
    const rite: string = body?.rite === 'ashkenaz' ? 'Achkénaze' : 'Séfarade';

    if (!Array.isArray(hebrew) || hebrew.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Champ "hebrew" requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extrait condensé pour contexte (max ~1500 car)
    const cleaned = (hebrew as string[])
      .map(stripHtmlAndNikud)
      .filter(Boolean)
      .join(' • ');
    const excerpt = cleaned.length > 1500 ? cleaned.slice(0, 1500) + '…' : cleaned;

    const systemPrompt = [
      "Tu es un enseignant de Torah francophone, dans la tradition rabbinique classique.",
      "Tu rédiges des commentaires d'étude COURTS et PÉDAGOGIQUES sur les prières juives.",
      "Style: clair, respectueux, sobre, accessible aux débutants comme aux pratiquants confirmés.",
      "RÈGLES STRICTES :",
      "1. NE COPIE JAMAIS un commentaire existant (ex: ArtScroll, Patah Eliyahou, Torah-Box). Rédige avec tes propres mots.",
      "2. Cite les sources générales si pertinent (Talmud Berakhot, Rambam, Choulhan Aroukh, Zohar) sans inventer de références précises.",
      "3. Pour le Tétragramme : 'l'Éternel'.",
      "4. Réponds UNIQUEMENT par un objet JSON via l'outil fourni.",
      "5. Maximum 4 paragraphes courts. Pas de markdown.",
    ].join('\n');

    const userPrompt = [
      `Rite : ${rite}`,
      `Section : ${sectionTitle}`,
      ``,
      `Extrait du texte hébreu (translittéré sans nikud) :`,
      excerpt,
      ``,
      `Rédige un bref commentaire d'étude en français (3-4 paragraphes courts) couvrant :`,
      `- Le sens général de cette prière`,
      `- Une notion clé à comprendre`,
      `- Une intention (kavana) ou un point pratique pour la prière`,
    ].join('\n');

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
        tools: [{
          type: 'function',
          function: {
            name: 'return_commentary',
            description: 'Retourne un commentaire d\'étude en français.',
            parameters: {
              type: 'object',
              properties: {
                paragraphs: {
                  type: 'array',
                  description: '3 à 4 paragraphes courts.',
                  items: { type: 'string' },
                },
              },
              required: ['paragraphs'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_commentary' } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Trop de requêtes. Réessaie dans une minute.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Crédit IA épuisé. Recharge ton workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const t = await aiResp.text();
      console.error('AI gateway error', aiResp.status, t);
      return new Response(JSON.stringify({ success: false, error: 'Erreur du service de commentaire.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let paragraphs: string[] = [];
    try {
      const args = JSON.parse(toolCall?.function?.arguments || '{}');
      paragraphs = Array.isArray(args.paragraphs) ? args.paragraphs.map((p: unknown) => String(p || '').trim()).filter(Boolean) : [];
    } catch (e) {
      console.error('Failed to parse tool args', e);
    }

    return new Response(JSON.stringify({ success: true, paragraphs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('comment-siddour-section error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});