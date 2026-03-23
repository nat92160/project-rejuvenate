const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verses, context } = await req.json();

    if (!verses || !Array.isArray(verses) || verses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'verses array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Strip HTML tags for cleaner transliteration
    const cleanVerses = verses.map((v: string) => v.replace(/<[^>]*>/g, '').trim());

    const systemPrompt = `Tu es un expert en translittération hébraïque vers le français. 
Tu dois produire une phonétique française fidèle et naturelle du texte hébreu liturgique.

RÈGLES DE TRANSLITTÉRATION STRICTES :
- שׁ → "Ch" (Shin)
- שׂ → "S" (Sin)
- צ → "Ts" (Tsadi)
- ח → "'H" (Het, guttural)
- כ (sans dagesh) → "Kh"
- כּ (avec dagesh) → "K"
- ע → "'" (Ayin, légère gutturale)
- ת → "T"
- ק → "K"
- ב (sans dagesh) → "V"
- בּ (avec dagesh) → "B"
- פ (sans dagesh) → "F"
- פּ (avec dagesh) → "P"
- ו → "V" ou "O/OU" selon voyelle
- ה en fin de mot → silencieux sauf avec mappik
- Double consonne → une seule lettre (ex: שַׁבָּת → "Chabbat")
- Chirik → "I"
- Tseiré → "É"
- Ségol → "È"
- Kamats → "A"
- Patah → "A"
- Cholem → "O"
- Chourouk / Koubouts → "OU"
- Chva na → "E" bref
- Chva nah → silencieux

FORMAT DE SORTIE : Renvoie UNIQUEMENT un tableau JSON de strings, chaque string étant la translittération du verset correspondant. Pas d'explication ni de commentaire.`;

    const userPrompt = `Translittère ces ${cleanVerses.length} versets hébraïques en phonétique française :\n\n${cleanVerses.map((v: string, i: number) => `${i + 1}. ${v}`).join('\n')}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_transliterations',
            description: 'Return the array of transliterated verses',
            parameters: {
              type: 'object',
              properties: {
                transliterations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of transliterated verses in French phonetics'
                }
              },
              required: ['transliterations'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'return_transliterations' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limited, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let transliterations: string[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        transliterations = args.transliterations || [];
      } catch {
        console.error('Failed to parse tool call arguments');
      }
    }

    // Fallback: try to parse content directly
    if (transliterations.length === 0) {
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          transliterations = Array.isArray(parsed) ? parsed : parsed.transliterations || [];
        } catch {
          // Try to extract array from content
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            try { transliterations = JSON.parse(match[0]); } catch { /* ignore */ }
          }
        }
      }
    }

    // Ensure same length
    while (transliterations.length < verses.length) {
      transliterations.push('');
    }

    return new Response(
      JSON.stringify({ success: true, transliterations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Transliteration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
