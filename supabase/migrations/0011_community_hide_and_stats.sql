-- v2.6 (applied to prod via connector): gone>still hides a report from the
-- public board (staff always see all); public stats view for the tally.
create or replace view public.access_community_board
with (security_invoker = off) as
  with tallied as (
    select r.id, r.barrier_type, r.barrier_desc, r.place_desc, r.lat, r.lon,
           r.status, r.created_at,
           (select count(*) from public.access_barrier_checks c
             where c.report_id = r.id and c.verdict = 'still_there') as still_there_count,
           (select count(*) from public.access_barrier_checks c
             where c.report_id = r.id and c.verdict = 'gone') as gone_count
    from public.access_public_reports r
    where r.status <> 'dismissed'
  )
  select * from tallied
  where gone_count <= still_there_count;
grant select on public.access_community_board to anon, authenticated;

create or replace view public.access_public_stats
with (security_invoker = off) as
  select
    (select count(*) from public.access_locations where published)      as documented_barriers,
    (select count(*) from public.access_public_reports
       where status <> 'dismissed')                                     as community_reports;
grant select on public.access_public_stats to anon, authenticated;
