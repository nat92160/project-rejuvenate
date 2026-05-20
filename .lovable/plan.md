# Refonte ergonomique de l'app

Objectif : qu'un nouveau fidèle ou président prenne l'app en main en moins de 30 secondes, sans aide.

---

## Phase 1 — Mode Président bien mis en valeur

**Où :** uniquement dans l'onglet **Ma Synagogue**, tout en haut, AVANT tout le reste.

**À la place du petit bouton actuel :** une grande carte hero or pleine largeur, impossible à manquer :

```text
┌──────────────────────────────────────────┐
│ 👑   MODE PRÉSIDENT                  →  │
│      Piloter ma synagogue                │
│      Annonces · Horaires · Affiche · …  │
└──────────────────────────────────────────┘
```

- Fond dégradé or, ombre dorée, hauteur ~96px
- Pulsation douce les 5 premières secondes la 1ère fois
- Disparaît si l'utilisateur n'est pas président/admin

Le bouton « Modifier ma fiche / Ajouter une fiche » descend juste en dessous.

---

## Phase 2 — Onboarding fidèle (1ère ouverture, skippable)

3 écrans plein écran, fond gold-soft :

1. **Bienvenue** — logo, message court, bouton « 📍 Activer ma position »
2. **Choisir ma synagogue** — liste GPS des synagogues proches, possibilité « Sauter »
3. **Tout est prêt** — résumé + bouton « Découvrir l'app » qui ramène à l'Accueil

État stocké dans `localStorage.calj_onboarded_fidele=true`.

---

## Phase 3 — Onboarding président (1ère bascule en Mode président)

Tour guidé de 4 bulles dans le tableau de bord président :
Affiche → Annonces → Horaires → Fidèles.
Bouton « Passer » dispo à tout moment.
État : `localStorage.calj_onboarded_president=true`.

---

## Phase 4 — Tooltips contextuels premiers pas

3 bulles douces affichées une seule fois sur l'Accueil fidèle, pointant vers :
Zmanim · Refoua · Espace Perso.
Disparaissent au tap. Stockées dans `localStorage`.

---

## Phase 5 — Bottom Nav à 4 onglets

Au lieu des 4 onglets actuels personnalisables, on fixe une nav universelle et lisible :

```text
🏠 Accueil   🏛️ Ma Syna   🕯️ Chabbat   ⋯ Plus
```

- Mêmes 4 onglets pour fidèle et président
- Bouton flottant 🏠 conservé
- En mode vendredi/Chabbat, l'onglet Chabbat passe en avant (déjà géré)

---

## Phase 6 — Menu « Plus » organisé pro

L'onglet « Plus » ouvre un sheet plein écran avec :

1. **Barre de recherche** en haut (filtre instantané sur tous les libellés)
2. **Sections pliables**, toutes ouvertes par défaut :
   - 🙏 **Prière** — Siddour · Tehilim · Refoua · Brakhot
   - 📅 **Calendrier** — Fêtes · Roch Hodech · Chabbatot · Mariages & Hazkara · Convertir
   - 🛠️ **Outils** — Mizra'h · Réveil
   - 🤝 **Communauté** — Annonces · Évènements · Cours · Urgence Minyan
   - 👤 **Mon espace**
3. Les anciens onglets « Affiche / Horaires / Infos Syna / Alerte » restent réservés au Mode Président (dans son dashboard, pas dans Plus).

---

## Détails techniques

- Pas de nouvelle table Supabase : tout l'état d'onboarding est en `localStorage`.
- Pas de refonte visuelle des widgets eux-mêmes — uniquement IA & navigation.
- Le composant `BottomNav` passe à des onglets fixes (suppression de `getBottomNavStorageKey`).
- Nouveau composant `MorePanel.tsx` (sheet) pour le menu Plus.
- Nouveau composant `FideleOnboarding.tsx` + `PresidentOnboarding.tsx`.
- Tooltips : composant léger `FirstTimeHint.tsx` basé sur un portal + flèche.

## Hors scope

- Pas de redesign global des couleurs (Forced Light Mode + bleu/or conservés).
- Pas de refonte des écrans internes (Zmanim, Siddour, etc.).
- Pas de tour vidéo ni de tutoriel multi-étapes complexe.
