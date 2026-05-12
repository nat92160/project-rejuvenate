
## Objectif

Donner du caractère premium à la typographie de l'app sans casser l'équilibre visuel ni surcharger les écrans iPhone.

- Titres principaux ("Chabbat Chalom", greetings, en-têtes de page) → **Cormorant Garamond** + effet **letterpress embossé**.
- Sous-titres de widgets (CardTitle des Annonces, Tehilim, Cours, etc.) → même police, effet letterpress plus discret.
- Corps de texte, boutons, navigation BottomNav → **inchangés** (Montserrat).

## Aperçu de l'effet letterpress (sur fond crème clair)

```text
  CHABBAT CHALOM
  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔
  Texte bleu nuit profond + highlight blanc 1 px en haut
  + ombre noire 1 px très diffuse en bas
  → impression d'être gravé dans le papier.
```

Concrètement, deux text-shadows opposées :
- `0 1px 0 rgba(255,255,255,0.85)` (highlight haut)
- `0 -1px 1px rgba(0,31,63,0.18)` (creux bas, teinté navy)

## Étapes

### 1. Charger la police
- Ajouter **Cormorant Garamond** (400, 500, 600, 700) à l'import Google Fonts existant dans `src/index.css` (1 seul lien groupé, `display=swap` déjà présent).

### 2. Système typographique
- Dans `tailwind.config.ts` : mapper `font-display` sur `['Cormorant Garamond', 'Lora', 'serif']` (le corps `font-sans` reste Montserrat). Tous les composants qui utilisent déjà `font-display` (AppHeader, GreetingHeader…) bénéficient automatiquement du nouveau rendu.
- Dans `src/index.css` : remplacer la règle globale `h1, h2, h3, h4 { font-family: Montserrat }` par Cormorant + tracking légèrement positif (`letter-spacing: 0.005em`, plus aéré pour un serif).

### 3. Classes utilitaires letterpress
Ajouter dans `@layer utilities` de `src/index.css` :

- `.title-letterpress` — version forte (titres XL : Chabbat Chalom, greetings)
  - `color: hsl(var(--navy))`
  - `text-shadow: 0 1px 0 rgba(255,255,255,.85), 0 -1px 1px rgba(0,31,63,.18)`
  - `font-weight: 600`
  - `font-feature-settings: "ss01", "kern", "liga"`

- `.title-letterpress-soft` — version douce (CardTitle des widgets)
  - même principe mais ombres divisées par 2
  - `color: hsl(var(--foreground))`

- Variante automatique pour fond sombre/navy : `.title-letterpress-on-dark` (highlight or au lieu de blanc) — pour les bandeaux Night Blue.

### 4. Application ciblée

| Endroit | Classe | Police |
|---|---|---|
| `AppHeader` "Chabbat Chalom" h1 | `font-display title-letterpress` | Cormorant 700 |
| `GreetingHeader` h2 | `font-display title-letterpress` | Cormorant 600 |
| `HeroSection` titres | `font-display title-letterpress` | Cormorant 700 |
| `CardTitle` shadcn (`src/components/ui/card.tsx`) | injecter `font-display title-letterpress-soft` par défaut | Cormorant 600 |
| Titres de page (Siddour, Omer, Zmanim hero) | `font-display title-letterpress` | Cormorant 700 |
| **Boutons / BottomNav / inputs / corps** | inchangés | Montserrat |

### 5. Garde-fous

- **Light mode uniquement** (mémoire respectée) → ombres calibrées sur cream/white, pas de variante dark.
- **Lisibilité iPhone** : tester à 16-18 px (taille minimale `CardTitle`). Si le serif paraît trop fin, monter à font-weight 600.
- **Accessibilité** : contraste navy `#001F3F` sur cream conservé (ratio AAA).
- **Pas de letterpress sur petits caractères < 14 px** (BottomNav, micro-info) → effet illisible, on garde Montserrat propre.
- **Pas d'ombres sur l'hébreu** (Frank Ruhl Libre) → la liturgie reste pure.

### 6. Mémoire
Sauvegarder une mémoire `mem://style/typography-letterpress-system` décrivant la règle (Cormorant Garamond pour `.font-display`, classes letterpress, exclusions) pour que les futurs widgets l'appliquent automatiquement.

## Détails techniques

- 1 seule modif d'import Google Fonts (pas de 2e requête réseau).
- Aucun composant React à recréer : la modif passe par Tailwind config + `ui/card.tsx` (1 ligne) + 3 fichiers de pages/headers.
- 0 impact perf : Cormorant 4 graisses ≈ 30 ko (woff2) chargé en parallèle, `font-display: swap` déjà actif.
- 0 régression mobile : les touch targets et tailles d'inputs ne changent pas.
