import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Check, Share2, Users, BookOpen, Sparkles } from "lucide-react";
import { useWakeLock } from "@/hooks/useWakeLock";
import { getZoharSections, type ZoharVersion, sectionWeight } from "@/lib/zohar-brit-data";
import { splitSections, generateSessionCode } from "@/lib/zoharSplit";
import { buildShareUrl, shareText } from "@/lib/shareUtils";

type Session = {
  id: string; code: string; creator_id: string | null;
  version: ZoharVersion; participants_count: number;
  title: string | null;
  assignments: Record<string, number[]>;
  completed: Record<string, number[]>;
  status: string;
};
type Participant = { id: string; user_id: string | null; anon_id?: string | null; display_name: string; slot_index: number | null };

// Stable per-device anon identity (no account required)
function getAnonId(): string {
  try {
    const k = "zohar_brit_anon_id";
    let v = localStorage.getItem(k);
    if (!v) { v = `anon_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`; localStorage.setItem(k, v); }
    return v;
  } catch { return `anon_${Math.random().toString(36).slice(2, 10)}`; }
}
function getAnonName(): string {
  try {
    const k = "zohar_brit_anon_name";
    let v = localStorage.getItem(k);
    if (!v) { v = `Invité ${Math.floor(Math.random() * 900 + 100)}`; localStorage.setItem(k, v); }
    return v;
  } catch { return "Invité"; }
}
function setAnonName(name: string) {
  try { localStorage.setItem("zohar_brit_anon_name", name.trim().slice(0, 40)); } catch {}
}
function hasCustomAnonName(): boolean {
  try {
    const v = localStorage.getItem("zohar_brit_anon_name");
    return !!v && !/^Invité \d+$/.test(v);
  } catch { return false; }
}

const NAVY = "hsl(var(--primary))";
const GOLD = "hsl(var(--gold-matte))";

