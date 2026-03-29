import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";

// ─── Psalm 67 (Lamnatséa'h) ───
const PSALM_67 = `לַמְנַצֵּחַ בִּנְגִינֹת מִזְמוֹר שִׁיר:
אֱלֹהִים יְחָנֵּנוּ וִיבָרְכֵנוּ, יָאֵר פָּנָיו אִתָּנוּ סֶלָה:
לָדַעַת בָּאָרֶץ דַּרְכֶּךָ, בְּכָל גּוֹיִם יְשׁוּעָתֶךָ:
יוֹדוּךָ עַמִּים אֱלֹהִים, יוֹדוּךָ עַמִּים כֻּלָּם:
יִשְׂמְחוּ וִירַנְּנוּ לְאֻמִּים, כִּי תִשְׁפֹּט עַמִּים מִישֹׁר, וּלְאֻמִּים בָּאָרֶץ תַּנְחֵם סֶלָה:
יוֹדוּךָ עַמִּים אֱלֹהִים, יוֹדוּךָ עַמִּים כֻּלָּם:
אֶרֶץ נָתְנָה יְבוּלָהּ, יְבָרְכֵנוּ אֱלֹהִים אֱלֹהֵינוּ:
יְבָרְכֵנוּ אֱלֹהִים, וְיִירְאוּ אוֹתוֹ כָּל אַפְסֵי אָרֶץ:`;

// ─── Ana BeKhoa'h – 7 lines (one per week of the Omer) ───
const ANA_BEKHOACH_LINES = [
  "אָנָּא בְּכֹחַ גְּדֻלַּת יְמִינְךָ, תַּתִּיר צְרוּרָה:",
  "קַבֵּל רִנַּת עַמְּךָ, שַׂגְּבֵנוּ טַהֲרֵנוּ נוֹרָא:",
  "נָא גִבּוֹר, דּוֹרְשֵׁי יִחוּדְךָ, כְּבָבַת שָׁמְרֵם:",
  "בָּרְכֵם טַהֲרֵם, רַחֲמֵי צִדְקָתְךָ תָּמִיד גָּמְלֵם:",
  "חֲסִין קָדוֹשׁ, בְּרוֹב טוּבְךָ נַהֵל עֲדָתֶךָ:",
  "יָחִיד גֵּאֶה, לְעַמְּךָ פְּנֵה, זוֹכְרֵי קְדֻשָּׁתֶךָ:",
  "שַׁוְעָתֵנוּ קַבֵּל, וּשְׁמַע צַעֲקָתֵנוּ, יוֹדֵעַ תַּעֲלוּמוֹת:",
];

const ANA_BEKHOACH_WHISPER = "בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד:";

// ─── Yehi Ratson ───
const YEHI_RATSON = `יְהִי רָצוֹן מִלְּפָנֶיךָ יְיָ אֱלֹהֵינוּ וֵאלֹהֵי אֲבוֹתֵינוּ, שֶׁבִּזְכוּת סְפִירַת הָעֹמֶר שֶׁסָּפַרְתִּי הַיּוֹם, יְתֻקַּן מַה שֶׁפָּגַמְתִּי בִּסְפִירָה, וְאֶטָּהֵר וְאֶתְקַדֵּשׁ בִּקְדֻשָּׁה שֶׁל מַעְלָה. וְעַל יְדֵי זֶה יֻשְׁפַּע שֶׁפַע רַב בְּכָל הָעוֹלָמוֹת, וּלְתַקֵּן אֶת נַפְשׁוֹתֵינוּ וְרוּחוֹתֵינוּ וְנִשְׁמוֹתֵינוּ מִכָּל סִיג וּפְגָם, וּלְטַהֲרֵנוּ וּלְקַדְּשֵׁנוּ בִּקְדֻשָּׁתְךָ הָעֶלְיוֹנָה. אָמֵן סֶלָה.`;

const hebrewTextStyle: React.CSSProperties = {
  fontFamily: "'David Libre', 'Frank Ruhl Libre', serif",
  fontSize: "17px",
  direction: "rtl",
  lineHeight: "2",
  color: "hsl(var(--foreground))",
};

interface OmerPostCountRitualProps {
  currentWeek: number; // 0-indexed week (0–6)
}

const OmerPostCountRitual = ({ currentWeek }: OmerPostCountRitualProps) => {
  const [showRitual, setShowRitual] = useState(false);

  return (
    <div className="bg-card border-t border-border">
      <button
        onClick={() => setShowRitual(!showRitual)}
        className="w-full px-5 py-3 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer border-none bg-transparent transition-all"
        style={{ color: "hsl(var(--gold-matte))" }}
      >
        <BookOpen size={14} />
        {showRitual ? "Masquer le rituel ▲" : "📜 Continuer le rituel (Psaume 67 & Ana BeKhoa'h) ▼"}
      </button>

      <AnimatePresence>
        {showRitual && (
          <motion.div
            className="px-5 pb-5 space-y-5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* ─── Psalm 67 ─── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">📖</span>
                <h3
                  className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ color: "hsl(var(--gold-matte))" }}
                >
                  Psaume 67 — Lamnatséa'h
                </h3>
              </div>
              <div
                className="p-4 rounded-xl text-right whitespace-pre-line"
                style={{
                  ...hebrewTextStyle,
                  background: "hsl(var(--gold) / 0.05)",
                }}
              >
                {PSALM_67}
              </div>
            </div>

            {/* ─── Ana BeKhoa'h ─── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">✡️</span>
                <h3
                  className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ color: "hsl(var(--gold-matte))" }}
                >
                  Ana BeKhoa'h
                </h3>
                <span className="text-[9px] text-muted-foreground ml-auto italic">
                  Semaine {currentWeek + 1} en gras
                </span>
              </div>
              <div
                className="p-4 rounded-xl space-y-1.5"
                style={{
                  background: "hsl(var(--gold) / 0.05)",
                  direction: "rtl",
                }}
              >
                {ANA_BEKHOACH_LINES.map((line, idx) => {
                  const isCurrentWeek = idx === currentWeek;
                  return (
                    <div
                      key={idx}
                      className="p-1.5 rounded-lg transition-all"
                      style={{
                        ...hebrewTextStyle,
                        fontWeight: isCurrentWeek ? 800 : 400,
                        fontSize: isCurrentWeek ? "19px" : "17px",
                        background: isCurrentWeek ? "hsl(var(--gold) / 0.12)" : "transparent",
                        boxShadow: isCurrentWeek ? "inset 3px 0 0 hsl(var(--gold))" : "none",
                      }}
                    >
                      {line}
                    </div>
                  );
                })}
                {/* Whispered conclusion */}
                <div
                  className="pt-2 mt-2 border-t"
                  style={{
                    ...hebrewTextStyle,
                    fontSize: "14px",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                    fontStyle: "italic",
                  }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ direction: "ltr", display: "block", textAlign: "left", color: "hsl(var(--muted-foreground))" }}>
                    (à voix basse)
                  </span>
                  {ANA_BEKHOACH_WHISPER}
                </div>
              </div>
            </div>

            {/* ─── Yehi Ratson ─── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🤲</span>
                <h3
                  className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ color: "hsl(var(--gold-matte))" }}
                >
                  Yéhi Ratsone
                </h3>
              </div>
              <div
                className="p-4 rounded-xl text-right"
                style={{
                  ...hebrewTextStyle,
                  fontSize: "15px",
                  background: "hsl(var(--gold) / 0.03)",
                  lineHeight: "1.9",
                }}
              >
                {YEHI_RATSON}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OmerPostCountRitual;
