-- Steps Toward Access v2.2 — community reports: anyone can flag a barrier.
-- Reports go to the team's console; nothing is public until the team
-- documents and publishes a barrier themselves. Safe to re-run.

create table if not exists public.access_public_reports (
  id             uuid primary key default gen_random_uuid(),
  status         text not null default 'new'
                 check (status in ('new','taken_up','handled','dismissed')),
  barrier_type   text,
  barrier_desc   text not null check (length(barrier_desc) between 10 and 3000),
  place_desc     text check (length(place_desc) <= 500),
  lat            numeric,
  lon            numeric,
  party_guess    text check (length(party_guess) <= 200),
  reporter_name  text check (length(reporter_name) <= 120),   -- optional
  reporter_email text check (length(reporter_email) <= 200),  -- optional, for follow-up
  team_note      text,
  linked_location_id uuid references public.access_locations(id),
  created_at     timestamptz not null default now()
);
create index if not exists access_public_reports_status_idx
  on public.access_public_reports(status);
alter table public.access_public_reports enable row level security;

-- The public can ONLY insert: no reading, updating, or deleting anything.
drop policy if exists "anyone can file a report" on public.access_public_reports;
create policy "anyone can file a report" on public.access_public_reports
  for insert to anon
  with check (status = 'new' and linked_location_id is null and team_note is null);

-- Staff manage reports.
drop policy if exists "staff manage public reports" on public.access_public_reports;
create policy "staff manage public reports" on public.access_public_reports
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');

-- Andrew runs Agents of Change and triages this list.
insert into public.access_staff (email, role, display_name) values
  ('andrew@sparcsolutions.org', 'editor', 'Andrew O''Dell')
on conflict (email) do update set role = excluded.role;
