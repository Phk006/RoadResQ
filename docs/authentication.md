# Authentication

Fuel10 is designed around Supabase Auth.

## Current foundation

- environment variables are scaffolded in `.env.example`
- role names are centralized in `lib/domain.ts`
- `lib/auth/authorization.ts` contains a role-check helper
- request access paths are written so the server can enforce ownership and role boundaries

## What is still pending

- sign-in and sign-up UI
- Supabase session wiring
- protected route middleware
- role assignment flows

## Security note

Roles must be resolved server-side from trusted identity data, not from client input.
