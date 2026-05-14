---
name: Upcoming Personal Dates Banner
description: 7-day-ahead Azkara/anniversary banner on Home dashboard
type: feature
---
- Banner mounted in DashboardHome, just below GreetingHeader (top of Home).
- Pulls from `personal_dates`, computes next civil occurrence (this year or next) from stored civil_date MM-DD.
- Shows entries 0–7 days ahead. Dismissible per session via sessionStorage key `dismissed_personal_dates`.
- Component: `src/components/PersonalDatesBanner.tsx` (lazy-loaded).
