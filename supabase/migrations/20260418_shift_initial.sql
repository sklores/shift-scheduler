-- Shift Scheduler — initial schema
-- Single-tenant MVP (GCDC only). Designed for easy multi-tenant upgrade later
-- by adding org_id columns + policies. All tables prefixed with shift_ to
-- peacefully coexist with the existing And-Done-Backend schema.
--
-- Run this once in the Supabase SQL Editor (or via Management API).

-- ---------- Enums ----------
do $$ begin
  create type shift_employee_role as enum ('manager','server','cashier','cook','host','barista');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------

-- Employees
create table if not exists public.shift_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role shift_employee_role not null default 'server',
  hourly_rate numeric(8,2) not null default 0,
  phone text not null default '',
  color text not null default '#2a4f72',
  employee_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shift_employees_active on public.shift_employees (is_active);
create unique index if not exists uq_shift_employees_code
  on public.shift_employees (employee_code) where employee_code is not null;

-- Shifts — shift_date (YYYY-MM-DD) replaces the old day-of-week-only model
create table if not exists public.shift_shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.shift_employees(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_time_order check (end_time > start_time)
);
create index if not exists idx_shift_shifts_date on public.shift_shifts (shift_date);
create index if not exists idx_shift_shifts_employee on public.shift_shifts (employee_id);
create index if not exists idx_shift_shifts_date_employee
  on public.shift_shifts (shift_date, employee_id);

-- Templates (saved weekly patterns)
create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_week_start date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Template items (template contents)
create table if not exists public.shift_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.shift_templates(id) on delete cascade,
  employee_id uuid references public.shift_employees(id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint template_time_order check (end_time > start_time)
);
create index if not exists idx_shift_template_items_template
  on public.shift_template_items (template_id);

-- Employee blackout dates (availability blocks) — for future feature
create table if not exists public.shift_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.shift_employees(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  constraint block_date_order check (ends_on >= starts_on)
);
create index if not exists idx_shift_availability_employee
  on public.shift_availability_blocks (employee_id);

-- ---------- updated_at trigger ----------
create or replace function public.shift_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ begin
  create trigger trg_shift_employees_updated before update on public.shift_employees
    for each row execute function public.shift_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_shift_shifts_updated before update on public.shift_shifts
    for each row execute function public.shift_set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_shift_templates_updated before update on public.shift_templates
    for each row execute function public.shift_set_updated_at();
exception when duplicate_object then null; end $$;

-- ---------- Row Level Security ----------
-- Beta policy: any AUTHENTICATED user can read/write all shift_* data.
-- When we add multi-tenant, we'll replace with org-scoped policies.
-- Anonymous users cannot access anything (password gate + server signin handles auth).

alter table public.shift_employees enable row level security;
alter table public.shift_shifts enable row level security;
alter table public.shift_templates enable row level security;
alter table public.shift_template_items enable row level security;
alter table public.shift_availability_blocks enable row level security;

-- Drop-if-exists then create so re-running is safe
drop policy if exists shift_employees_authed_all on public.shift_employees;
create policy shift_employees_authed_all on public.shift_employees
  for all to authenticated using (true) with check (true);

drop policy if exists shift_shifts_authed_all on public.shift_shifts;
create policy shift_shifts_authed_all on public.shift_shifts
  for all to authenticated using (true) with check (true);

drop policy if exists shift_templates_authed_all on public.shift_templates;
create policy shift_templates_authed_all on public.shift_templates
  for all to authenticated using (true) with check (true);

drop policy if exists shift_template_items_authed_all on public.shift_template_items;
create policy shift_template_items_authed_all on public.shift_template_items
  for all to authenticated using (true) with check (true);

drop policy if exists shift_availability_blocks_authed_all on public.shift_availability_blocks;
create policy shift_availability_blocks_authed_all on public.shift_availability_blocks
  for all to authenticated using (true) with check (true);
