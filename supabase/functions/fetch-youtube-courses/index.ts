import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

// Channel handles (YouTube @handles) - we resolve IDs at runtime
const CHANNELS = [
  { handle: "leaboratoire", name: "Rav Ron Chaya" },
  { handle: "RavTouitou", name: "Rav Touitou" },
  { handle: "ravbenchetrit", name: "Rav Benchetrit" },
  { handle: "RavDynovisz", name: "Rav Dynovisz" },
  { handle: "ravshoushana6704", name: "Rav Shoushana" },
];

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] || "0");
  const min = parseInt(m[2] || "0");
  const s = parseInt(m[3] || "0");
  if (h > 0) return `${h}:${String(min).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${min}:${String(s).padStart(2, "0")}`;
}

async function resolveChannelId(apiKey: string, handle: string): Promise<string | null> {
  // Try forHandle first
  const url = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&forHandle=${handle}&part=id`;
  console.log(`Resolving handle @${handle}...`);
  const res = await fetch(url);
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    console.log(`Resolved @${handle} -> ${data.items[0].id}`);
    return data.items[0].id;
  }
  console.error(`Failed to resolve @${handle}:`, JSON.stringify(data));
  
  // Fallback: search for channel
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&part=snippet`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  if (searchData.items && searchData.items.length > 0) {
    const id = searchData.items[0].id.channelId;
    console.log(`Search resolved "${handle}" -> ${id}`);
    return id;
  }
  console.error(`Search also failed for "${handle}":`, JSON.stringify(searchData));
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if cache is fresh
    const { data: latestCache } = await supabase
      .from("youtube_courses_cache")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    const now = Date.now();
    if (latestCache && latestCache.length > 0) {
      const lastUpdate = new Date(latestCache[0].updated_at).getTime();
      if (now - lastUpdate < CACHE_DURATION_MS) {
        const { data: cached } = await supabase
          .from("youtube_courses_cache")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(100);
        return new Response(JSON.stringify({ source: "cache", data: cached || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const allVideos: any[] = [];

    for (const channel of CHANNELS) {
      try {
        // Resolve channel ID from handle
        const channelId = await resolveChannelId(YOUTUBE_API_KEY, channel.handle);
        if (!channelId) {
          console.error(`Skipping ${channel.name}: could not resolve channel ID`);
          continue;
        }

        // Get uploads playlist
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&id=${channelId}&part=contentDetails`;
        const channelRes = await fetch(channelUrl);
        const channelData = await channelRes.json();
        
        if (!channelData.items || channelData.items.length === 0) {
          console.error(`No channel data for ${channel.name} (${channelId})`);
          continue;
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) {
          console.error(`No uploads playlist for ${channel.name}`);
          continue;
        }

        // Get latest videos from uploads playlist
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${YOUTUBE_API_KEY}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=10`;
        const playlistRes = await fetch(playlistUrl);
        const playlistData = await playlistRes.json();

        if (!playlistData.items || playlistData.items.length === 0) {
          console.error(`No videos in playlist for ${channel.name}`);
          continue;
        }

        console.log(`Found ${playlistData.items.length} videos for ${channel.name}`);

        // Get video details (duration, view count)
        const videoIds = playlistData.items
          .map((i: any) => i.snippet?.resourceId?.videoId)
          .filter(Boolean)
          .join(",");
        
        if (!videoIds) continue;

        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails,statistics`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        const detailsMap = new Map(
          (detailsData.items || []).map((d: any) => [d.id, d])
        );

        for (const item of playlistData.items) {
          const vid = item.snippet?.resourceId?.videoId;
          if (!vid) continue;
          const detail: any = detailsMap.get(vid);
          allVideos.push({
            video_id: vid,
            channel_id: channelId,
            channel_name: channel.name,
            title: item.snippet.title,
            description: (item.snippet.description || "").slice(0, 500),
            thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
            published_at: item.snippet.publishedAt,
            duration: detail ? parseDuration(detail.contentDetails?.duration || "") : null,
            view_count: detail ? parseInt(detail.statistics?.viewCount || "0") : 0,
          });
        }
      } catch (e) {
        console.error(`Error fetching channel ${channel.name}:`, e);
      }
    }

    console.log(`Total videos fetched: ${allVideos.length}`);

    // Upsert into cache
    if (allVideos.length > 0) {
      const nowIso = new Date().toISOString();
      const rows = allVideos.map((v) => ({ ...v, updated_at: nowIso }));
      const { error: upsertErr } = await supabase
        .from("youtube_courses_cache")
        .upsert(rows, { onConflict: "video_id" });
      if (upsertErr) {
        console.error("Upsert error:", upsertErr);
      }
    }

    // Return fresh data
    const { data: freshData } = await supabase
      .from("youtube_courses_cache")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(100);

    return new Response(JSON.stringify({ source: "fresh", data: freshData || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
