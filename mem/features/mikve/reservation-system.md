---
name: Mikve reservation system
description: Visual slot booking with privacy — fidèles see only counts, president sees names
type: feature
---
- `synagogue_profiles.mikve_reservation_enabled` toggles online booking
- Config: `mikve_open_days` int[] (0=Sun..6=Sat), `mikve_open_start/end`, `mikve_slot_duration_min`, `mikve_slot_capacity`
- Table `mikve_reservations` (synagogue_id, slot_date, slot_time, user_id, display_name, phone, notes)
- RLS: fidèle SELECT only own; president/adjoint SELECT synagogue's; user or president DELETE
- RPC `get_mikve_availability(_synagogue_id, _from, _to)` returns aggregated counts only (SECURITY DEFINER) so fidèles see availability without names
- UI: `MikveBookingWidget` in `MikveInfoView`; `MikveManager` (president) has config + reservations list with names/phones
