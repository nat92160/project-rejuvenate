import { forwardRef } from "react";
import { getSefiratDay, getOmerBlessing } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const GOLD = "#996515";
const GOLD_LIGHT = "#C9A45C";
const GOLD_DARK = "#7A5010";
const CREAM = "#FAF6EF";
const TEXT_LIGHT = "#8A7451";

const PSALM_67_HEBREW = `לַמְנַצֵּ֥חַ בִּנְגִינֹ֗ת מִזְמ֥וֹר שִֽׁיר׃ אֱלֹהִ֗ים יְחָנֵּ֥נוּ וִֽיבָרְכֵ֑נוּ יָ֤אֵ֥ר פָּנָ֖יו אִתָּ֣נוּ סֶֽלָה׃ לָדַ֣עַת בָּאָ֣רֶץ דַּרְכֶּ֑ךָ בְּכָל־גּ֝וֹיִ֗ם יְשׁוּעָתֶֽךָ׃ יוֹד֖וּךָ עַמִּ֥ים ׀ אֱלֹהִ֑ים י֝וֹד֗וּךָ עַמִּ֥ים כֻּלָּֽם׃ יִֽשְׂמְח֥וּ וִֽירַנְּנ֗וּ לְאֻ֫מִּ֥ים כִּֽי־תִשְׁפֹּ֣ט עַמִּ֣ים מִישֹׁ֑ר וּלְאֻמִּ֓ים ׀ בָּאָ֖רֶץ תַּנְחֵ֣ם סֶֽלָה׃ יוֹד֖וּךָ עַמִּ֥ים ׀ אֱלֹהִ֑ים י֝וֹד֗וּךָ עַמִּ֥ים כֻּלָּֽם׃ אֶ֗רֶץ נָתְנָ֥ה יְבוּלָ֑הּ יְ֝בָרְכֵ֗נוּ אֱלֹהִ֥ים אֱלֹהֵֽינוּ׃ יְבָרְכֵ֥נוּ אֱלֹהִ֑ים וְיִֽירְא֥וּ א֝וֹת֗וֹ כָּל־אַפְסֵי־אָֽרֶץ׃`;

const ANA_BEKOACH_HEBREW = `אָנָּא בְּכֹחַ גְּדֻלַּת יְמִינְךָ תַּתִּיר צְרוּרָה. קַבֵּל רִנַּת עַמְּךָ, שַׂגְּבֵנוּ, טַהֲרֵנוּ, נוֹרָא. נָא גִבּוֹר, דּוֹרְשֵׁי יִחוּדְךָ, כְּבָבַת שָׁמְרֵם. בָּרְכֵם, טַהֲרֵם, רַחֲמֵי צִדְקָתְךָ תָּמִיד גָּמְלֵם. חֲסִין קָדוֹשׁ, בְּרֹב טוּבְךָ נַהֵל עֲדָתֶךָ. יָחִיד גֵּאֶה, לְעַמְּךָ פְּנֵה, זוֹכְרֵי קְדֻשָּׁתֶךָ. שַׁוְעָתֵנוּ קַבֵּל, וּשְׁמַע צַעֲקָתֵנוּ, יוֹדֵעַ תַּעֲלוּמוֹת. בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.`;

const OmerShareCard = forwardRef<HTMLDivElement, OmerShareCardProps>(({ day }, ref) => {
  const sefira = getSefiratDay(day);
  const blessing = getOmerBlessing(day);

  return (
    <div
      ref={ref}
      style={{
        width: 680,
        background: CREAM,
        fontFamily: "'Lora', 'Georgia', serif",
        color: GOLD_DARK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px 28px 18px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Top gold line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT}, ${GOLD})`,
      }} />

      {/* Header: title + day + sefira — single compact line */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 12, marginBottom: 12, marginTop: 4, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 8, letterSpacing: 4, fontWeight: 700, textTransform: "uppercase", color: GOLD }}>
          Séfirat HaOmer
        </div>
        <div style={{ width: 1, height: 14, background: `${GOLD}44` }} />
        <div style={{
          fontFamily: "'Playfair Display', 'Georgia', serif",
          fontSize: 26, fontWeight: 900, color: GOLD_DARK, lineHeight: 1,
        }}>
          Jour {day}
        </div>
        <div style={{ width: 1, height: 14, background: `${GOLD}44` }} />
        <div style={{
          fontSize: 10, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: 0.5,
        }}>
          {sefira.attribute} · {sefira.within}
        </div>
      </div>

      {/* Brakha — compact */}
      <CompactSection title="בְּרָכָה וּסְפִירָה">
        {blessing.hebrew}
      </CompactSection>

      {/* Psaume 67 + Ana BeKoach side by side */}
      <div style={{ width: "100%", display: "flex", gap: 6, marginBottom: 8 }}>
        <CompactSection title="תהלים סז" size={11} flex>
          {PSALM_67_HEBREW}
        </CompactSection>
        <CompactSection title="אָנָּא בְּכֹחַ" size={11} flex>
          {ANA_BEKOACH_HEBREW}
        </CompactSection>
      </div>

      {/* Phonetic — small italic */}
      <div style={{
        width: "100%", background: `${GOLD}08`, border: `1px solid ${GOLD}1A`,
        borderRadius: 8, padding: "8px 12px", marginBottom: 10,
      }}>
        <div style={{ fontSize: 7, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", color: GOLD, marginBottom: 4 }}>
          Phonétique
        </div>
        <div style={{
          fontSize: 10, lineHeight: 1.6, fontStyle: "italic",
          color: TEXT_LIGHT, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {blessing.phonetic}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
      }}>
        <div style={{ fontSize: 8, letterSpacing: 2, color: GOLD, fontWeight: 700, opacity: 0.5 }}>
          CHABBAT CHALOM
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
          borderRadius: 6, padding: "5px 14px",
          fontSize: 10, fontWeight: 800, color: "#FFFFFF",
        }}>
          chabbat-chalom.com/omer
        </div>
      </div>
    </div>
  );
});

function CompactSection({ title, children, size = 13, flex = false }: {
  title: string; children: React.ReactNode; size?: number; flex?: boolean;
}) {
  return (
    <div style={{
      ...(flex ? { flex: 1 } : { width: "100%" }),
      background: "#FFFFFF",
      border: `1px solid ${GOLD}22`, borderRadius: 10,
      padding: "10px 14px", marginBottom: flex ? 0 : 8,
    }}>
      <div style={{
        fontSize: 7, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase",
        color: GOLD, textAlign: "center", marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: "'David Libre', 'Frank Ruhl Libre', 'Times New Roman', serif",
        fontSize: size, lineHeight: 1.7,
        direction: "rtl", textAlign: "right",
        color: GOLD_DARK, whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {children}
      </div>
    </div>
  );
}

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
