-- Add email column to shift_employees
alter table public.shift_employees
  add column if not exists email text not null default '';
