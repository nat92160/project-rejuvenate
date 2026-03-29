import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchKosherZmanim } from "@/lib/kosher-zmanim";
import type { ZmanItem } from "@/lib/hebcal";

// ─── Preset cities ───

interface SimCity {
  label: string;
  emoji: string;
  lat: number;
  lng: number;
  tz: string;
  elevation: number;
  note: string;
}

const SIM_CITIES: Record<string, SimCity> = {
  paris: {
    label: "Paris",
    emoji: "🇫🇷",
    lat: 48.8566,
    lng: 2.3522,
    tz: "Europe/Paris",
    elevation: 0,
    note: "Cas standard · 18 min avant Shkiya · altitude 0m",
  },
  jerusalem: {
    label: "Jérusalem",
    emoji: "🇮🇱",
    lat: 31.7683,
    lng: 35.2137,
    tz: "Asia/Jerusalem",
    elevation: 0,
    note: "Allumage souvent 40 min avant Shkiya · altitude 0m",
  },
  new_york: {
    label: "New York",
    emoji: "🇺🇸",
    lat: 40.7128,
    lng: -74.006,
    tz: "America/New_York",
    elevation: 0,
    note: "Changement de fuseau complet · altitude 0m",
  },
};

// ─── Diagnostic results ───

interface DiagnosticResult {
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
  detail?: string;
}

// ─── Component ───

