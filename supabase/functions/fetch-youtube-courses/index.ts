import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const CHANNELS = [
  { id: "UCg-9Mq99UZ_HKW5N7IHqbYw", name: "Rav Ron Chaya", handle: "Leava" },
  { id: "UCYSdVr5WBOdObeYBvKc4OZg", name: "Rav Touitou", handle: "RavTouitou" },
  { id: "UCrVBH2Dyo_kWJPc5h7AJMYQ", name: "Rav Benchetrit", handle: "RavBenchetrit" },
  { id: "UCjHkzW4UVJpdKJEg-yrjqYA", name: "Rav Dynovisz", handle: "ravdynovisz" },
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
        // Cache is fresh, return cached data
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

    // Resolve channel IDs from handles if needed, then fetch videos
    const allVideos: any[] = [];

    for (const channel of CHANNELS) {
      try {
        // First try with known channel ID - search for recent videos
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channel.id}&part=snippet&order=date&maxResults=10&type=video`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (!searchData.items || searchData.items.length === 0) {
          // Try resolving by handle
          const handleUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&forHandle=${channel.handle}&part=contentDetails,snippet`;
          const handleRes = await fetch(handleUrl);
          const handleData = await handleRes.json();
          if (handleData.items && handleData.items.length > 0) {
            const resolvedId = handleData.items[0].id;
            const retryUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${resolvedId}&part=snippet&order=date&maxResults=10&type=video`;
            const retryRes = await fetch(retryUrl);
            const retryData = await retryRes.json();
            if (retryData.items) {
              const videoIds = retryData.items.map((i: any) => i.id.videoId).join(",");
              const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails,statistics`;
              const detailsRes = await fetch(detailsUrl);
              const detailsData = await detailsRes.json();
              const detailsMap = new Map(
                (detailsData.items || []).map((d: any) => [d.id, d])
              );

              for (const item of retryData.items) {
                const vid = item.id.videoId;
                const detail: any = detailsMap.get(vid);
                allVideos.push({
                  video_id: vid,
                  channel_id: resolvedId,
                  channel_name: channel.name,
                  title: item.snippet.title,
                  description: (item.snippet.description || "").slice(0, 500),
                  thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
                  published_at: item.snippet.publishedAt,
                  duration: detail ? parseDuration(detail.contentDetails?.duration || "") : null,
                  view_count: detail ? parseInt(detail.statistics?.viewCount || "0") : 0,
                });
              }
            }
            continue;
          }
          continue;
        }

        // Get video details (duration, view count)
        const videoIds = searchData.items.map((i: any) => i.id.videoId).join(",");
        if (!videoIds) continue;

        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails,statistics`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        const detailsMap = new Map(
          (detailsData.items || []).map((d: any) => [d.id, d])
        );

        for (const item of searchData.items) {
          const vid = item.id.videoId;
          const detail: any = detailsMap.get(vid);
          allVideos.push({
            video_id: vid,
            channel_id: channel.id,
            channel_name: channel.name,
            title: item.snippet.title,
            description: (item.snippet.description || "").slice(0, 500),
            thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
            published_at: item.snippet.publishedAt,
            duration: detail ? parseDuration(detail.contentDetails?.duration || "") : null,
            view_count: detail ? parseInt(detail.statistics?.viewCount || "0") : 0,
          });
        }
      } catch (e) {
        console.error(`Error fetching channel ${channel.name}:`, e);
      }
    }

    // Upsert into cache
    if (allVideos.length > 0) {
      const now = new Date().toISOString();
      const rows = allVideos.map((v) => ({ ...v, updated_at: now }));
      await supabase.from("youtube_courses_cache").upsert(rows, { onConflict: "video_id" });
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
