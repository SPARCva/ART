-- Accessibility in Real Time v2.5 — public "is it still there?" checks,
-- for both community reports and documented record barriers. Safe to re-run.

create table if not exists public.access_barrier_checks (
  id          bigint generated always as identity primary key,
  report_id   uuid references public.access_public_reports(id) on delete cascade,
  location_id uuid references public.access_locations(id) on delete cascade,
  verdict     text not null check (verdict in ('still_there','gone')),
  created_at  timestamptz not null default now(),
  constraint one_target check (num_nonnulls(report_id, location_id) = 1)
);
create index if not exists access_checks_report_idx on public.access_barrier_checks(report_id);
create index if not exists access_checks_location_idx on public.access_barrier_checks(location_id);
alter table public.access_barrier_checks enable row level security;

-- Anyone may add a check, but only against something publicly visible.
drop policy if exists "anyone checks visible barriers" on public.access_barrier_checks;
create policy "anyone checks visible barriers" on public.access_barrier_checks
  for insert to anon, authenticated
  with check (
    (report_id is not null and exists
       (select 1 from public.access_public_reports r
        where r.id = report_id and r.status <> 'dismissed'))
    or
    (location_id is not null and exists
       (select 1 from public.access_locations l
        where l.id = location_id and l.published))
  );

-- Counts are public (no PII in this table).
drop policy if exists "checks are readable" on public.access_barrier_checks;
create policy "checks are readable" on public.access_barrier_checks
  for select to anon, authenticated using (true);

-- Staff may clean up.
drop policy if exists "staff delete checks" on public.access_barrier_checks;
create policy "staff delete checks" on public.access_barrier_checks
  for delete to authenticated using (public.access_role() <> '');

-- Board view now carries the tallies.
create or replace view public.access_community_board
with (security_invoker = off) as
  select r.id, r.barrier_type, r.barrier_desc, r.place_desc, r.lat, r.lon,
         r.status, r.created_at,
         (select count(*) from public.access_barrier_checks c
           where c.report_id = r.id and c.verdict = 'still_there') as still_there_count,
         (select count(*) from public.access_barrier_checks c
           where c.report_id = r.id and c.verdict = 'gone') as gone_count
  from public.access_public_reports r
  where r.status <> 'dismissed';
grant select on public.access_community_board to anon, authenticated;
