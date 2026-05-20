---
name: Customizable Bottom Bar
description: BottomNav 3 first slots are user-customizable, 4th slot is always Menu (☰)
type: feature
---
- BottomNav shows 4 slots. Slots 1-3 are user-personalizable from a catalog (`src/lib/bottomNavCustomization.ts`), slot 4 is ALWAYS Menu (☰) to guarantee access to all functions.
- Storage: `localStorage["bottomnav_custom_v1"]` = JSON array of 3 tab IDs. Defaults to `["dashboard","synagogue","chabbat"]`.
- Customization UI: `BottomNavCustomizer` sheet opened from a "✏️ Widgets" pill in `GreetingHeader`.
- Cross-tab sync via `window` "bottomnav-changed" custom event + native "storage" event.
- All available tab IDs in `BOTTOM_NAV_OPTIONS` must match cases handled in `Index.tsx` `renderTabContent` switch.
