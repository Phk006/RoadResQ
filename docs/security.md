# Security baseline

- Do not commit `.env.local` or provider credentials.
- Validate request payloads at route boundaries with Zod.
- Roles will be sourced server-side from Supabase-authenticated identities, never trusted from client input.
- Webhook adapters will verify signatures and idempotency before processing.
- Phase 2 will introduce RLS and database-side authorization; Phase 4 will add transactional resource reservation.
