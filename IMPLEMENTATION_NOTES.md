# Campaign-Driven Evaluation System - Implementation Complete

## Summary of Changes

This refactor transforms the academic evaluation system from static evaluation storage to a campaign-driven dynamic generation model.

### Key Changes Made

#### 1. Backend - RPC Functions

**File: `supabase/migrations/20260603_activate_campaign_rpc.sql`**

Created `activate_campaign(p_campaign_id)` RPC function that:
- Sets campaign status to 'activa'
- Automatically generates evaluation assignments (asignaciones_evaluacion) from teacher designations (designaciones)
- Only generates for the campaign's associated degree program (carrera)
- Is idempotent - safe to call multiple times without creating duplicates
- Returns JSON with success status and count of generated assignments

**File: `supabase/migrations/20260603_activate_campaign_constraint.sql`**

Added unique constraint on asignaciones_evaluacion:
- Constraint: `(id_campania, id_docente, id_asignatura)`
- Ensures evaluations are per-subject, not per-assignment
- Enables safe ON CONFLICT handling

#### 2. Frontend - Service Layer

**File: `src/app/services/autoevaluacionService.ts`**

Updated `lanzarCampania(idCampania)` function:
- Changed from direct table update to RPC call
- Now calls `activate_campaign()` RPC function
- Logs response for debugging
- Provides clear error messages

#### 3. Frontend - UI/UX

**File: `src/app/pages/AutoevaluacionForm.tsx`**

Enhanced the Jefe de Carrera dashboard with:

**Campaign Management UI:**
- Added `campaignToActivate` state for confirmation dialog
- Added `isActivatingCampaign` state for loading feedback
- Updated `handleCreateCampania` - creates draft campaigns
- Updated `handleLaunch` - shows confirmation dialog instead of immediate activation
- Added `handleConfirmActivate` - actually launches campaign after confirmation

**Confirmation Dialog:**
- Explains what will happen: "Se generarán automáticamente todas las asignaciones de evaluación"
- Shows loading state during activation
- Allows user to cancel before proceeding

**UI Labels & Descriptions:**
- Changed button text from "Lanzar" to "Activar Campaña" for clarity
- Updated section description to explain: "Cree una campaña en borrador y luego actívela. Al activar, se generarán automáticamente las asignaciones de evaluación para todos los docentes."

### How It Works

#### Campaign Creation Flow

```
1. Jefe de Carrera creates campaign (draft status)
   - Name, type (1er semestre, 2do semestre, anual)
   - No evaluations generated yet
   - Can be exported but empty

2. Jefe de Carrera clicks "Activar Campaña"
   - Confirmation dialog appears
   - Explains automatic generation of assignments

3. User confirms activation
   - Backend activate_campaign() RPC executes
   - Queries designaciones for the carrera
   - Generates asignaciones_evaluacion for each designación
   - Updates campaign status to 'activa'
   - Returns count of generated assignments

4. Dashboard updates automatically
   - Shows generated assignments
   - Teachers can see their evaluations
   - Secretaría dashboard shows metrics
```

### Dashboard Behavior

#### Secretaría Dashboard (SecretariaDashboard.tsx)
- Shows empty state if no active campaign
- Shows empty state if campaign has no evaluations
- Shows metrics when evaluations exist
- Handles zero counts gracefully

#### Jefe de Carrera Dashboard (AutoevaluacionForm - JefeAutoevaluacion)
- Lists all campaigns with status badges
- Only shows "Activar Campaña" button for draft campaigns
- After activation, shows campaign as "activa"
- Can export evaluations after activation

### Safety Features

**Idempotent Design:**
- Re-running activate_campaign won't create duplicates
- Uses ON CONFLICT (id_campania, id_docente, id_asignatura) DO NOTHING
- Unique constraint enforces this at database level

**Error Handling:**
- RPC function catches exceptions and returns error JSON
- Frontend displays human-readable error messages
- Logs detailed error information for debugging

**Atomicity:**
- All operations in RPC function execute as single transaction
- Either all assignments are created and campaign activated, or none are
- Prevents partial states

### Data Integrity Rules

1. **Per-Subject Evaluations**: Each docente has one evaluation per asignatura per campaign
   - Not per-assignment (multiple designations same subject = one evaluation)
   
2. **Campaign-Scoped**: Each campaign only generates evaluations for its carrera
   - Multi-carrera deployments work correctly
   
3. **Draft Campaigns**: Don't generate data until explicitly activated
   - Planning phase separate from execution phase
   
4. **Backward Compatible**: Existing evaluation data is preserved
   - Manually inserted evaluations are not modified
   - Can still manually insert for special cases

### Testing Checklist

**Unit Level:**
- [ ] RPC function compiles without errors
- [ ] Unique constraint is created
- [ ] Service function calls RPC correctly

**Integration Level:**
- [ ] Create campaign (draft) in Jefe dashboard
- [ ] Confirm campaign is in "borrador" state
- [ ] Click "Activar Campaña" button
- [ ] Confirmation dialog appears
- [ ] Confirm activation
- [ ] Check asignaciones_evaluacion table - should have new rows
- [ ] Campaign status changed to "activa"
- [ ] Dashboard shows generated assignments

**UI/UX Level:**
- [ ] Campaign creation input validation works
- [ ] Confirmation dialog is clear and professional
- [ ] Loading state shows during activation
- [ ] Success/error messages display correctly
- [ ] Can cancel confirmation dialog

**Secretaría Dashboard Level:**
- [ ] Shows empty state for draft campaigns
- [ ] Shows metrics after activation
- [ ] Handles multiple campaigns correctly
- [ ] Export works with generated evaluations

### Known Limitations

1. **Batch Generation Only**: Evaluations are generated all-at-once when campaign activates
   - Not incremental as new designations are added
   - Designations must exist before campaign activation

2. **No Manual Removal**: Once generated, evaluations must be completed or status changed
   - To reset, must manually delete from asignaciones_evaluacion
   - Consider adding "reset campaign" feature in future

3. **Designación Snapshot**: Uses current designaciones at activation time
   - If designations change after activation, new evaluations not generated
   - Consider adding "refresh evaluations" feature for large mid-semester changes

## Files Modified

1. `supabase/migrations/20260603_activate_campaign_rpc.sql` - NEW
2. `supabase/migrations/20260603_activate_campaign_constraint.sql` - NEW
3. `src/app/services/autoevaluacionService.ts` - MODIFIED
4. `src/app/pages/AutoevaluacionForm.tsx` - MODIFIED

## Deployment Instructions

1. Apply migrations in order:
   ```sql
   -- Execute in Supabase SQL Editor
   -- 1. First constraint migration
   -- 2. Then RPC function migration
   ```

2. Verify function is created:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'activate_campaign';
   ```

3. Test RPC function:
   ```sql
   SELECT public.activate_campaign('test-campaign-id');
   ```

4. Deploy frontend code:
   ```bash
   npm run build
   npm run deploy
   ```

5. Verify UI changes in Jefe de Carrera dashboard
