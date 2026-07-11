-- Fix (applied to prod 2026-07-11 via connector): the check-insert policy's
-- visibility subquery ran under the caller's RLS (anon sees zero raw rows),
-- so every insert failed. SECURITY DEFINER helper does the visibility test.
create or replace function public.access_check_target_visible(rid uuid, lid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when rid is not null and lid is null then
      exists (select 1 from public.access_public_reports r
              where r.id = rid and r.status <> 'dismissed')
    when lid is not null and rid is null then
      exists (select 1 from public.access_locations l
              where l.id = lid and l.published)
    else false
  end;
$$;
grant execute on function public.access_check_target_visible(uuid, uuid) to anon, authenticated;

drop policy if exists "anyone checks visible barriers" on public.access_barrier_checks;
create policy "anyone checks visible barriers" on public.access_barrier_checks
  for insert to anon, authenticated
  with check (public.access_check_target_visible(report_id, location_id));
