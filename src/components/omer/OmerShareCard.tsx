import { forwardRef } from "react";
import { getSefiratDay, getOmerBlessing } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const GOLD = "#996515";
const GOLD_LIGHT = "#C9A45C";
const GOLD_DARK = "#7A5010";
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
        color: GOLD_DARK,
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px 14px",
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

      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 14, marginBottom: 10, marginTop: 2,
      }}>
        <span style={{ fontSize: 9, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase" as const, color: GOLD }}>
          Séfirat HaOmer
        </span>
        <span style={{ width: 1, height: 16, background: `${GOLD}44`, display: "inline-block" }} />
        <span style={{
          fontFamily: "'Playfair Display', 'Georgia', serif",
          fontSize: 30, fontWeight: 900, color: GOLD_DARK, lineHeight: 1,
        }}>
          Jour {day}
        </span>
        <span style={{ width: 1, height: 16, background: `${GOLD}44`, display: "inline-block" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: GOLD_LIGHT }}>
          {sefira.attribute} · {sefira.within}
        </span>
      </div>

      {/* Brakha */}
      <HebrewBlock title="בְּרָכָה וּסְפִירָה" fontSize={15}>
        {blessing.hebrew}
      </HebrewBlock>

      {/* Two columns: Psalm 67 + Ana BeKoach */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <HebrewBlock title="תהלים סז" fontSize={13} flex>
          {PSALM_67_HEBREW}
        </HebrewBlock>
        <HebrewBlock title="אָנָּא בְּכֹחַ" fontSize={13} flex>
          {ANA_BEKOACH_HEBREW}
        </HebrewBlock>
      </div>

      {/* Phonetic */}
      <div style={{
        background: `${GOLD}0A`, border: `1px solid ${GOLD}1A`,
        borderRadius: 8, padding: "6px 12px", marginBottom: 8,
      }}>
        <div style={{ fontSize: 8, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" as const, color: GOLD, marginBottom: 3 }}>
          Phonétique
        </div>
        <div style={{
          fontSize: 12, lineHeight: 1.5, fontStyle: "italic",
          color: "#8A7451", wordBreak: "break-word" as const,
        }}>
          {blessing.phonetic}
        </div>
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

function HebrewBlock({ title, children, fontSize = 13, flex = false }: {
  title: string; children: React.ReactNode; fontSize?: number; flex?: boolean;
}) {
  return (
    <div style={{
      ...(flex ? { flex: 1, minWidth: 0 } : { width: "100%" }),
      background: "#FFFFFF",
      border: `1px solid ${GOLD}22`, borderRadius: 10,
      padding: "8px 12px", marginBottom: flex ? 0 : 6,
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
        color: GOLD_DARK, wordBreak: "break-word" as const,
        overflowWrap: "break-word" as const,
      }}>
        {children}
      </div>
    </div>
  );
}

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
