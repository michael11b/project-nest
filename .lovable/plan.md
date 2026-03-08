

# Audit Event Logging Triggers

## Overview
Create PostgreSQL triggers on key tables that automatically insert rows into `audit_events` whenever workspace actions occur. This removes the need for client-side audit logging and ensures consistent, tamper-resistant tracking.

## Database Migration

A single migration adding a helper function and triggers for the following tables:

### Helper Function: `log_audit_event`
A `SECURITY DEFINER` function that inserts into `audit_events`. Triggers call this to bypass the INSERT RLS policy (which requires `auth.uid()` -- not available in all trigger contexts). The function uses `auth.uid()` as the actor when available, falling back to the row's user reference.

### Triggers

| Table | Events | Action Logged | Target Type | Notes |
|-------|--------|--------------|-------------|-------|
| `prompts` | INSERT, UPDATE, DELETE | `prompt.created`, `prompt.updated`, `prompt.deleted` | `prompt` | `workspace_id` from row |
| `prompt_versions` | INSERT, UPDATE | `version.created`, `version.updated` | `prompt_version` | `workspace_id` looked up via `prompts` |
| `releases` | INSERT | `release.created` | `release` | `workspace_id` looked up via `environments` |
| `workspace_members` | INSERT, DELETE | `member.added`, `member.removed` | `member` | `workspace_id` from row |
| `test_suites` | INSERT, UPDATE, DELETE | `suite.created`, `suite.updated`, `suite.deleted` | `test_suite` | `workspace_id` looked up via `prompts` |
| `drift_policies` | INSERT, UPDATE, DELETE | `drift_policy.created`, `drift_policy.updated`, `drift_policy.deleted` | `drift_policy` | `workspace_id` from row |
| `provider_keys` | INSERT, UPDATE, DELETE | `provider_key.created`, `provider_key.updated`, `provider_key.deleted` | `provider_key` | `workspace_id` from row |

### Metadata captured
Each trigger stores relevant context in `metadata_json`:
- For prompts: `{ "name": "...", "slug": "..." }`
- For versions: `{ "version_number": N, "status": "..." }`
- For releases: `{ "environment_id": "...", "version_id": "..." }`
- For members: `{ "role": "...", "user_id": "..." }`

### Actor resolution
- `auth.uid()` is used as actor (available during client-initiated operations)
- For member changes, falls back to the acting admin's ID

## Updated File

### `src/pages/AuditLogsSettings.tsx`
Update the action filter dropdown to include the new trigger-generated action names so they appear in the filter options.

## Technical Notes
- Triggers use `AFTER` timing to avoid blocking the original operation
- The audit insert function is `SECURITY DEFINER` to bypass RLS on `audit_events`
- No code changes needed in hooks -- triggers fire server-side automatically
- `OLD` record is used for DELETE, `NEW` for INSERT/UPDATE

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create triggers + helper function |
| `src/pages/AuditLogsSettings.tsx` | Update action filter list |