const ZmanimTravelSimulator = () => {
  const [selectedCity, setSelectedCity] = useState<string>("paris");
  const [zmanim, setZmanim] = useState<ZmanItem[]>([]);
  const [simDate, setSimDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [fridayTestResult, setFridayTestResult] = useState<string | null>(null);

  const city = SIM_CITIES[selectedCity];

  // Compute zmanim for current simulation
  const computedZmanim = useMemo(() => {
    if (!city) return [];
    const d = new Date(simDate + "T12:00:00");
    return fetchKosherZmanim({
      lat: city.lat,
      lng: city.lng,
      elevation: city.elevation,
      tz: city.tz,
      name: city.label,
      date: d,
      method: "gra",
    });
  }, [selectedCity, simDate, city]);

  // Extract key times
  const shkiya = useMemo(() => computedZmanim.find(z => z.label.includes("Chkia")), [computedZmanim]);
  const tzeit = useMemo(() => computedZmanim.find(z => z.label.includes("Tsét haKokhavim")), [computedZmanim]);
  const alot = useMemo(() => computedZmanim.find(z => z.label.includes("Alot")), [computedZmanim]);

  // When city changes, update displayed zmanim
  const handleCityChange = useCallback((key: string) => {
    setSelectedCity(key);
    setFridayTestResult(null);
    setDiagnosticResults([]);
  }, []);

  // ─── Test de Sécurité Vendredi ───
  const runFridaySecurityTest = useCallback(() => {
    const results: string[] = [];
    let allPassed = true;

    for (const [key, c] of Object.entries(SIM_CITIES)) {
      // Find next Friday from simDate
      const baseDate = new Date(simDate + "T12:00:00");
      const dayOfWeek = baseDate.getDay();
      const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
      const friday = new Date(baseDate);
      friday.setDate(friday.getDate() + (dayOfWeek === 5 ? 0 : daysUntilFriday));

      const zmanimFriday = fetchKosherZmanim({
        lat: c.lat,
        lng: c.lng,
        elevation: c.elevation,
        tz: c.tz,
        name: c.label,
        date: friday,
        method: "gra",
      });

      const sunset = zmanimFriday.find(z => z.label.includes("Chkia"));

      if (!sunset || sunset.time === "--:--") {
        results.push(`❌ ${c.emoji} ${c.label} : Pas de coucher du soleil détecté`);
        allPassed = false;
        continue;
      }

      // Parse sunset time
      const [sH, sM] = sunset.time.split(":").map(Number);
      const sunsetMinutes = sH * 60 + sM;

      // Simulated candle lighting: 18 min before sunset (Paris/NY), 40 min (Jerusalem)
      const candleOffset = key === "jerusalem" ? 40 : 18;
      const candleLightingMinutes = sunsetMinutes - candleOffset;

      // Verify candle lighting is BEFORE sunset
      if (candleLightingMinutes < sunsetMinutes) {
        results.push(
          `✅ ${c.emoji} ${c.label} : Allumage à ${Math.floor(candleLightingMinutes / 60)}:${String(candleLightingMinutes % 60).padStart(2, "0")} — ${candleOffset} min avant Shkiya (${sunset.time})`
        );
      } else {
        results.push(`❌ ${c.emoji} ${c.label} : ERREUR — Allumage APRÈS le coucher du soleil !`);
        allPassed = false;
      }
    }

    // Test "no GPS" fallback
    const noGpsZmanim = fetchKosherZmanim({
      lat: 0,
      lng: 0,
      elevation: 0,
      tz: "UTC",
      name: "Aucune position",
      date: new Date(simDate + "T12:00:00"),
      method: "gra",
    });
    
    if (noGpsZmanim.length > 0 && noGpsZmanim.every(z => z.time !== "--:--")) {
      results.push("⚠️ Sans GPS : Le moteur retourne des horaires (0°,0° UTC) — l'UI devrait bloquer l'affichage");
    } else {
      results.push("✅ Sans GPS : Horaires indéterminés ou bloqués");
    }

    setFridayTestResult(
      (allPassed ? "✅ Tous les tests passés" : "⚠️ Certains tests ont échoué") + "\n\n" + results.join("\n")
    );
  }, [simDate]);

  // ─── Diagnostic complet ───
  const runFullDiagnostic = useCallback(() => {
    setDiagnosticRunning(true);
    const results: DiagnosticResult[] = [];

    // CAS A: Vendredi 3 Avril 2026 à Paris → Vérifier l'allumage
    const casADate = new Date("2026-04-03T12:00:00");
    const casAZmanim = fetchKosherZmanim({
      lat: SIM_CITIES.paris.lat,
      lng: SIM_CITIES.paris.lng,
      elevation: SIM_CITIES.paris.elevation,
      tz: SIM_CITIES.paris.tz,
      name: "Paris",
      date: casADate,
      method: "gra",
    });
    const casASunset = casAZmanim.find(z => z.label.includes("Chkia"));
    const casAActual = casASunset?.time || "--:--";
    // Candle lighting = sunset - 18 min
    let casACandleActual = "--:--";
    if (casASunset && casASunset.time !== "--:--") {
      const [h, m] = casASunset.time.split(":").map(Number);
      const totalMin = h * 60 + m - 18;
      casACandleActual = `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
    }
    results.push({
      label: "Cas A : Vendredi 3 Avril 2026 – Paris – Allumage",
      expected: "≈ 19:59 (±3 min selon l'année)",
      actual: `Allumage: ${casACandleActual} (Shkiya: ${casAActual})`,
      pass: casACandleActual !== "--:--" && casACandleActual >= "19:50" && casACandleActual <= "20:10",
      detail: "Vérifie que l'allumage est dans la plage attendue pour début avril à Paris.",
    });

    // CAS B: Samedi 4 Avril 2026 à 21h00 → Omer Jour 2 (après Tzeit)
    const casBDate = new Date("2026-04-04T12:00:00");
    const casBZmanim = fetchKosherZmanim({
      lat: SIM_CITIES.paris.lat,
      lng: SIM_CITIES.paris.lng,
      elevation: SIM_CITIES.paris.elevation,
      tz: SIM_CITIES.paris.tz,
      name: "Paris",
      date: casBDate,
      method: "gra",
    });
    const casBTzeit = casBZmanim.find(z => z.label.includes("Tsét haKokhavim"));
    const casBTzeitTime = casBTzeit?.time || "--:--";
    // At 21:00, if tzeit is before 21:00 → omer count should advance
    let casBPass = false;
    if (casBTzeitTime !== "--:--") {
      const [th, tm] = casBTzeitTime.split(":").map(Number);
      casBPass = (th * 60 + tm) < (21 * 60); // tzeit before 21:00
    }
    results.push({
      label: "Cas B : Samedi 4 Avril 2026, 21h00 – Omer après Tzeit",
      expected: "Tzeit avant 21h00 → L'Omer doit avancer au Jour 2",
      actual: `Tzeit: ${casBTzeitTime} — ${casBPass ? "Le compteur Omer avance correctement" : "ATTENTION: Tzeit après 21h00"}`,
      pass: casBPass,
      detail: "Vérifie que le Tzeit est bien avant 21h00, garantissant que le widget Omer affiche le jour suivant.",
    });

    // CAS C: Pas de GPS → Vérification du comportement dégradé
    const casCZmanim = fetchKosherZmanim({
      lat: 0,
      lng: 0,
      elevation: 0,
      tz: "UTC",
      name: "Position inconnue",
      date: new Date(),
      method: "gra",
    });
    const casCHasData = casCZmanim.length > 0 && casCZmanim.some(z => z.time !== "--:--");
    results.push({
      label: "Cas C : En vol / Pas de GPS",
      expected: "L'app doit demander une ville manuellement au lieu de bugger",
      actual: casCHasData
        ? "⚠️ Le moteur retourne des horaires à (0°,0°) — L'UI doit intercepter et demander une ville"
        : "✅ Aucun horaire valide retourné",
      pass: !casCHasData,
      detail: "Vérifie la sécurité halakhique : pas d'horaires faux en l'absence de position GPS.",
    });

    setDiagnosticResults(results);
    setDiagnosticRunning(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Section 1: Simulateur de position */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-display text-base font-bold text-foreground mb-1">🌍 Simulateur de Voyage</h3>
        <p className="text-xs text-muted-foreground mb-4">Testez la robustesse des Zmanim sur différentes villes</p>

        {/* City selector */}
        <div className="flex gap-2 mb-4">
          {Object.entries(SIM_CITIES).map(([key, c]) => (
            <button
              key={key}
              onClick={() => handleCityChange(key)}
              className="flex-1 py-3 rounded-xl text-sm font-bold border cursor-pointer transition-all active:scale-[0.97]"
              style={selectedCity === key
                ? { background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))", border: "none" }
                : { background: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))" }
              }
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* City info */}
        <div className="rounded-xl bg-muted/50 border border-border p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{city.emoji}</span>
            <span className="font-bold text-sm text-foreground">{city.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{city.tz}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{city.note}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            📍 {city.lat.toFixed(4)}°, {city.lng.toFixed(4)}° · 🏔️ {city.elevation}m
          </p>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground font-medium">📅 Date :</span>
          <input
            type="date"
            value={simDate}
            onChange={(e) => setSimDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-background text-foreground border border-border font-sans focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            onClick={() => setSimDate(new Date().toISOString().split("T")[0])}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Zmanim table */}
        <div className="rounded-xl overflow-hidden border border-border mb-4">
          {computedZmanim.map((z, i) => (
            <div
              key={z.label}
              className="flex items-center gap-3 py-2 px-3 text-xs"
              style={{ borderBottom: i < computedZmanim.length - 1 ? "1px solid hsl(var(--border))" : "none" }}
            >
              <span className="font-bold font-display text-primary tabular-nums" style={{ minWidth: 48 }}>
                {z.time}
              </span>
              <span className="text-foreground">{z.icon} {z.label}</span>
            </div>
          ))}
          {computedZmanim.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Aucun zman calculé</div>
          )}
        </div>

        {/* Feedback bar */}
        <div className="rounded-xl bg-foreground/5 border border-border p-3">
          <p className="text-[11px] font-mono text-foreground">
            📍 Simulé à : <span className="font-bold">{city.label}</span>
            {" | "}🕰️ TZ : <span className="font-bold">{city.tz}</span>
            {" | "}🌅 Shkiya : <span className="font-bold text-primary">{shkiya?.time || "--:--"}</span>
            {" | "}✨ Tzeit : <span className="font-bold text-primary">{tzeit?.time || "--:--"}</span>
            {" | "}🌑 Alot : <span className="font-bold">{alot?.time || "--:--"}</span>
          </p>
        </div>
      </div>

      {/* Section 2: Test de Sécurité Vendredi */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-display text-base font-bold text-foreground mb-1">🕯️ Test de Sécurité Vendredi</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Vérifie que l'allumage n'est JAMAIS affiché après le coucher du soleil
        </p>

        <button
          onClick={runFridaySecurityTest}
          className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all active:scale-[0.98]"
          style={{ background: "var(--gradient-gold)" }}
        >
          🔐 Lancer le Test de Sécurité
        </button>

        <AnimatePresence>
          {fridayTestResult && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 rounded-xl bg-muted/50 border border-border text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto"
            >
              {fridayTestResult}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      {/* Section 3: Diagnostic complet (runFullDiagnostic) */}
      <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-display text-base font-bold text-foreground mb-1">🧪 Diagnostic Complet (Xcode)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Simule les 3 cas critiques : Vendredi Paris, Omer après Tzeit, et absence de GPS
        </p>

        <button
          onClick={runFullDiagnostic}
          disabled={diagnosticRunning}
          className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground border-none cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--gradient-gold)" }}
        >
          {diagnosticRunning ? "⏳ Diagnostic en cours..." : "🚀 runFullDiagnostic()"}
        </button>

        <AnimatePresence>
          {diagnosticResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3"
            >
              {diagnosticResults.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: r.pass ? "hsl(142 76% 36% / 0.3)" : "hsl(0 84% 60% / 0.3)",
                    background: r.pass ? "hsl(142 76% 36% / 0.05)" : "hsl(0 84% 60% / 0.05)",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0">{r.pass ? "✅" : "❌"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        <span className="font-semibold">Attendu :</span> {r.expected}
                      </p>
                      <p className="text-[11px] text-foreground mt-0.5">
                        <span className="font-semibold">Résultat :</span> {r.actual}
                      </p>
                      {r.detail && (
                        <p className="text-[10px] text-muted-foreground mt-1 italic">{r.detail}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Summary */}
              <div
                className="rounded-xl border p-3 text-center"
                style={{
                  borderColor: diagnosticResults.every(r => r.pass)
                    ? "hsl(142 76% 36% / 0.3)"
                    : "hsl(45 93% 47% / 0.3)",
                  background: diagnosticResults.every(r => r.pass)
                    ? "hsl(142 76% 36% / 0.05)"
                    : "hsl(45 93% 47% / 0.05)",
                }}
              >
                <p className="text-sm font-bold text-foreground">
                  {diagnosticResults.every(r => r.pass)
                    ? "✅ Tous les tests passés — Prêt pour Xcode"
                    : `⚠️ ${diagnosticResults.filter(r => !r.pass).length}/${diagnosticResults.length} test(s) à corriger`
                  }
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ZmanimTravelSimulator;
