-- Accessibility in Real Time v3 — LIVE community feed.
-- Reports appear publicly the moment they're filed (no approval step).
-- Editors/admins can delete or hide; 3 community flags auto-hide a post
-- pending staff review. Filing goes through a rate-limited server function.
-- Safe to re-run. Run after 0004, 0005, 0006.

-- ================= visibility + safety columns =================
alter table public.access_public_reports
  add column if not exists hidden     boolean not null default false,
  add column if not exists flag_count int not null default 0,
  add column if not exists ip_hash    text;  -- salted hash only; raw IP never stored

create table if not exists public.access_public_report_photos (
  id        uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.access_public_reports(id) on delete cascade,
  src       text not null,
  alt       text not null,
  sort      int not null default 0,
  constraint pub_alt_not_blank check (length(btrim(alt)) > 0)
);
alter table public.access_public_report_photos enable row level security;

-- ================= REAL-TIME VISIBILITY =================
-- The public reads every non-hidden report immediately.
drop policy if exists "public reads live reports" on public.access_public_reports;
create policy "public reads live reports" on public.access_public_reports
  for select to anon using (hidden = false);

drop policy if exists "public reads live report photos" on public.access_public_report_photos;
create policy "public reads live report photos" on public.access_public_report_photos
  for select to anon
  using (exists (select 1 from public.access_public_reports r
                 where r.id = report_id and r.hidden = false));

-- Direct anonymous INSERT is closed: filing goes through the rate-limited
-- function below (called by the app's server after the bot check).
drop policy if exists "anyone can file a report" on public.access_public_reports;

-- Staff see everything (incl. hidden), can update (restore/hide) and delete.
drop policy if exists "staff manage public reports" on public.access_public_reports;
create policy "staff manage public reports" on public.access_public_reports
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');
drop policy if exists "staff manage public report photos" on public.access_public_report_photos;
create policy "staff manage public report photos" on public.access_public_report_photos
  for all to authenticated
  using (public.access_role() <> '') with check (public.access_role() <> '');

-- ================= FILING: rate-limited, validated =================
create or replace function public.file_public_report(
  p_barrier_type text,
  p_barrier_desc text,
  p_place_desc   text,
  p_lat          numeric,
  p_lon          numeric,
  p_party_guess  text,
  p_reporter_name  text,
  p_reporter_email text,
  p_photos       jsonb,   -- [{src, alt}], max 4
  p_ip_hash      text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  rid uuid;
  ph  jsonb;
  n   int := 0;
begin
  -- validation (mirrors the table checks; friendlier errors)
  if p_barrier_desc is null or length(btrim(p_barrier_desc)) < 10 then
    raise exception 'Please describe the barrier in at least a sentence.';
  end if;
  if length(p_barrier_desc) > 3000 then
    raise exception 'Description is too long (3000 characters max).';
  end if;
  if jsonb_typeof(coalesce(p_photos,'[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_photos,'[]'::jsonb)) > 4 then
    raise exception 'Up to 4 photos per report.';
  end if;

  -- rate limits: 5/hour per source, 60/hour overall
  if p_ip_hash is not null and (
       select count(*) from public.access_public_reports
       where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Rate limit: please try again in a little while.';
  end if;
  if (select count(*) from public.access_public_reports
      where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'The feed is very busy right now — please try again soon.';
  end if;

  insert into public.access_public_reports
    (barrier_type, barrier_desc, place_desc, lat, lon, party_guess,
     reporter_name, reporter_email, ip_hash, status)
  values
    (nullif(btrim(coalesce(p_barrier_type,'')),''),
     btrim(p_barrier_desc),
     nullif(btrim(coalesce(p_place_desc,'')),''),
     p_lat, p_lon,
     nullif(btrim(coalesce(p_party_guess,'')),''),
     nullif(btrim(coalesce(p_reporter_name,'')),''),
     nullif(btrim(coalesce(p_reporter_email,'')),''),
     p_ip_hash, 'new')
  returning id into rid;

  for ph in select * from jsonb_array_elements(coalesce(p_photos,'[]'::jsonb)) loop
    if length(btrim(coalesce(ph->>'alt',''))) = 0 then
      raise exception 'Every photo needs a short description.';
    end if;
    insert into public.access_public_report_photos (report_id, src, alt, sort)
    values (rid, ph->>'src', btrim(ph->>'alt'), n);
    n := n + 1;
  end loop;

  return rid;
end;
$$;
revoke all on function public.file_public_report from public;
grant execute on function public.file_public_report to anon, authenticated;

-- ================= FLAG-TO-HIDE =================
create or replace function public.flag_public_report(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.access_public_reports
     set flag_count = flag_count + 1,
         hidden = (flag_count + 1 >= 3)   -- auto-hide at 3 flags, staff review
   where id = p_id and hidden = false;
end;
$$;
revoke all on function public.flag_public_report from public;
grant execute on function public.flag_public_report to anon, authenticated;

-- ================= PHOTO BUCKET (capped) =================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-photos','community-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone reads community photos" on storage.objects;
create policy "anyone reads community photos" on storage.objects
  for select to anon using (bucket_id = 'community-photos');
drop policy if exists "anyone uploads community photos" on storage.objects;
create policy "anyone uploads community photos" on storage.objects
  for insert to anon with check (bucket_id = 'community-photos');
drop policy if exists "staff manage community photos" on storage.objects;
create policy "staff manage community photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'community-photos' and public.access_role() <> '')
  with check (bucket_id = 'community-photos' and public.access_role() <> '');
