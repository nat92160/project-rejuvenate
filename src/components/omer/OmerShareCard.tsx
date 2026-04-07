import { forwardRef } from "react";
import { getSefiratDay, getOmerBlessing } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const NAVY = "#001F3F";
const GOLD = "#996515";
const GOLD_LIGHT = "#C9A45C";
const CREAM = "#FAF6EF";

const PSALM_67_HEBREW = `לַמְנַצֵּחַ בִּנְגִינֹת מִזְמוֹר שִׁיר. אֱלֹהִים יְחָנֵּנוּ וִיבָרְכֵנוּ יָאֵר פָּנָיו אִתָּנוּ סֶלָה. לָדַעַת בָּאָרֶץ דַּרְכֶּךָ בְּכָל גּוֹיִם יְשׁוּעָתֶךָ. יוֹדוּךָ עַמִּים אֱלֹהִים יוֹדוּךָ עַמִּים כֻּלָּם. יִשְׂמְחוּ וִירַנְּנוּ לְאֻמִּים כִּי תִשְׁפֹּט עַמִּים מִישֹׁר וּלְאֻמִּים בָּאָרֶץ תַּנְחֵם סֶלָה. יוֹדוּךָ עַמִּים אֱלֹהִים יוֹדוּךָ עַמִּים כֻּלָּם. אֶרֶץ נָתְנָה יְבוּלָהּ יְבָרְכֵנוּ אֱלֹהִים אֱלֹהֵינוּ. יְבָרְכֵנוּ אֱלֹהִים וְיִירְאוּ אוֹתוֹ כָּל אַפְסֵי אָרֶץ.`;

const ANA_BEKOACH_HEBREW = `אָנָּא בְּכֹחַ גְּדֻלַּת יְמִינְךָ תַּתִּיר צְרוּרָה. קַבֵּל רִנַּת עַמְּךָ שַׂגְּבֵנוּ טַהֲרֵנוּ נוֹרָא. נָא גִבּוֹר דּוֹרְשֵׁי יִחוּדְךָ כְּבָבַת שָׁמְרֵם. בָּרְכֵם טַהֲרֵם רַחֲמֵי צִדְקָתְךָ תָּמִיד גָּמְלֵם. חֲסִין קָדוֹשׁ בְּרֹב טוּבְךָ נַהֵל עֲדָתֶךָ. יָחִיד גֵּאֶה לְעַמְּךָ פְּנֵה זוֹכְרֵי קְדֻשָּׁתֶךָ. שַׁוְעָתֵנוּ קַבֵּל וּשְׁמַע צַעֲקָתֵנוּ יוֹדֵעַ תַּעֲלוּמוֹת. בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.`;

const OmerShareCard = forwardRef<HTMLDivElement, OmerShareCardProps>(({ day }, ref) => {
  const sefira = getSefiratDay(day);
  const blessing = getOmerBlessing(day);

  return (
    <div
      ref={ref}
      style={{
        width: 720,
        background: CREAM,
        fontFamily: "'Lora', 'Georgia', serif",
        color: NAVY,
        display: "flex",
        flexDirection: "column",
        padding: "18px 24px 14px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Gold top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`,
      }} />

      {/* Header panel with two horizontal lines and centered Jour */}
      <div style={{
        position: "relative",
        marginBottom: 14, marginTop: 8,
        paddingTop: 8, paddingBottom: 8,
      }}>
        {/* Top horizontal gold line */}
        <div style={{
          position: "absolute", top: 0, left: 24, right: 24,
          height: 1, background: `${GOLD}55`,
        }} />
        {/* Bottom horizontal gold line */}
        <div style={{
          position: "absolute", bottom: 0, left: 24, right: 24,
          height: 1, background: `${GOLD}55`,
        }} />

        {/* Content row */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: 56,
        }}>
          {/* Left: SÉFIRAT HAOMER */}
          <span style={{
            fontSize: 10, letterSpacing: 4, fontWeight: 700,
            textTransform: "uppercase" as const, color: GOLD,
            position: "absolute", left: 28,
          }}>
            Séfirat HaOmer
          </span>

          {/* Center: Jour N — 50% larger (54px) */}
          <span style={{
            fontFamily: "'Playfair Display', 'Georgia', serif",
            fontSize: 54, fontWeight: 900, color: NAVY,
            lineHeight: "1",
          }}>
            Jour {day}
          </span>

          {/* Right: Sefira attribute */}
          <span style={{
            fontSize: 13, fontWeight: 700, color: GOLD,
            position: "absolute", right: 28,
          }}>
            {sefira.attribute} · {sefira.within}
          </span>
        </div>
      </div>

      {/* Brakha */}
      <HebrewBlock title="בְּרָכָה וּסְפִירָה" fontSize={17}>
        {blessing.hebrew}
      </HebrewBlock>

      {/* Two columns */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <HebrewBlock title="תהלים סז" fontSize={15} flex>
          {PSALM_67_HEBREW}
        </HebrewBlock>
        <HebrewBlock title="אָנָּא בְּכֹחַ" fontSize={15} flex>
          {ANA_BEKOACH_HEBREW}
        </HebrewBlock>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 8, letterSpacing: 2, color: GOLD, fontWeight: 700, opacity: 0.5 }}>
          CHABBAT CHALOM
        </span>
        <span style={{
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
          borderRadius: 6, padding: "4px 12px",
          fontSize: 10, fontWeight: 800, color: "#FFFFFF",
        }}>
          chabbat-chalom.com/omer
        </span>
      </div>
    </div>
  );
});

function HebrewBlock({ title, children, fontSize = 15, flex = false }: {
  title: string; children: React.ReactNode; fontSize?: number; flex?: boolean;
}) {
  return (
    <div style={{
      ...(flex ? { flex: 1, minWidth: 0 } : { width: "100%" }),
      background: "#FFFFFF",
      border: `1px solid ${GOLD}22`, borderRadius: 10,
      padding: "8px 14px", marginBottom: flex ? 0 : 8,
    }}>
      <div style={{
        fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" as const,
        color: GOLD, textAlign: "center" as const, marginBottom: 4,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: "'David Libre', 'Frank Ruhl Libre', 'Times New Roman', serif",
        fontSize, lineHeight: 1.8,
        direction: "rtl" as const, textAlign: "justify" as const,
        color: "#001F3F",
        wordBreak: "break-word" as const,
        overflowWrap: "break-word" as const,
      }}>
        {children}
      </div>
    </div>
  );
}

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
