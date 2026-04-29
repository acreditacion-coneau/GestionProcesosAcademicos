# Proyecto: Sistema Académico UCASAL

## Stack
- Frontend: Vercel
- Backend: Supabase
- DB: PostgreSQL

## Tablas existentes
- docentes
- designaciones
- alumnos
- solicitud_ayudante
- solicitud_alumnos
- documentos

## Reglas
- Una solicitud puede tener máximo 2 alumnos
- Los documentos se suben a Supabase Storage
- Usar id_docente como FK
- No usar DNI como relación

## Objetivo
Implementar el flujo completo de ayudante alumno:
- Crear solicitud
- Vincular alumnos
- Subir documentos
- Manejar estados