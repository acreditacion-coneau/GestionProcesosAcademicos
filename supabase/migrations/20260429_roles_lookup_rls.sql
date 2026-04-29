-- Mantener RLS habilitado y permitir solo lectura mínima para resolver rol en login frontend.
-- Nota: con anon key, esto sigue siendo lectura pública de esas filas para cualquier cliente.

DO $$
BEGIN
  IF to_regclass('public.docentes') IS NOT NULL THEN
    EXECUTE 'alter table public.docentes enable row level security';
    EXECUTE 'drop policy if exists "docentes_select_login_anon" on public.docentes';
    EXECUTE 'create policy "docentes_select_login_anon" on public.docentes for select to anon, authenticated using (true)';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.designacioens') IS NOT NULL THEN
    EXECUTE 'alter table public.designacioens enable row level security';
    EXECUTE 'drop policy if exists "designacioens_select_login_anon" on public.designacioens';
    EXECUTE 'create policy "designacioens_select_login_anon" on public.designacioens for select to anon, authenticated using (true)';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.designaciones') IS NOT NULL THEN
    EXECUTE 'alter table public.designaciones enable row level security';
    EXECUTE 'drop policy if exists "designaciones_select_login_anon" on public.designaciones';
    EXECUTE 'create policy "designaciones_select_login_anon" on public.designaciones for select to anon, authenticated using (true)';
  END IF;
END
$$;
