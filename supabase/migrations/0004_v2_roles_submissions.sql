-- Steps Toward Access v2 — roles, parties, submissions queue, audit log.
-- Paste into Supabase SQL Editor → Run. Safe to re-run. Builds on the v1
-- access_* tables already in this project; does not touch anything else.

-- =====================================================================
-- STAFF WITH ROLES (replaces the flat email allow-list)
--   contributor: Andrew's team — submit barriers, edit own drafts
--   editor:      review anything, publish/unpublish
--   admin:       editor + manage staff
-- =====================================================================
create table if not exists public.access_staff (
  email        text primary key,
  role         text not null default 'contributor'
               check (role in ('contributor','editor','admin')),
  display_name text,
  added_at     timestamptz not null default now()
);
alter table public.access_staff enable row level security;

-- carry over the v1 allow-list as editors, then set Erica as admin
insert into public.access_staff (email, role)
select email, 'editor' from public.access_staff_emails
on conflict (email) do nothing;
update public.access_staff set role = 'admin'
where email in ('erica@sparcsolutions.org','grants@sparcsolutions.org');

-- helper: current user's role ('' if not staff). SECURITY DEFINER so RLS
-- policies can call it without exposing the staff table itself.
create or replace function public.access_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.access_staff where email = auth.jwt()->>'email'),
    ''
  );
$$;

-- staff can see the roster; only admins change it
drop policy if exists "staff read roster" on public.access_staff;
create policy "staff read roster" on public.access_staff
  for select to authenticated using (public.access_role() <> '');
drop policy if exists "admin manages roster" on public.access_staff;
create policy "admin manages roster" on public.access_staff
  for all to authenticated
  using (public.access_role() = 'admin') with check (public.access_role() = 'admin');

