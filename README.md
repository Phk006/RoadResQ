# Fuel10

Production-oriented emergency roadside fuel-delivery platform. The current build establishes a Next.js 15, TypeScript, Tailwind, Zod, Supabase-ready foundation plus a working customer request intake flow, SMS fallback endpoint, and request persistence abstraction.

## Local development

1. Copy `.env.example` to `.env.local` and set values appropriate to your environment.
2. Run `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.

## Quality commands

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build`

## Architecture

The UI is in `app/`; business concerns are isolated under `lib/`. External integrations begin behind replaceable contracts in `lib/providers`. Mock adapters are explicitly labelled and are development-only behavior. Database migrations and Supabase security are Phase 2.

The landing page now includes a real request form that captures contact phone, fuel type, quantity, and coordinates, then posts into the request API.

See [architecture documentation](docs/architecture.md), [security notes](docs/security.md), and the [phase plan](docs/development-plan.md).
