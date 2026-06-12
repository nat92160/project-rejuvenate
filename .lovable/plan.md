# Zohar de la veille de Brit Mila — Lecture partagée

Nouvelle fonctionnalité pour lire le Zohar la nuit précédant une Brit, avec partage équilibré entre plusieurs participants en temps réel (comme Tehilim).

## Ce qu'on construit

### 1. Contenu
Deux versions du Zohar de la Brit (hébreu seul) embarquées dans l'app :
- **Tikoun HaBrit complet** — extraits Vayera + Lekh Lekha (~30 sections)
- **Tikoun HaBrit court** — version abrégée (~10 sections)

Texte stocké statiquement dans `src/lib/zohar-brit-data.ts` (pas d'API externe → instantané, offline).

### 2. Lecteur
Page `/zohar-brit` :
- Choix version (court / complet) au lancement
- Lecteur hébreu Edot HaMizrach (même aesthetic que le Siddour, police Frank Ruhl Libre, RTL)
- Slider taille de police, Wake Lock, marque-page local
- Bouton "Marquer ma section comme terminée"

### 3. Partage temps réel (style Tehilim)
- Bouton "Créer une session" → code court (ex: BRIT-A4F2)
- Créateur choisit N participants (2-30) et la version
- Découpe automatique par **sections complètes**, équilibrée par poids de caractères (algo greedy)
- Bouton "Rejoindre une session" → entrer code → reçoit automatiquement la prochaine part libre
- Indicateur temps réel : qui a terminé, sections restantes, % global
- Partage du code via Web Share (WhatsApp, etc.)

### 4. Découpage intelligent
Algo : tri sections par taille décroissante → assignation gourmande au lecteur le moins chargé. Garantit que chaque participant reçoit des **sections entières**, jamais coupées au milieu, avec l'écart de charge le plus faible possible.

### 5. Accès
- Widget sur l'accueil dans la catégorie "Outils spirituels" (icône 📖 + "Zohar de la Brit")
- Route publique (guest-friendly, pas besoin de compte pour lire)
- Création/jonction de session : compte requis pour identifier les participants

## Détails techniques

### Tables Supabase
```
zohar_brit_sessions
  - code (text, unique, court)
  - creator_id (uuid)
  - version ('court' | 'complet')
  - participants_count (int)
  - assignments (jsonb)  -- { userId/anonId: [sectionIndexes] }
  - completed (jsonb)    -- { userId: [sectionIndexes] }
  - status ('active' | 'completed')

zohar_brit_participants
  - session_id, user_id (nullable), anon_id, display_name, joined_at
```
RLS : tout le monde authentifié peut lire/écrire les sessions actives ; mise à jour temps réel via Realtime.

### Fichiers
- `src/lib/zohar-brit-data.ts` — texte hébreu structuré
- `src/lib/zoharSplit.ts` — algo de découpe équilibrée
- `src/components/zohar/ZoharBritReader.tsx` — lecteur
- `src/components/zohar/ZoharBritSessionHub.tsx` — créer/rejoindre
- `src/components/zohar/ZoharBritLive.tsx` — vue session avec progression live
- `src/pages/ZoharBrit.tsx` — page route
- `src/pages/ZoharBritJoin.tsx` — `/zohar-brit/:code` page de jonction directe
- Lien dans la home (catégorie Outils spirituels)

### Realtime
Channel `zohar-brit-{code}` avec `postgres_changes` sur `zohar_brit_sessions` (assignments, completed) et `zohar_brit_participants`.

---

Confirme et je construis tout (migration + frontend + intégration accueil).