# Supabase source restoration status

This directory is a source-code recovery from the historical snapshot previously stored at `.migration-backup/supabase`.

## Restored

- 68 SQL migration files under `supabase/migrations/`.
- The existing `send-push-notification` Edge Function under `supabase/functions/`.
- The historical Supabase CLI configuration file.

## Intentionally not restored

- `seed.sql` was left in the backup because it contains demo stores, products, ratings, and test data. It must not be run against a shared or production database.

## Critical status

- These migrations are historical repository material, **not a verified representation of the currently deployed database**.
- The `project_id` in the copied config is historical metadata. It has not been confirmed as the owner's approved non-production target and must not be treated as authorization to link or deploy.
- No Supabase project was linked or queried during this restoration.
- No schema diff, baseline migration, migration application, seed execution, database write, or production access was performed.
- Do not run `supabase db push`, `supabase migration up`, or `supabase db reset` based solely on this folder.

## Required before a baseline

1. The owner must explicitly identify and confirm the non-production Supabase project.
2. Compare the live non-production schema, migration history, RLS, RPC, triggers, extensions, and storage policies against this snapshot.
3. Resolve drift and prepare a reviewed baseline/diff with verification queries and a rollback plan.
4. Stop for owner approval before executing any database change.

The snapshot's presence in the repository does not establish that it matches any remote database.
