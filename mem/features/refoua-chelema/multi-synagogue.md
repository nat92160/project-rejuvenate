---
name: Refoua Chelema multi-synagogue
description: Patient names can be tagged to one or several synagogues via checkboxes
type: feature
---
- Column `refoua_chelema.synagogue_ids uuid[]` (nullable). Empty/null = liste générale.
- Form: checkboxes for user subscribed + managed synagogues. None checked = liste générale.
- Display: filter chips at top (Toutes / Liste générale / each syna). Each card shows 🏛️ badges for tagged synagogues.
