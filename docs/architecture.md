# Architecture

Fuel10 uses Next.js App Router with TypeScript in strict mode. Route handlers validate external input with Zod and emit a consistent `{ data, error }` envelope. Domain workflows will live outside React components, allowing the API, SMS, and IVR channels to share the same services.

Provider boundaries are defined for maps, location, SMS, voice, payments, and notifications. Mock providers are usable only for local development and return explicit mock identifiers; no mock result represents production completion.

Phase 2 adds Supabase PostgreSQL/PostGIS, RLS, migrations, and transactional dispatch persistence.
