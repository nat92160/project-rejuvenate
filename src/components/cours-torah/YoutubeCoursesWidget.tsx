import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Play, ExternalLink, Clock, Eye, X } from "lucide-react";

interface YTCourse {
  id: string;
  video_id: string;
  channel_id: string;
  channel_name: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
  duration: string | null;
  view_count: number;
}

const RAV_COLORS: Record<string, string> = {
  "Rav Ron Chaya": "hsl(35, 80%, 45%)",
  "Rav Touitou": "hsl(220, 60%, 50%)",
  "Rav Benchetrit": "hsl(160, 50%, 40%)",
  "Rav Dynovisz": "hsl(280, 50%, 50%)",
  "Rav Shoushana": "hsl(10, 65%, 50%)",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `il y a ${weeks}sem`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const YoutubeCoursesWidget = () => {
  const [courses, setCourses] = useState<YTCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    // First try cache from DB
    const { data: cached, error: cacheErr } = await supabase
      .from("youtube_courses_cache")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(100);

    if (cached && cached.length > 0) {
      setCourses(cached as unknown as YTCourse[]);
      setLoading(false);
    }

    // Trigger refresh via edge function (fire and forget if cache exists)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("fetch-youtube-courses");
      if (fnErr) {
        console.error("Edge function error:", fnErr);
        if (!cached || cached.length === 0) {
          setError("Impossible de charger les cours vidéo");
        }
      } else if (data?.data) {
        setCourses(data.data as YTCourse[]);
      }
    } catch (e) {
      console.error("Fetch error:", e);
      if (!cached || cached.length === 0) {
        setError("Impossible de charger les cours vidéo");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const ravNames = [...new Set(courses.map((c) => c.channel_name))];
  const filtered = filter === "all" ? courses : courses.filter((c) => c.channel_name === filter);

  return (
    <div className="mt-6">
      {/* Header */}
      <div
        className="rounded-2xl p-4 mb-4 border border-primary/15"
        style={{ background: "linear-gradient(135deg, hsl(var(--gold) / 0.08), hsl(var(--gold) / 0.02))" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Cours Vidéo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Derniers cours des Rabbanim sur YouTube</p>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      {ravNames.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilter("all")}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
              filter === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            Tous
          </button>
          {ravNames.map((name) => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                filter === name
                  ? "text-background border-transparent"
                  : "bg-card text-muted-foreground border-border hover:border-foreground/30"
              }`}
              style={
                filter === name
                  ? { background: RAV_COLORS[name] || "hsl(var(--primary))", borderColor: "transparent" }
                  : undefined
              }
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Embedded player */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="relative rounded-2xl overflow-hidden bg-black" style={{ boxShadow: "var(--shadow-card)" }}>
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1&rel=0`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading && courses.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-[140px] h-[80px] rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2.5 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={fetchCourses}
            className="mt-3 px-4 py-2 rounded-xl text-xs font-bold border-none cursor-pointer text-primary-foreground"
            style={{ background: "var(--gradient-gold)" }}
          >
            Réessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm text-muted-foreground">Aucun cours vidéo disponible.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((course, i) => (
            <motion.div
              key={course.video_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div
                className="rounded-2xl bg-card border border-border overflow-hidden cursor-pointer hover:border-primary/30 transition-all"
                style={{ boxShadow: "var(--shadow-card)" }}
                onClick={() => setSelectedVideo(course.video_id)}
              >
                <div className="flex gap-0">
                  {/* Thumbnail */}
                  <div className="relative w-[140px] sm:w-[180px] shrink-0">
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      style={{ minHeight: 90 }}
                      loading="lazy"
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {course.duration && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {course.duration}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-[13px] font-bold text-foreground leading-tight line-clamp-2">
                        {course.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: RAV_COLORS[course.channel_name] || "hsl(var(--primary))" }}
                        />
                        <span className="text-[11px] font-semibold" style={{ color: RAV_COLORS[course.channel_name] || "hsl(var(--primary))" }}>
                          {course.channel_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {timeAgo(course.published_at)}
                      </span>
                      {course.view_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-3 h-3" />
                          {formatViews(course.view_count)}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.youtube.com/watch?v=${course.video_id}`, "_blank", "noopener,noreferrer");
                        }}
                        className="ml-auto flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-lg border-none cursor-pointer bg-destructive/5 text-foreground hover:bg-destructive/10 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        YouTube
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default YoutubeCoursesWidget;
