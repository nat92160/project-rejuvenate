import { forwardRef } from "react";
import { getSefiratDay, getOmerBlessing } from "@/components/omer/omerData";

interface OmerShareCardProps {
  day: number;
}

const GOLD = "#996515";
const GOLD_LIGHT = "#C9A45C";
const GOLD_DARK = "#7A5010";
const CREAM = "#FAF6EF";
const TEXT_BODY = "#5C4A2E";
const TEXT_LIGHT = "#8A7451";

const PSALM_67_HEBREW = `לַמְנַצֵּ֥חַ בִּנְגִינֹ֗ת מִזְמ֥וֹר שִֽׁיר׃
אֱלֹהִ֗ים יְחָנֵּ֥נוּ וִֽיבָרְכֵ֑נוּ יָ֤אֵ֥ר פָּנָ֖יו אִתָּ֣נוּ סֶֽלָה׃
לָדַ֣עַת בָּאָ֣רֶץ דַּרְכֶּ֑ךָ בְּכָל־גּ֝וֹיִ֗ם יְשׁוּעָתֶֽךָ׃
יוֹד֖וּךָ עַמִּ֥ים ׀ אֱלֹהִ֑ים י֝וֹד֗וּךָ עַמִּ֥ים כֻּלָּֽם׃
יִֽשְׂמְח֥וּ וִֽירַנְּנ֗וּ לְאֻ֫מִּ֥ים כִּֽי־תִשְׁפֹּ֣ט עַמִּ֣ים מִישֹׁ֑ר וּלְאֻמִּ֓ים ׀ בָּאָ֖רֶץ תַּנְחֵ֣ם סֶֽלָה׃
יוֹד֖וּךָ עַמִּ֥ים ׀ אֱלֹהִ֑ים י֝וֹד֗וּךָ עַמִּ֥ים כֻּלָּֽם׃
אֶ֗רֶץ נָתְנָ֥ה יְבוּלָ֑הּ יְ֝בָרְכֵ֗נוּ אֱלֹהִ֥ים אֱלֹהֵֽינוּ׃
יְבָרְכֵ֥נוּ אֱלֹהִ֑ים וְיִֽירְא֥וּ א֝וֹת֗וֹ כָּל־אַפְסֵי־אָֽרֶץ׃`;

const ANA_BEKOACH_HEBREW = `אָנָּא בְּכֹחַ גְּדֻלַּת יְמִינְךָ תַּתִּיר צְרוּרָה.
קַבֵּל רִנַּת עַמְּךָ, שַׂגְּבֵנוּ, טַהֲרֵנוּ, נוֹרָא.
נָא גִבּוֹר, דּוֹרְשֵׁי יִחוּדְךָ, כְּבָבַת שָׁמְרֵם.
בָּרְכֵם, טַהֲרֵם, רַחֲמֵי צִדְקָתְךָ תָּמִיד גָּמְלֵם.
חֲסִין קָדוֹשׁ, בְּרֹב טוּבְךָ נַהֵל עֲדָתֶךָ.
יָחִיד גֵּאֶה, לְעַמְּךָ פְּנֵה, זוֹכְרֵי קְדֻשָּׁתֶךָ.
שַׁוְעָתֵנוּ קַבֵּל, וּשְׁמַע צַעֲקָתֵנוּ, יוֹדֵעַ תַּעֲלוּמוֹת.
בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.`;

const OmerShareCard = forwardRef<HTMLDivElement, OmerShareCardProps>(({ day }, ref) => {
  const sefira = getSefiratDay(day);
  const blessing = getOmerBlessing(day);

  return (
    <div
      ref={ref}
      style={{
        width: 600,
        background: CREAM,
        fontFamily: "'Lora', 'Georgia', serif",
        color: GOLD_DARK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 32px 24px",
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

      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 16, marginBottom: 8, marginTop: 4,
      }}>
        <div style={{
          fontSize: 9, letterSpacing: 5, fontWeight: 700, textTransform: "uppercase",
          color: GOLD,
        }}>
          Séfirat HaOmer
        </div>
        <div style={{ width: 1, height: 16, background: `${GOLD}44` }} />
        <div style={{
          fontFamily: "'Playfair Display', 'Georgia', serif",
          fontSize: 32, fontWeight: 900, color: GOLD_DARK, lineHeight: 1,
        }}>
          Jour {day}
        </div>
      </div>

      {/* Séfira badge */}
      <div style={{
        background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
        borderRadius: 20, padding: "6px 18px",
        fontSize: 11, fontWeight: 700, color: "#FFFFFF",
        letterSpacing: 0.5, marginBottom: 16,
      }}>
        {sefira.attribute} · {sefira.within}
      </div>

      {/* ── Brakha + Décompte ── */}
      <SectionBlock title="בְּרָכָה וּסְפִירָה">
        <HebrewText>{blessing.hebrew}</HebrewText>
      </SectionBlock>

      {/* ── Psaume 67 ── */}
      <SectionBlock title="תהלים סז — Psaume 67">
        <HebrewText size={13}>{PSALM_67_HEBREW}</HebrewText>
      </SectionBlock>

      {/* ── Ana BeKoach ── */}
      <SectionBlock title="אָנָּא בְּכֹחַ — Ana BeKoach">
        <HebrewText size={14}>{ANA_BEKOACH_HEBREW}</HebrewText>
      </SectionBlock>

      {/* Phonetic */}
      <LightBlock title="Phonétique">
        <div style={{
          fontSize: 11, lineHeight: 1.7, fontStyle: "italic",
          color: TEXT_LIGHT, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {blessing.phonetic}
        </div>
      </LightBlock>

      {/* Translation */}
      <LightBlock title="Traduction">
        <div style={{
          fontSize: 11, lineHeight: 1.7,
          color: TEXT_BODY, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {blessing.french}
        </div>
      </LightBlock>

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", marginTop: 8,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: GOLD, fontWeight: 700, opacity: 0.6 }}>
          CHABBAT CHALOM
        </div>
        <div style={{
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT})`,
          borderRadius: 8, padding: "6px 16px",
          fontSize: 11, fontWeight: 800, color: "#FFFFFF",
        }}>
          chabbat-chalom.com/omer
        </div>
      </div>
    </div>
  );
});

/* ── Reusable sub-components (inline for html2canvas compat) ── */

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", background: "#FFFFFF",
      border: `1px solid ${GOLD}33`, borderRadius: 12,
      padding: "14px 18px", marginBottom: 10,
    }}>
      <div style={{
        fontSize: 9, letterSpacing: 3, fontWeight: 700, textTransform: "uppercase",
        color: GOLD, textAlign: "center", marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function HebrewText({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  return (
    <div style={{
      fontFamily: "'David Libre', 'Frank Ruhl Libre', 'Times New Roman', serif",
      fontSize: size, lineHeight: 1.9,
      direction: "rtl", textAlign: "right",
      color: GOLD_DARK, whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>
      {children}
    </div>
  );
}

function LightBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%",
      background: `${GOLD}08`, border: `1px solid ${GOLD}1A`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 8,
    }}>
      <div style={{
        fontSize: 7, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase",
        color: GOLD, marginBottom: 6,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

OmerShareCard.displayName = "OmerShareCard";
export default OmerShareCard;
