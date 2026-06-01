# Testing Autoevaluacion

## Scripts

- `npm run test`: unit e integration con Vitest y React Testing Library.
- `npm run test:coverage`: reporte de cobertura en `coverage/`.
- `npm run test:ui`: UI interactiva de Vitest.
- `npm run test:e2e`: flujos reales con Playwright en Chromium headless.
- `npm run test:db`: pgTAP via Supabase CLI.

## Datos

Los tests frontend usan factories tipadas en `tests/factories`.
Los E2E usan datos reales. Para una base local, cargar `supabase/seed.autoevaluacion_testing.sql`.

Credenciales E2E:

- Docente demo: `12345678` / `12345678`
- Secretaria demo: `45678901` / `45678901`
- Jefe de carrera: configurar `E2E_JEFE_DNI` y `E2E_JEFE_PASSWORD`

## Supabase

Los tests pgTAP viven en `supabase/tests/database/` y validan estructura, restricciones operativas, estados y una base para RLS futura.
