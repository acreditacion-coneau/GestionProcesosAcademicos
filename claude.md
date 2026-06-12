## Instrucciones para Claude Code
- Aplicá los cambios directamente en los archivos, nunca mostrar el código en pantalla
- No pidas confirmación antes de editar, hacé los cambios y reportá qué cambiaste
- Reportes cortos: solo qué archivo tocaste y qué cambió
- sé un cavernícola. sin preámbulos. sin despedidas. sin frases de relleno. nunca narres lo que vas a hacer. accion primero, explica solo si se te pregunta

# Contexto del proyecto

Sistema de gestión de procesos académicos para acreditación CONEAU — FAU.

## Stack
React + Vite + TypeScript + Tailwind + shadcn/ui + Recharts + Supabase

## Colores institucionales
- Azul principal: #1e3a8a
- Éxito: #10b981 (emerald)
- Pendiente: #f59e0b (amber)
- Vencido: #e11d48 (rose)

## Roles del sistema
- DOCENTE — ve autoevaluación, seguros, repositorios
- DOCENTE_RESPONSABLE — además inicia trámites de ayudantes y adscriptos
- JEFE_CARRERA — da vistos buenos, lanza autoevaluación
- SECRETARIA — visión global, valida y cierra trámites

## Flujo de aprobación
DOCENTE_RESPONSABLE (fases 1, 5) → JEFE_CARRERA (fases 3, 6, 8) → SECRETARIA (fases 4, 7)

## Archivos clave
- src/app/types/tramites.ts — fases y tipos
- src/app/context/UserContext.tsx — roles y usuario
- src/app/context/TramitesContext.tsx — estado de trámites
- src/app/pages/TeacherDashboard.tsx — docente y responsable
- src/app/pages/JefeCarreraDashboard.tsx — jefe de carrera
- src/app/pages/SecretariaDashboard.tsx — secretaría

## Convenciones
- Componentes en español institucional
- Sin datos hardcodeados, siempre conectar al contexto real
- Mantener la estética existente: rounded-xl, shadow-sm, border-slate-100

## RESTRICCIONES VISUALES
- NO modificar estilos globales (index.css, tailwind.config, globals)
- NO cambiar paleta de colores existente
- NO alterar componentes UI base (shadcn) sin instrucción explícita
- Color institucional: #1e3a8a — no reemplazar
- Cualquier cambio estético requiere aprobación explícita