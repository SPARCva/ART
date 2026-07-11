-- Accessibility in Real Time v2.4 — instant, unmoderated community display.
-- Reports appear publicly the moment they are submitted. The team's Dismiss
-- action is the only removal lever (for spam/abuse cleanup). Safe to re-run.
create or replace view public.access_community_board
with (security_invoker = off) as
  select id, barrier_type, barrier_desc, place_desc, lat, lon,
         status, created_at
  from public.access_public_reports
  where status <> 'dismissed';
grant select on public.access_community_board to anon, authenticated;
