-- Permitir login por DNI desde frontend (anon key) sobre tabla docentes.
-- Ajustar si más adelante migrás a auth real de Supabase.

alter table if exists public.docentes enable row level security;

drop policy if exists "docentes_select_login_anon" on public.docentes;

create policy "docentes_select_login_anon"
on public.docentes
for select
to anon, authenticated
using (true);