export default function ZoharBritWidget() {
  const { user } = useAuth();
  const { code: routeCode } = useParams<{ code?: string }>();
  const [mode, setMode] = useState<"home" | "solo" | "session">("home");
  const [version, setVersion] = useState<ZoharVersion>("court");
  const [fontSize, setFontSize] = useState(22);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  // Session state
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [customCount, setCustomCount] = useState<number>(4);
  const [guestName, setGuestName] = useState<string>(() => (hasCustomAnonName() ? getAnonName() : ""));
  const [pendingJoin, setPendingJoin] = useState<null | { code?: string; create?: number }>(null);

  useWakeLock(mode !== "home" && activeIdx !== null);

  const sections = useMemo(() => getZoharSections(version), [version]);

  const fetchParticipants = useCallback(async (sessionId: string) => {
    const { data } = await supabase.from("zohar_brit_participants").select("*").eq("session_id", sessionId).order("slot_index");
    if (data) setParticipants(data as Participant[]);
    return (data || []) as Participant[];
  }, []);

  // ─── Realtime ───
  useEffect(() => {
    if (!session) return;
    const ch = supabase.channel(`zb-${session.code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "zohar_brit_sessions", filter: `id=eq.${session.id}` },
        (p: any) => { if (p.new) setSession(p.new as Session); })
      .on("postgres_changes", { event: "*", schema: "public", table: "zohar_brit_participants", filter: `session_id=eq.${session.id}` },
        async () => { await fetchParticipants(session.id); })
      .subscribe();
    fetchParticipants(session.id);
    return () => { supabase.removeChannel(ch); };
  }, [fetchParticipants, session?.id]);

  // ─── Actions ───
  const createSession = async (count: number) => {
    if (!user && !guestName.trim()) { setPendingJoin({ create: count }); return; }
    if (!user) setAnonName(guestName);
    setCreating(true);
    const secs = getZoharSections(version);
    const split = splitSections(secs, count);
    const assignments: Record<string, number[]> = {};
    for (let i = 0; i < count; i++) assignments[`slot_${i}`] = split[i];

    const code = generateSessionCode();
    const { data, error } = await supabase.from("zohar_brit_sessions").insert({
      code, creator_id: user?.id ?? null, version, participants_count: count, assignments, completed: {},
    }).select().single();
    setCreating(false);
    if (error || !data) { toast({ title: "Erreur création", duration: 2000 }); return; }
    const created = data as Session;
    setSession(created);
    setMode("session");
    await joinAsSlot(created.id, 0);
    await fetchParticipants(created.id);
  };

  const joinAsSlot = async (sessionId: string, slotIndex: number) => {
    const name = user
      ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Participant")
      : getAnonName();
    await supabase.from("zohar_brit_participants").insert({
      session_id: sessionId,
      user_id: user?.id ?? null,
      anon_id: user ? null : getAnonId(),
      display_name: name,
      slot_index: slotIndex,
    } as any);
  };

  const joinByCode = async (codeOverride?: string) => {
    if (!user && !guestName.trim()) { setPendingJoin({ code: codeOverride || joinCode }); return; }
    if (!user) setAnonName(guestName);
    const code = (codeOverride || joinCode).trim().toUpperCase();
    const normalized = code.startsWith("BRIT-") ? code : `BRIT-${code}`;
    const { data } = await supabase.from("zohar_brit_sessions").select("*").eq("code", normalized).maybeSingle();
    if (!data) { toast({ title: "Session introuvable", duration: 2000 }); return; }
    const sess = data as Session;
    const parts = await fetchParticipants(sess.id);
    const current = user
      ? parts.find((p) => p.user_id === user.id)
      : parts.find((p) => p.anon_id === getAnonId());
    if (current) {
      setSession(sess);
      setVersion(sess.version);
      setMode("session");
      return;
    }
    const taken = new Set(parts.map((p) => p.slot_index));
    let slot = -1;
    for (let i = 0; i < sess.participants_count; i++) if (!taken.has(i)) { slot = i; break; }
    if (slot === -1) { toast({ title: "Session complète", duration: 2000 }); return; }
    setSession(sess);
    setVersion(sess.version);
    setMode("session");
    await joinAsSlot(sess.id, slot);
    await fetchParticipants(sess.id);
  };

  const mySlot = useMemo(() => {
    if (!session) return null;
    const p = user
      ? participants.find((x) => x.user_id === user.id)
      : participants.find((x: any) => x.anon_id === getAnonId());
    return p?.slot_index ?? null;
  }, [participants, session, user]);

  const mySections = useMemo(() => {
    if (!session || mySlot === null) return [];
    return session.assignments[`slot_${mySlot}`] || [];
  }, [session, mySlot]);

  const myCompleted = useMemo(() => {
    if (!session || mySlot === null) return new Set<number>();
    return new Set(session.completed[`slot_${mySlot}`] || []);
  }, [session, mySlot]);

  const markDone = async (idx: number) => {
    if (!session || mySlot === null) return;
    const key = `slot_${mySlot}`;
    const cur = new Set(session.completed[key] || []);
    cur.has(idx) ? cur.delete(idx) : cur.add(idx);
    const next = { ...session.completed, [key]: Array.from(cur) };
    await supabase.from("zohar_brit_sessions").update({ completed: next }).eq("id", session.id);
  };

  const shareCode = async () => {
    if (!session) return;
    const url = buildShareUrl(`/zohar-brit/${session.code}`);
    const text = `Rejoins la lecture du Zohar de la veille de Brit\nCode : ${session.code}\n${url}`;
    await shareText(text, "Zohar de la Brit", url);
  };

  // Auto-join via URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = routeCode || params.get("zohar-brit");
    if (code && !session) {
      setJoinCode(code);
      if (!user && !hasCustomAnonName()) {
        setPendingJoin({ code });
      } else {
        void joinByCode(code);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCode, user]);

  // ─── Rendering ───
  const totalSections = sections.length;
  const totalDone = useMemo(() => {
    if (!session) return 0;
    return Object.values(session.completed).reduce((acc, arr) => acc + arr.length, 0);
  }, [session]);

  // Reader for a specific section
  if (activeIdx !== null) {
    const sec = sections.find((s) => s.index === activeIdx);
    if (!sec) { setActiveIdx(null); return null; }
    const isMine = mode === "session" && mySections.includes(activeIdx);
    const done = myCompleted.has(activeIdx);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setActiveIdx(null)} className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg" style={{ background: "hsl(var(--muted))", color: NAVY }}>
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
          {isMine && (
            <button onClick={() => markDone(activeIdx)} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg"
              style={{ background: done ? `${GOLD}` : "hsl(var(--muted))", color: done ? "#fff" : NAVY }}>
              <Check className="w-4 h-4" /> {done ? "Terminée" : "Marquer terminée"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-muted-foreground">A</span>
          <Slider value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={16} max={36} step={1} className="flex-1" />
          <span className="text-base text-muted-foreground">A</span>
        </div>
        <div className="rounded-2xl border p-5 bg-card" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="text-center mb-4 pb-3 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: GOLD }}>{sec.ref}</div>
            <div className="font-display text-lg font-bold" style={{ color: NAVY }}>{sec.title}</div>
            <div dir="rtl" lang="he" className="text-base mt-1" style={{ fontFamily: "'Frank Ruhl Libre', serif", color: NAVY }}>{sec.heTitle}</div>
          </div>
          <div dir="rtl" lang="he" style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize, lineHeight: 1.9, color: "hsl(var(--foreground))" }}>
            {sec.paragraphs.map((p, i) => <p key={i} className="mb-4">{p}</p>)}
          </div>
        </div>
      </div>
    );
  }

  // ─── HOME ───
  if (mode === "home") {
    if (pendingJoin && !user) {
      const submit = () => {
        const n = guestName.trim();
        if (n.length < 2) { toast({ title: "Entre ton prénom (2 caractères min.)", duration: 2000 }); return; }
        setAnonName(n);
        const pj = pendingJoin;
        setPendingJoin(null);
        if (pj.code) void joinByCode(pj.code);
        else if (typeof pj.create === "number") void createSession(pj.create);
      };
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${GOLD})`, color: "#fff" }}>
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-80" />
            <h2 className="font-display text-xl font-bold">Ton prénom</h2>
            <p className="text-xs opacity-90 mt-1">Pour que l'organisateur sache qui lit quelle section</p>
          </div>
          <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: GOLD }}>
            <Input
              autoFocus
              value={guestName}
              onChange={(e) => setGuestName(e.target.value.slice(0, 40))}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Ex: David, Sarah…"
              className="text-base"
              style={{ fontSize: 16 }}
            />
            <button onClick={submit} className="w-full rounded-lg py-2.5 text-sm font-bold" style={{ background: NAVY, color: "#fff" }}>
              Continuer
            </button>
            <button onClick={() => setPendingJoin(null)} className="w-full text-[11px] text-muted-foreground py-1">
              Annuler
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${GOLD})`, color: "#fff" }}>
          <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-80" />
          <h2 className="font-display text-xl font-bold">Zohar de la veille de Brit</h2>
          <p className="text-xs opacity-90 mt-1">Lisez le Tikoun HaBrit seul ou partagez-le entre plusieurs participants</p>
        </div>

        <div className="flex gap-2">
          {(["court", "complet"] as ZoharVersion[]).map((v) => (
            <button key={v} onClick={() => setVersion(v)} className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold border-2 transition-all"
              style={{ borderColor: version === v ? GOLD : "hsl(var(--border))", background: version === v ? `${GOLD}15` : "transparent", color: version === v ? NAVY : "hsl(var(--muted-foreground))" }}>
              {v === "court" ? "Tikoun court" : "Tikoun complet"}
              <div className="text-[10px] font-normal opacity-70">{getZoharSections(v).length} sections</div>
            </button>
          ))}
        </div>

        <button onClick={() => setMode("solo")} className="w-full rounded-xl px-4 py-4 flex items-center gap-3 border-2 transition-all active:scale-[0.98]"
          style={{ borderColor: NAVY, background: `${NAVY}08` }}>
          <BookOpen className="w-5 h-5" style={{ color: NAVY }} />
          <div className="flex-1 text-left">
            <div className="font-semibold text-sm" style={{ color: NAVY }}>Lire seul</div>
            <div className="text-[11px] text-muted-foreground">Lecture complète du Zohar choisi</div>
          </div>
        </button>

        <div className="rounded-xl border-2 p-4 space-y-3" style={{ borderColor: GOLD }}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: GOLD }} />
            <div className="font-semibold text-sm" style={{ color: NAVY }}>Lecture partagée</div>
          </div>
          <p className="text-[11px] text-muted-foreground">Découpez parfaitement le Zohar entre plusieurs personnes — sections complètes, équilibre automatique.</p>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1.5 text-muted-foreground">Nombre de participants</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCustomCount((n) => Math.max(2, n - 1))}
                className="w-10 h-10 rounded-lg font-bold text-lg border" style={{ borderColor: GOLD, color: NAVY, background: `${GOLD}10` }}>−</button>
              <Input type="number" inputMode="numeric" min={2} max={50} value={customCount}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setCustomCount(Math.min(50, Math.max(2, v)));
                }}
                className="text-center font-bold text-lg" style={{ fontSize: 18 }} />
              <button type="button" onClick={() => setCustomCount((n) => Math.min(50, n + 1))}
                className="w-10 h-10 rounded-lg font-bold text-lg border" style={{ borderColor: GOLD, color: NAVY, background: `${GOLD}10` }}>+</button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[2, 4, 6, 10].map((n) => (
                <button key={n} type="button" onClick={() => setCustomCount(n)}
                  className="flex-1 rounded-md py-1 text-[11px] font-semibold border"
                  style={{ borderColor: customCount === n ? GOLD : "hsl(var(--border))", color: NAVY, background: customCount === n ? `${GOLD}15` : "transparent" }}>
                  {n}
                </button>
              ))}
            </div>
            <button disabled={creating} onClick={() => createSession(customCount)}
              className="w-full mt-2.5 rounded-lg py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60"
              style={{ background: NAVY, color: "#fff" }}>
              {creating ? "Création…" : `Créer la session à ${customCount}`}
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Code session (ex: A4F2)" className="text-base" style={{ fontSize: 16 }} />
            <button onClick={() => joinByCode()} className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap" style={{ background: NAVY, color: "#fff" }}>
              Rejoindre
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SOLO ───
  if (mode === "solo") {
    return (
      <div className="space-y-3">
        <button onClick={() => setMode("home")} className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg" style={{ background: "hsl(var(--muted))", color: NAVY }}>
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <div className="text-center py-2">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: GOLD }}>Tikoun {version}</div>
          <div className="font-display text-lg font-bold" style={{ color: NAVY }}>זוהר ליל המילה</div>
        </div>
        <div className="space-y-1.5">
          {sections.map((s) => (
            <button key={s.index} onClick={() => setActiveIdx(s.index)} className="w-full text-left p-3 rounded-xl border bg-card flex items-center gap-3 active:scale-[0.99]"
              style={{ borderColor: "hsl(var(--border))" }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${GOLD}20`, color: NAVY }}>{s.index + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: NAVY }}>{s.title}</div>
                <div className="text-[10px] text-muted-foreground">{s.ref} · {sectionWeight(s)} car.</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── SESSION ───
  if (mode === "session" && session) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => { setMode("home"); setSession(null); }} className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg" style={{ background: "hsl(var(--muted))", color: NAVY }}>
            <ChevronLeft className="w-4 h-4" /> Quitter
          </button>
          <button onClick={shareCode} className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg" style={{ background: GOLD, color: "#fff" }}>
            <Share2 className="w-4 h-4" /> Partager
          </button>
        </div>

        <div className="rounded-2xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${GOLD})`, color: "#fff" }}>
          <div className="text-[10px] uppercase tracking-wider opacity-80">Code de session</div>
          <div className="font-mono font-black text-2xl tracking-widest mt-1">{session.code}</div>
          <div className="text-[11px] opacity-90 mt-2">
            Progression : {totalDone}/{totalSections} sections · {participants.length}/{session.participants_count} participants
          </div>
        </div>

        {mySlot !== null && (
          <div className="rounded-xl border-2 p-3" style={{ borderColor: GOLD, background: `${GOLD}08` }}>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: GOLD }}>Mes sections ({mySections.length})</div>
            <div className="space-y-1.5">
              {mySections.map((idx) => {
                const s = sections.find((x) => x.index === idx);
                if (!s) return null;
                const done = myCompleted.has(idx);
                return (
                  <button key={idx} onClick={() => setActiveIdx(idx)} className="w-full text-left p-2.5 rounded-lg border bg-card flex items-center gap-2 active:scale-[0.99]"
                    style={{ borderColor: done ? GOLD : "hsl(var(--border))", opacity: done ? 0.7 : 1 }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: done ? GOLD : `${NAVY}15`, color: done ? "#fff" : NAVY }}>
                      {done ? "✓" : s.index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: NAVY }}>{s.title}</div>
                      <div className="text-[9px] text-muted-foreground">{s.ref}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border p-3 bg-card" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: NAVY }}>Suivi des participants</div>
            {session.creator_id && user?.id === session.creator_id && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${GOLD}20`, color: GOLD }}>Organisateur</span>
            )}
          </div>
          <div className="space-y-2">
            {Array.from({ length: session.participants_count }).map((_, i) => {
              const p = participants.find((x) => x.slot_index === i);
              const slotSecs = session.assignments[`slot_${i}`] || [];
              const doneSet = new Set(session.completed[`slot_${i}`] || []);
              const slotDone = doneSet.size;
              const allDone = slotSecs.length > 0 && slotDone === slotSecs.length;
              return (
                <div key={i} className="rounded-lg border p-2" style={{ borderColor: allDone ? GOLD : "hsl(var(--border))", background: allDone ? `${GOLD}08` : "transparent" }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: allDone ? GOLD : `${NAVY}15`, color: allDone ? "#fff" : NAVY }}>
                      {allDone ? "✓" : i + 1}
                    </span>
                    <span className="flex-1 truncate font-semibold" style={{ color: p ? NAVY : "hsl(var(--muted-foreground))" }}>
                      {p ? p.display_name : "— en attente —"}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: allDone ? GOLD : "hsl(var(--muted-foreground))" }}>
                      {slotDone}/{slotSecs.length}
                    </span>
                  </div>
                  {slotSecs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pl-7">
                      {slotSecs.map((sIdx) => {
                        const done = doneSet.has(sIdx);
                        return (
                          <span key={sIdx} title={`Section ${sIdx + 1}`}
                            className="text-[9px] font-bold rounded px-1.5 py-0.5"
                            style={{
                              background: done ? GOLD : "hsl(var(--muted))",
                              color: done ? "#fff" : "hsl(var(--muted-foreground))",
                              opacity: done ? 1 : 0.7,
                            }}>
                            {done ? "✓" : ""}{sIdx + 1}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
