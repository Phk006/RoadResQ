# Database

Fuel10 uses a Supabase PostgreSQL/PostGIS schema. The initial migration lives at `supabase/migrations/0001_initial_schema.sql`.

## Current core tables

- `profiles`, `user_roles`
- `fuel_partners`, `fuel_partner_locations`, `fuel_inventory`
- `delivery_agents`, `vehicles`, `service_zones`
- `fuel_requests`, `request_status_history`, `dispatch_attempts`, `deliveries`, `delivery_tracking`, `delivery_otps`
- `notifications`, `sms_messages`, `voice_calls`, `payments`, `support_tickets`, `incidents`, `audit_logs`, `settings`

## Request model

`fuel_requests` stores:

- `request_scope_key` for idempotency scope
- `contact_phone` for customer identity and SMS fallback
- `customer_id` when a signed-in Supabase user exists
- `latitude` and `longitude` for quick application reads
- `customer_location` as a PostGIS geography point for geospatial queries
- `request_channel` so web, SMS, voice, and operations flows can converge on one table

The migration also exposes `public.create_fuel_request(...)` so the server can insert coordinates without hand-crafting geography values in application code.

## RLS

The current migration enables RLS for the customer-facing tables and adds read policies for:

- self profile reads
- customer request reads
- recipient notification reads

Server-side request creation uses the Supabase service role, so it can write safely without trusting the client.

## Local notes

- If Supabase environment variables are missing, the request service falls back to an in-memory repository in development only.
- Production requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
