
## Objectif

Transformer le Siddour en véritable livre numérique : page dédiée plein écran `/siddour`, sommaire interactif persistent à gauche, toutes les prières de l'office enchaînées en scroll continu, sélecteur de rite **Séfarade (Édot HaMizrah)** ou **Ashkénaze (Nusach Ashkenaz)**.

## 1. Backend — Edge function `get-siddour`

Étendre la function pour supporter deux rites.

```text
SIDDOUR_REFS = {
  sefarade:  { shacharit: [...], minha: [...], ... }   // existant
  ashkenaz:  { shacharit: [...], minha: [...], ... }   // nouveau
}
```

- Sources Sefaria Ashkénaze : `Siddur_Ashkenaz,_Weekday,_Shacharit,_*` (Modeh Ani, Birchot HaShachar, Pesukei DeZimra, Shema, Amidah, Tachanun, Aleinu…) ; Mincha, Maariv ; Shabbat (Kabbalat Shabbat, Maariv, Shacharit, Mussaf, Mincha) ; Brachot (Birkat HaMazon Ashkenaz), Hallel, Hanukkah, Purim. Couverture 1:1 avec les offices Séfarade existants quand disponible.
- Body API étendu : `{ rite: "sefarade" | "ashkenaz", office, section?, full?: boolean }`
- **Mode `full: true`** : retourne toutes les sections de l'office en un seul payload `{ sections: [{ title, heTitle, hebrew[], french[], isHazara }] }` pour la lecture continue (avec `Promise.all` sur les refs).
- Rétrocompatibilité : si `rite` absent → `sefarade`.

## 2. Nouvelle page `/siddour` (`src/pages/Siddour.tsx`)

Layout à 2 colonnes :

```text
┌─────────────────────────────────────────────────────┐
│  ← Retour    Siddour ▾  [Séfarade | Ashkénaze]     │  header
├──────────────┬──────────────────────────────────────┤
│ ▸ Cha'harit  │                                      │
│   Modé Ani   │   ✦  ───  Modé Ani  ───  ✦          │
│   Birkhot…   │      מודה אני                        │
│ ▸ Min'ha     │   [texte hébreu, scroll continu]     │
│ ▸ Arvit      │                                      │
│ ▸ Chabbat    │   ✦  ───  Birkhot HaChahar  ───  ✦  │
│ ▸ Brakhot    │      ברכות השחר                     │
│ ▸ Fêtes      │      [texte continu]                 │
│              │                                      │
│ Favoris ★    │   …toutes les sections enchaînées…   │
└──────────────┴──────────────────────────────────────┘
```

- **Desktop (≥1024px)** : sidebar `w-72` fixe à gauche, contenu scrollable à droite.
- **Mobile** : sidebar devient un drawer (Sheet shadcn) ouvert via bouton 📖 flottant ; ancres tap → ferme drawer + scroll vers section.
- Sidebar = liste hiérarchique : catégorie (Quotidien / Chabbat / Fêtes / Brakhot) → office → sections de l'office actif. Section active highlighted en or, scrollspy via `IntersectionObserver`.
- Header sticky : titre office + segmented control rite + boutons taille de police + favoris + recherche.

## 3. Lecture continue

- Au choix d'un office, `get-siddour` est appelé en `full: true`.
- Rendu : pour chaque section, en-tête ornemental (titre Fr + Hé) puis versets (réutilise la logique actuelle de `SiddourReader` : `findPrayerStartIndex`, `processAmidaVerses`, instructions/seasonal, Hazara banner).
- IDs d'ancres `#sec-{i}` sur chaque en-tête pour navigation depuis sidebar.
- Bookmark : sauvegarde `{ rite, office, sectionIndex, scrollY }` (étend `useSiddourBookmark`).
- Cache localStorage par `(rite, office)` pour la version `full`.

## 4. Sélecteur de rite

- Stocké dans `localStorage` (`siddour_rite`) + state global via simple hook `useSiddourRite()`.
- Segmented control en haut de page. Switch rite → recharge l'office courant.
- Détection auto par défaut : `sefarade` (cohérent avec mémoire `Sephardic Siddur`).

## 5. Intégration avec l'existant

- Route ajoutée dans `src/App.tsx` : `<Route path="/siddour" element={<Siddour />} />` (lazy).
- `SiddourWidget` actuel **conservé** dans `Index.tsx` (mode "aperçu rapide" : ouvre directement l'office du moment) mais ajout d'un bouton **"Ouvrir le livre complet"** qui navigue vers `/siddour?office=...`.
- Le widget Home garde ses fonctions actuelles ; le livre complet est l'expérience étendue.

## 6. Détails techniques

- **Composants nouveaux** :
  - `src/pages/Siddour.tsx` (layout)
  - `src/components/siddour/SiddourBookSidebar.tsx` (nav gauche + drawer mobile)
  - `src/components/siddour/SiddourBookReader.tsx` (rendu continu, factorise la logique de `SiddourReader`)
  - `src/components/siddour/SiddourRiteSelector.tsx`
  - `src/hooks/useSiddourRite.ts`
  - `src/hooks/useSiddourFullOffice.ts` (fetch + cache `full: true`)
- **Edge function** : refacto `SIDDOUR_REFS` en `{ sefarade, ashkenaz }`, ajout des refs Ashkénaze, support `full`.
- Mémoire `Sephardic Siddur` mise à jour pour refléter le double rite.
- Respect : Forced Light Mode (pas de prayerMode noir), bleu nuit + or mat, polices Noto Serif Hebrew/Frank Ruhl Libre conservées.

## 7. Hors scope

- Phonétique et traduction Ashkénaze : repris depuis Sefaria `en` quand dispo, sinon vide (pas de génération côté client supplémentaire).
- Pas de modification des autres widgets (Birkat Hamazone, Brakhot, etc.).

## Livrables

1. Edge function `get-siddour` mise à jour (rite + full mode + corpus Ashkénaze).
2. Page `/siddour` avec sidebar livre + lecture continue.
3. Sélecteur de rite persisté.
4. Bouton d'accès depuis le widget Home.
