export interface ParashaInfo {
  book: string;
  chapters: string;
  verses: number;
  haftara: string;
  dvar: string;
}

// Keys = French parasha name as returned by hebcal.ts (after "Paracha " prefix is stripped).
// Source: Hebcal leyning + classic Sephardic haftarot.
export const PARASHOT_DATA: Record<string, ParashaInfo> = {
  Bereshit: { book: "Bereshit (Genèse)", chapters: "1:1 – 6:8", verses: 146, haftara: "Isaïe 42:5-43:10", dvar: "La Création du monde et les premières générations de l'humanité." },
  Noach: { book: "Bereshit (Genèse)", chapters: "6:9 – 11:32", verses: 153, haftara: "Isaïe 54:1-55:5", dvar: "Le déluge, l'arche de Noé et la tour de Babel." },
  "Lech-Lecha": { book: "Bereshit (Genèse)", chapters: "12:1 – 17:27", verses: 126, haftara: "Isaïe 40:27-41:16", dvar: "L'appel d'Avraham et son alliance avec D.ieu." },
  Vayera: { book: "Bereshit (Genèse)", chapters: "18:1 – 22:24", verses: 147, haftara: "II Rois 4:1-37", dvar: "La visite des anges, Sodome et la ligature d'Isaac." },
  "Chayei Sara": { book: "Bereshit (Genèse)", chapters: "23:1 – 25:18", verses: 105, haftara: "I Rois 1:1-31", dvar: "Mort de Sara et mariage d'Isaac avec Rivka." },
  Toldot: { book: "Bereshit (Genèse)", chapters: "25:19 – 28:9", verses: 106, haftara: "Malachie 1:1-2:7", dvar: "Naissance d'Esaü et de Ya'akov, la bénédiction volée." },
  Vayetzei: { book: "Bereshit (Genèse)", chapters: "28:10 – 32:3", verses: 148, haftara: "Osée 11:7-12:14", dvar: "Le songe de l'échelle et le séjour de Ya'akov chez Lavan." },
  Vayishlach: { book: "Bereshit (Genèse)", chapters: "32:4 – 36:43", verses: 154, haftara: "Obadia 1:1-21", dvar: "La rencontre de Ya'akov et Esaü, le combat avec l'ange." },
  Vayeshev: { book: "Bereshit (Genèse)", chapters: "37:1 – 40:23", verses: 112, haftara: "Amos 2:6-3:8", dvar: "Joseph vendu par ses frères et emmené en Égypte." },
  Miketz: { book: "Bereshit (Genèse)", chapters: "41:1 – 44:17", verses: 146, haftara: "I Rois 3:15-4:1", dvar: "Joseph interprète les rêves de Pharaon et devient vice-roi." },
  Vayigash: { book: "Bereshit (Genèse)", chapters: "44:18 – 47:27", verses: 106, haftara: "Ézéchiel 37:15-28", dvar: "Joseph se révèle à ses frères ; Ya'akov descend en Égypte." },
  Vayechi: { book: "Bereshit (Genèse)", chapters: "47:28 – 50:26", verses: 85, haftara: "I Rois 2:1-12", dvar: "Bénédictions de Ya'akov à ses fils et fin du livre de la Genèse." },
  Shemot: { book: "Shemot (Exode)", chapters: "1:1 – 6:1", verses: 124, haftara: "Isaïe 27:6-28:13; 29:22-23", dvar: "L'asservissement en Égypte et l'appel de Moïse au Sinaï." },
  "Va'era": { book: "Shemot (Exode)", chapters: "6:2 – 9:35", verses: 121, haftara: "Ézéchiel 28:25-29:21", dvar: "Les sept premières plaies d'Égypte." },
  Bo: { book: "Shemot (Exode)", chapters: "10:1 – 13:16", verses: 106, haftara: "Jérémie 46:13-28", dvar: "Les trois dernières plaies, Pessa'h et la sortie d'Égypte." },
  Beshalach: { book: "Shemot (Exode)", chapters: "13:17 – 17:16", verses: 116, haftara: "Juges 5:1-31", dvar: "Traversée de la mer Rouge et chant de la mer." },
  Yitro: { book: "Shemot (Exode)", chapters: "18:1 – 20:23", verses: 75, haftara: "Isaïe 6:1-7:6; 9:5-6", dvar: "Don de la Torah et les Dix Commandements au Sinaï." },
  Mishpatim: { book: "Shemot (Exode)", chapters: "21:1 – 24:18", verses: 118, haftara: "Jérémie 34:8-22; 33:25-26", dvar: "Lois civiles, sociales et morales d'Israël." },
  Terumah: { book: "Shemot (Exode)", chapters: "25:1 – 27:19", verses: 96, haftara: "I Rois 5:26-6:13", dvar: "Construction du Michkan (Tabernacle) et de ses ustensiles." },
  Tetzaveh: { book: "Shemot (Exode)", chapters: "27:20 – 30:10", verses: 101, haftara: "Ézéchiel 43:10-27", dvar: "Vêtements sacerdotaux et consécration des Cohanim." },
  "Ki Tisa": { book: "Shemot (Exode)", chapters: "30:11 – 34:35", verses: 139, haftara: "I Rois 18:1-39", dvar: "Le veau d'or et les secondes Tables de la Loi." },
  Vayakhel: { book: "Shemot (Exode)", chapters: "35:1 – 38:20", verses: 122, haftara: "I Rois 7:40-50", dvar: "Réalisation du Michkan par Betsalel." },
  Pekudei: { book: "Shemot (Exode)", chapters: "38:21 – 40:38", verses: 92, haftara: "I Rois 7:51-8:21", dvar: "Comptes du Michkan et inauguration de la Présence divine." },
  Vayikra: { book: "Vayikra (Lévitique)", chapters: "1:1 – 5:26", verses: 111, haftara: "Isaïe 43:21-44:23", dvar: "Lois des sacrifices offerts dans le Sanctuaire." },
  Tzav: { book: "Vayikra (Lévitique)", chapters: "6:1 – 8:36", verses: 97, haftara: "Jérémie 7:21-8:3; 9:22-23", dvar: "Suite des sacrifices et inauguration des Cohanim." },
  Shmini: { book: "Vayikra (Lévitique)", chapters: "9:1 – 11:47", verses: 91, haftara: "II Samuel 6:1-7:17", dvar: "Mort de Nadav et Avihou ; lois de la cacherout." },
  Tazria: { book: "Vayikra (Lévitique)", chapters: "12:1 – 13:59", verses: 67, haftara: "II Rois 4:42-5:19", dvar: "Lois de pureté de la mère et de la lèpre (tsara'at)." },
  Metzora: { book: "Vayikra (Lévitique)", chapters: "14:1 – 15:33", verses: 90, haftara: "II Rois 7:3-20", dvar: "Purification du métsora et des impuretés corporelles." },
  "Achrei Mot": { book: "Vayikra (Lévitique)", chapters: "16:1 – 18:30", verses: 80, haftara: "Ézéchiel 22:1-19", dvar: "Service de Yom Kippour et lois sur les unions interdites." },
  Kedoshim: { book: "Vayikra (Lévitique)", chapters: "19:1 – 20:27", verses: 64, haftara: "Ézéchiel 20:2-20", dvar: "« Soyez saints » : lois éthiques et sociales fondamentales." },
  Emor: { book: "Vayikra (Lévitique)", chapters: "21:1 – 24:23", verses: 124, haftara: "Ézéchiel 44:15-31", dvar: "Lois sur les Cohanim et calendrier des fêtes." },
  Behar: { book: "Vayikra (Lévitique)", chapters: "25:1 – 26:2", verses: 57, haftara: "Jérémie 32:6-27", dvar: "Lois de la Chemita et du Yovel (année jubilaire)." },
  Bechukotai: { book: "Vayikra (Lévitique)", chapters: "26:3 – 27:34", verses: 78, haftara: "Jérémie 16:19-17:14", dvar: "Bénédictions et avertissements liés à l'observance." },
  Bamidbar: { book: "Bamidbar (Nombres)", chapters: "1:1 – 4:20", verses: 159, haftara: "Osée 2:1-22", dvar: "Recensement d'Israël dans le désert et organisation des tribus." },
  Nasso: { book: "Bamidbar (Nombres)", chapters: "4:21 – 7:89", verses: 176, haftara: "Juges 13:2-25", dvar: "Le Nazir, la sota et la bénédiction des Cohanim." },
  "Beha'alotcha": { book: "Bamidbar (Nombres)", chapters: "8:1 – 12:16", verses: 136, haftara: "Zacharie 2:14-4:7", dvar: "La menorah, les trompettes et les plaintes du peuple." },
  "Sh'lach": { book: "Bamidbar (Nombres)", chapters: "13:1 – 15:41", verses: 119, haftara: "Josué 2:1-24", dvar: "Les douze explorateurs et la faute du peuple." },
  Korach: { book: "Bamidbar (Nombres)", chapters: "16:1 – 18:32", verses: 95, haftara: "I Samuel 11:14-12:22", dvar: "La rébellion de Korach contre Moïse et Aharon." },
  Chukat: { book: "Bamidbar (Nombres)", chapters: "19:1 – 22:1", verses: 87, haftara: "Juges 11:1-33", dvar: "La vache rousse, mort de Miriam et d'Aharon." },
  Balak: { book: "Bamidbar (Nombres)", chapters: "22:2 – 25:9", verses: 104, haftara: "Michée 5:6-6:8", dvar: "Bilam tente de maudire Israël et finit par le bénir." },
  Pinchas: { book: "Bamidbar (Nombres)", chapters: "25:10 – 30:1", verses: 168, haftara: "I Rois 18:46-19:21", dvar: "Récompense de Pin'has et calendrier des sacrifices des fêtes." },
  Matot: { book: "Bamidbar (Nombres)", chapters: "30:2 – 32:42", verses: 112, haftara: "Jérémie 1:1-2:3", dvar: "Lois des vœux et guerre contre Midian." },
  Masei: { book: "Bamidbar (Nombres)", chapters: "33:1 – 36:13", verses: 132, haftara: "Jérémie 2:4-28; 3:4", dvar: "Étapes du voyage au désert et frontières d'Israël." },
  Devarim: { book: "Devarim (Deutéronome)", chapters: "1:1 – 3:22", verses: 105, haftara: "Isaïe 1:1-27", dvar: "Premier discours de Moïse rappelant le voyage au désert." },
  "Va'etchanan": { book: "Devarim (Deutéronome)", chapters: "3:23 – 7:11", verses: 122, haftara: "Isaïe 40:1-26", dvar: "Répétition des Dix Commandements et du Chéma Israël." },
  Eikev: { book: "Devarim (Deutéronome)", chapters: "7:12 – 11:25", verses: 111, haftara: "Isaïe 49:14-51:3", dvar: "Récompense de l'observance et louange de la Terre d'Israël." },
  "Re'eh": { book: "Devarim (Deutéronome)", chapters: "11:26 – 16:17", verses: 126, haftara: "Isaïe 54:11-55:5", dvar: "Bénédiction et malédiction, lois de cacherout et fêtes." },
  Shoftim: { book: "Devarim (Deutéronome)", chapters: "16:18 – 21:9", verses: 97, haftara: "Isaïe 51:12-52:12", dvar: "Juges, rois, prophètes : structures de la société juive." },
  "Ki Teitzei": { book: "Devarim (Deutéronome)", chapters: "21:10 – 25:19", verses: 110, haftara: "Isaïe 54:1-10", dvar: "74 mitsvot couvrant famille, société et éthique." },
  "Ki Tavo": { book: "Devarim (Deutéronome)", chapters: "26:1 – 29:8", verses: 122, haftara: "Isaïe 60:1-22", dvar: "Lois des prémices et avertissements (tokhe'ha)." },
  Nitzavim: { book: "Devarim (Deutéronome)", chapters: "29:9 – 30:20", verses: 40, haftara: "Isaïe 61:10-63:9", dvar: "Renouvellement de l'alliance et liberté de choix." },
  Vayeilech: { book: "Devarim (Deutéronome)", chapters: "31:1 – 31:30", verses: 30, haftara: "Isaïe 55:6-56:8", dvar: "Moïse transmet le pouvoir à Yehochoua et écrit la Torah." },
  "Ha'azinu": { book: "Devarim (Deutéronome)", chapters: "32:1 – 32:52", verses: 52, haftara: "II Samuel 22:1-51", dvar: "Cantique de Moïse appelant les cieux et la terre à témoigner." },
  "Vezot Haberakhah": { book: "Devarim (Deutéronome)", chapters: "33:1 – 34:12", verses: 41, haftara: "Josué 1:1-18", dvar: "Bénédictions finales de Moïse aux tribus et sa disparition." },
};

/** Look up parasha info by french name (e.g. "Paracha Bamidbar" or "Bamidbar"). */
export function getParashaInfo(name: string | undefined | null): ParashaInfo | null {
  if (!name) return null;
  const cleaned = name.replace(/^Paracha\s+/i, "").trim();
  if (PARASHOT_DATA[cleaned]) return PARASHOT_DATA[cleaned];
  // Handle double parashot like "Tazria-Metzora" or "Matot-Masei" -> use first
  const first = cleaned.split(/[-–]/)[0].trim();
  return PARASHOT_DATA[first] || null;
}