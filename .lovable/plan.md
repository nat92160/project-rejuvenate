## Objectif
Sur l'onglet **Mur** (annonces) et **Horaires** (Cha'harit/Min'ha/Arvit + événements), les fidèles peuvent désormais :
1. Voir les changements **en temps réel** dès qu'un président modifie un horaire ou poste une annonce
2. **Réagir** (❤️ 🙏 ✅ 👏) et **commenter** sous chaque annonce/horaire vérifié
3. Utiliser des **actions rapides** : "Ajouter au calendrier", "Partager", "Me rappeler avant", "Itinéraire"

Restriction : ces interactions n'apparaissent **que** sur du contenu **émis par le président/adjoint** ou **marqué vérifié** (`verified = true`).

---

## 1. Base de données (migration)

Deux nouvelles tables génériques (un seul système de réactions/commentaires utilisable partout) :

**`content_reactions`**
- `content_type` (`annonce` | `horaire` | `evenement`)
- `content_id` (uuid de la cible — pour horaire = id de la synagogue + suffixe office côté client)
- `user_id`, `display_name`, `emoji` (parmi : ❤️ 🙏 ✅ 👏 🔥)
- Unique `(content_type, content_id, user_id, emoji)` → un seul ❤️ par user
- RLS : tout le monde voit, authentifiés peuvent créer/supprimer les leurs

**`content_comments`**
- `content_type`, `content_id`, `user_id`, `display_name`, `content` (text), `is_president` (bool)
- RLS : tout le monde voit, authentifiés écrivent leurs commentaires, président/adjoint de la synagogue peut modérer (supprimer)

Realtime activé sur les deux tables (`ADD TABLE … supabase_realtime` + `REPLICA IDENTITY FULL`).

---

## 2. Composant réutilisable `InteractiveContent`

`src/components/interactive/InteractiveContent.tsx` — wrappe n'importe quel contenu vérifié et ajoute :
- Barre de réactions (compteurs live via realtime, tap pour réagir, retirer en re-tappant)
- Bouton 💬 qui ouvre une zone commentaires inline (chargée à la demande)
- Menu actions rapides (3-dots) : Calendrier (.ics), Partage (Web Share), Rappel local (notification scheduled), Itinéraire (Apple/Google Maps)
- Badge "✓ Vérifié" / "👑 Président" visible

Props : `contentType`, `contentId`, `verified`, `synagogueId`, `eventDate?`, `eventTime?`, `address?`, `shareText`.

---

## 3. Intégration

- **`AnnoncesWidget.tsx`** : chaque annonce wrappée par `<InteractiveContent>` (toujours interactive car les annonces sont créées par président/adjoint via RLS).
- **`SynagogueWall.tsx`** : ajoute `<InteractiveContent>` sous les 3 horaires (Cha'harit/Min'ha/Arvit) — un par office, avec `contentId = ${synagogueId}:${office}`. Affiché seulement si l'horaire est défini (donc vérifié par le président).
- **`EvenementsWidget.tsx`** : actions rapides + réactions + commentaires sur les événements de la synagogue.

Realtime UI : déjà en place pour `synagogue_profiles` (ajouts précédents). On ajoute la souscription aux deux nouvelles tables dans `InteractiveContent`.

---

## 4. Actions rapides — détails techniques

- **Calendrier** : génère un fichier `.ics` à la volée et `window.location.href = blob` (iOS ajoute au Calendar.app, Android idem).
- **Partage** : utilise `shareUtils.ts` existant (Web Share API + fallback copie lien).
- **Rappel** : si push natif autorisé → schedule local notification 30 min avant via Capacitor LocalNotifications ; sinon fallback `localStorage` + check au démarrage de l'app.
- **Itinéraire** : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` ou `maps://` sur iOS natif.

---

## 5. Sécurité

- Pas d'exposition de PII : on stocke `display_name` (déjà affiché publiquement) + `user_id`.
- Anti-spam : trigger PG limite à 10 commentaires/h/user par contenu.
- Modération : président/adjoint de la synagogue concernée peut supprimer commentaires abusifs.
- Anonymous (guests) : peuvent **voir** mais doivent se connecter pour réagir/commenter (toast incitatif).

---

## Hors-périmètre (non inclus)
- Notifications push aux fidèles quand un président modifie (existe déjà via `shabbat-reminder` ; pas étendu ici).
- Threads de réponses (commentaires nestés) — V2.
- Édition d'un commentaire après envoi — V2.

Une fois le plan validé, je crée la migration puis j'implémente le composant et l'intègre dans les 3 widgets.