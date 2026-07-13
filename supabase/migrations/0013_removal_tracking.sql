-- Accessibility in Real Time v2.8 — barrier-removal tracking.
-- Andrew asked for a way to track every step the team takes to remove a
-- barrier, mark a barrier as removed, and have all of it show up on the
-- public page (map pin + a link from the community board). Safe to re-run.

-- =====================================================================
-- "Removed" is a first-class thing on a documented barrier.
-- The team ticks a box in the console; the public page shows the date.
-- (status still moves through documented/contacted/awaiting; 'resolved'
--  is what we store once removed_at is set.)
-- =====================================================================
alter table public.access_locations
  add column if not exists removed_at timestamptz;

-- =====================================================================
-- Community board view now carries linked_location_id, but ONLY when the
-- linked barrier is actually published. That lets "What people have
-- reported" link straight to the team's public barrier page — and never
-- links to a draft that would read as "not on the public record".
-- =====================================================================
create or replace view public.access_community_board
with (security_invoker = off) as
  with tallied as (
    select r.id, r.barrier_type, r.barrier_desc, r.place_desc, r.lat, r.lon,
           r.status, r.created_at, r.photo_paths,
           case
             when exists (select 1 from public.access_locations l
                          where l.id = r.linked_location_id and l.published)
             then r.linked_location_id
             else null
           end as linked_location_id,
           (select count(*) from public.access_barrier_checks c
             where c.report_id = r.id and c.verdict = 'still_there') as still_there_count,
           (select count(*) from public.access_barrier_checks c
             where c.report_id = r.id and c.verdict = 'gone') as gone_count
    from public.access_public_reports r
    where r.status <> 'dismissed'
  )
  select id, barrier_type, barrier_desc, place_desc, lat, lon, status,
         created_at, still_there_count, gone_count, photo_paths, linked_location_id
  from tallied
  where gone_count <= still_there_count;
grant select on public.access_community_board to anon, authenticated;
