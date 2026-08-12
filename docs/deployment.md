# Deployment

Fuel10 is structured for Vercel plus Supabase.

## Required environment variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MAP_PROVIDER`
- `NEXT_PUBLIC_DELIVERY_FEE`
- `NEXT_PUBLIC_EMERGENCY_FEE`
- `NEXT_PUBLIC_PETROL_PRICE_PER_LITRE`
- `NEXT_PUBLIC_DIESEL_PRICE_PER_LITRE`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FUEL10_SUPPORT_NUMBER`

## Local build shape

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Database

- apply `supabase/migrations/0001_initial_schema.sql`
- keep the transition and assignment SQL functions in sync with the app service

## Notes

Production deployment still needs the final authentication, realtime, and provider integration steps to be fully complete.
