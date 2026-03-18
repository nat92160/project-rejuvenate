export interface HilloulaEntry {
  m: string;
  d: number;
  name: string;
  desc: string;
}

export const HILLOULA_DB: HilloulaEntry[] = [
  // TICHRI
  { m: "Tishrei", d: 7, name: "Rabbi Zéra", desc: "Amora, Talmud de Jérusalem" },
  { m: "Tishrei", d: 15, name: "Rabbi Yéhouda Hanassi", desc: "Rédacteur de la Michna" },
  { m: "Tishrei", d: 18, name: "Rabbi Na'hman de Breslev", desc: "Fondateur du mouvement Breslev" },
  { m: "Tishrei", d: 25, name: "Rabbi Lévi Yits'hak de Berditchev", desc: "Défenseur d'Israël" },
  // HECHVAN
  { m: "Cheshvan", d: 4, name: "Ramban (Na'hmanide)", desc: "Kabbaliste, commentateur de la Torah" },
  { m: "Cheshvan", d: 11, name: "Ra'hel Iménou", desc: "Matriarche du peuple juif" },
  { m: "Cheshvan", d: 15, name: "Mattityahou ben Yo'hanan", desc: "Père des Maccabées" },
  { m: "Cheshvan", d: 20, name: "Rabbi Avraham ben David (Raavad)", desc: "Commentateur du Rambam" },
  // KISLEV
  { m: "Kislev", d: 3, name: "Rabbi Yossef Caro (le Beit Yossef)", desc: "Voir aussi Nissan 13" },
  { m: "Kislev", d: 9, name: "Rabbi Dov Ber (Admour Hazaken)", desc: "Maggid de Mézéritch" },
  { m: "Kislev", d: 19, name: "Rabbi Dov Ber Schneuri", desc: "Deuxième Rabbi de Loubavitch" },
  // TEVET
  { m: "Tevet", d: 5, name: "Rabbi Chlomo ben Aderet (Rachba)", desc: "Grand décisionnaire espagnol" },
  { m: "Tevet", d: 20, name: "Rambam (Maïmonide)", desc: "Philosophe, codificateur, médecin" },
  { m: "Tevet", d: 24, name: "Rabbi Chneour Zalman de Liadi", desc: "Fondateur de 'Habad-Loubavitch" },
  { m: "Tevet", d: 25, name: "Rabbi Israël Salanter", desc: "Fondateur du mouvement Moussar" },
  // CHEVAT
  { m: "Shevat", d: 4, name: "Rabbi Israël Abou'hatsira (Baba Salé)", desc: "Tsaddik marocain, faiseur de miracles" },
  { m: "Shevat", d: 5, name: "Rabbi Yéhouda Aryé Leib Alter (Sfat Emet)", desc: "Rabbi de Gour" },
  { m: "Shevat", d: 9, name: "Rabbi Mena'hem Mendel de Kotzk", desc: "Le Kotzker Rebbe" },
  { m: "Shevat", d: 10, name: "Rabbi Chalom Charabi (le Rachach)", desc: "Grand kabbaliste yéménite" },
  { m: "Shevat", d: 22, name: "Rabbi Mena'hem Mendel de Vitebsk", desc: "Leader 'hassidique en Erets Israël" },
  // ADAR
  { m: "Adar", d: 7, name: "Moché Rabénou", desc: "Notre maître Moïse — naissance et hilloula" },
  { m: "Adar", d: 13, name: "Rabbi Moché Feinstein", desc: "Décisionnaire halakhique majeur" },
  { m: "Adar", d: 14, name: "Rabbi Isaac Alfassi (Rif)", desc: "Autorité talmudique séfarade" },
  { m: "Adar", d: 25, name: "Rabbi Israël Meir Kagan ('Hafets 'Haïm)", desc: "Autorité éthique lituanienne" },
  // NISSAN
  { m: "Nisan", d: 1, name: "Nadav et Avihou", desc: "Fils d'Aharon, morts devant Hachem" },
  { m: "Nisan", d: 10, name: "Miriam la prophétesse", desc: "Sœur de Moché et Aharon" },
  { m: "Nisan", d: 13, name: "Rabbi Yossef Caro", desc: "Auteur du Choul'han Aroukh" },
  { m: "Nisan", d: 15, name: "Yits'hak Avinou", desc: "Patriarche du peuple juif" },
  { m: "Nisan", d: 26, name: "Yéhochoua bin Noun", desc: "Successeur de Moché" },
  // IYAR
  { m: "Iyyar", d: 7, name: "Rabbi Moché 'Haïm Luzzatto (Ram'hal)", desc: "Auteur du Messilat Yécharim" },
  { m: "Iyyar", d: 14, name: "Rabbi Meïr Baal Haness", desc: "Tanna, faiseur de miracles" },
  { m: "Iyyar", d: 18, name: "Rabbi Chimon bar Yo'haï (Rachbi)", desc: "Auteur du Zohar — Lag Baomer" },
  // SIVAN
  { m: "Sivan", d: 6, name: "David Hamélekh", desc: "Roi David — naissance et hilloula" },
  { m: "Sivan", d: 23, name: "Rabbi Moché Isserles (Rama)", desc: "Auteur des Hagahot sur le Choul'han Aroukh" },
  // TAMOUZ
  { m: "Tammuz", d: 3, name: "Rabbi Mena'hem Mendel Schneerson", desc: "Septième Rabbi de Loubavitch" },
  { m: "Tammuz", d: 5, name: "Rabbi 'Haïm ben Attar (Or Ha'haïm)", desc: "Grand commentateur séfarade" },
  // AV
  { m: "Av", d: 1, name: "Aharon Hacohen", desc: "Grand prêtre, frère de Moché" },
  { m: "Av", d: 5, name: "Rabbi Isaac Louria (Arizal)", desc: "Fondateur de la Kabbale lourianique" },
  { m: "Av", d: 19, name: "Le Gaon de Vilna", desc: "Génie talmudique lituanien" },
  // ELOUL
  { m: "Elul", d: 17, name: "Rabbi Yéhouda Loew (Maharal de Prague)", desc: "Philosophe, créateur du Golem" },
  { m: "Elul", d: 18, name: "Rabbi Yéhouda 'Hassid", desc: "Auteur du Sefer 'Hassidim" },
  { m: "Elul", d: 26, name: "Rabbi 'Haïm Pinto", desc: "Tsaddik marocain d'Essaouira" },
];

export function getHilloulaForDate(hebMonth: string, hebDay: number): HilloulaEntry[] {
  return HILLOULA_DB.filter((h) => h.m === hebMonth && h.d === hebDay);
}
