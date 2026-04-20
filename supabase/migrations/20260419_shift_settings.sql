-- Generic key-value settings store for the shift scheduler.
-- Single row per key. External tools can read any value with a simple select.
create table if not exists public.shift_settings (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

do $$ begin
  create trigger trg_shift_settings_updated before update on public.shift_settings
    for each row execute function public.shift_set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.shift_settings enable row level security;

drop policy if exists shift_settings_authed_all on public.shift_settings;
create policy shift_settings_authed_all on public.shift_settings
  for all to authenticated using (true) with check (true);

-- Seed the weekly salary key so it always exists
insert into public.shift_settings (key, value)
values ('weekly_salary', '0')
on conflict (key) do nothing;