-- =====================================================================
-- PARTIES become first-class ("multiple issues tied to a single
-- responsible party" — Andrew, 2026-06-23)
-- =====================================================================
create table if not exists public.access_parties (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text,
  org_type      text,          -- property manager / business / agency / HOA...
  notes         text,
  created_at    timestamptz not null default now()
);
alter table public.access_parties enable row level security;

drop policy if exists "staff full access parties" on public.access_parties;
create policy "staff full access parties" on public.access_parties
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');

-- link locations to parties (keep the old text column during migration)
alter table public.access_locations
  add column if not exists party_id uuid references public.access_parties(id),
  add column if not exists summary  text,          -- plain-language description
  add column if not exists created_by text;        -- staff email

-- public may read parties that have at least one published barrier
drop policy if exists "anon reads parties with published barriers" on public.access_parties;
create policy "anon reads parties with published barriers" on public.access_parties
  for select to anon
  using (exists (select 1 from public.access_locations l
                 where l.party_id = access_parties.id and l.published));

-- backfill: one party row per distinct v1 text value
insert into public.access_parties (name)
select distinct party from public.access_locations l
where party is not null and btrim(party) <> ''
  and not exists (select 1 from public.access_parties p where p.name = l.party);
update public.access_locations l
set party_id = p.id
from public.access_parties p
where l.party_id is null and p.name = l.party;

-- =====================================================================
-- SUBMISSIONS — the team intake queue (drafted in the field, reviewed by
-- editors, merged into published barriers)
-- =====================================================================
create table if not exists public.access_submissions (
  id            uuid primary key default gen_random_uuid(),
  created_by    text not null,               -- staff email (enforced in RLS)
  status        text not null default 'submitted'
                check (status in ('submitted','in_review','needs_info','approved','merged','declined')),
  barrier_desc  text not null,
  place_desc    text,
  party_guess   text,
  review_note   text,                        -- editor -> submitter
  merged_location_id uuid references public.access_locations(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists access_submissions_status_idx on public.access_submissions(status);
alter table public.access_submissions enable row level security;

create table if not exists public.access_submission_photos (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.access_submissions(id) on delete cascade,
  src           text not null,
  alt           text not null,
  sort          int not null default 0,
  constraint sub_alt_not_blank check (length(btrim(alt)) > 0)
);
alter table public.access_submission_photos enable row level security;

drop trigger if exists access_submissions_touch on public.access_submissions;
create trigger access_submissions_touch
  before update on public.access_submissions
  for each row execute function public.set_updated_at();

-- contributors: create their own, see their own, edit their own while it's
-- still theirs to edit. editors/admin: everything.
drop policy if exists "contributor inserts own submissions" on public.access_submissions;
create policy "contributor inserts own submissions" on public.access_submissions
  for insert to authenticated
  with check (public.access_role() <> '' and created_by = auth.jwt()->>'email');

drop policy if exists "contributor reads own submissions" on public.access_submissions;
create policy "contributor reads own submissions" on public.access_submissions
  for select to authenticated
  using (created_by = auth.jwt()->>'email' or public.access_role() in ('editor','admin'));

drop policy if exists "contributor updates own open submissions" on public.access_submissions;
create policy "contributor updates own open submissions" on public.access_submissions
  for update to authenticated
  using (
    (created_by = auth.jwt()->>'email' and status in ('submitted','needs_info'))
    or public.access_role() in ('editor','admin')
  )
  with check (
    (created_by = auth.jwt()->>'email' and status in ('submitted','needs_info'))
    or public.access_role() in ('editor','admin')
  );

drop policy if exists "editor deletes submissions" on public.access_submissions;
create policy "editor deletes submissions" on public.access_submissions
  for delete to authenticated using (public.access_role() in ('editor','admin'));

drop policy if exists "submission photos follow submission" on public.access_submission_photos;
create policy "submission photos follow submission" on public.access_submission_photos
  for all to authenticated
  using (exists (select 1 from public.access_submissions s
                 where s.id = submission_id
                   and (s.created_by = auth.jwt()->>'email'
                        or public.access_role() in ('editor','admin'))))
  with check (exists (select 1 from public.access_submissions s
                 where s.id = submission_id
                   and (s.created_by = auth.jwt()->>'email'
                        or public.access_role() in ('editor','admin'))));

-- =====================================================================
-- AUDIT LOG + PUBLISH GUARD
-- Publishing names real parties publicly: only editors/admins may flip
-- `published`, and every flip is recorded.
-- =====================================================================
create table if not exists public.access_audit_log (
  id          bigint generated always as identity primary key,
  actor_email text,
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  detail      jsonb,
  at          timestamptz not null default now()
);
alter table public.access_audit_log enable row level security;
drop policy if exists "staff read audit" on public.access_audit_log;
create policy "staff read audit" on public.access_audit_log
  for select to authenticated using (public.access_role() in ('editor','admin'));
-- inserts happen via trigger (security definer), not directly

create or replace function public.access_guard_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published is distinct from old.published then
    if public.access_role() not in ('editor','admin') then
      raise exception 'Only editors can publish or unpublish a barrier.';
    end if;
    insert into public.access_audit_log (actor_email, action, entity, entity_id, detail)
    values (auth.jwt()->>'email',
            case when new.published then 'publish' else 'unpublish' end,
            'access_locations', new.id,
            jsonb_build_object('label', new.label));
  end if;
  return new;
end;
$$;
drop trigger if exists access_locations_publish_guard on public.access_locations;
create trigger access_locations_publish_guard
  before update on public.access_locations
  for each row execute function public.access_guard_publish();

-- =====================================================================
-- REWRITE v1 POLICIES to use roles (any staff may edit content;
-- publishing is gated by the trigger above)
-- =====================================================================
drop policy if exists "staff full access access_locations" on public.access_locations;
create policy "staff full access access_locations" on public.access_locations
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');
drop policy if exists "staff full access access_photos" on public.access_photos;
create policy "staff full access access_photos" on public.access_photos
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');
drop policy if exists "staff full access access_events" on public.access_events;
create policy "staff full access access_events" on public.access_events
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');

drop policy if exists "staff write barrier photos" on storage.objects;
create policy "staff write barrier photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'barrier-photos' and public.access_role() <> '')
  with check (bucket_id = 'barrier-photos' and public.access_role() <> '');

-- v1 allow-list table retired (superseded by access_staff). Kept for now;
-- drop after verifying v2:  -- drop table public.access_staff_emails;

-- Verify: access_staff shows 2 admins; try flipping published as a
-- contributor -> error; submissions insert requires matching email.
