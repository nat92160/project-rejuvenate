const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapter } = await req.json();

    if (!chapter || chapter < 1 || chapter > 150) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chapter must be between 1 and 150' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch from Sefaria API
    const response = await fetch(`https://www.sefaria.org/api/texts/Psalms.${chapter}?lang=he&context=0`);
    
    if (!response.ok) {
      throw new Error(`Sefaria API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract Hebrew text (array of verses)
    const hebrewVerses: string[] = Array.isArray(data.he) ? data.he : [data.he];
    const heTitle: string = data.heRef || `תהילים ${chapter}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        chapter,
        heTitle,
        verses: hebrewVerses,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching psalm:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch psalm' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
