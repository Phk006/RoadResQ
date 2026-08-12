# SMS

Fuel10’s SMS path is built around the principle that a message does not automatically contain GPS.

## Current implementation

- `lib/sms/parser.ts` parses commands like `FUEL 3 PETROL`
- `POST /api/sms/inbound` validates an inbound payload
- if coordinates are missing, the handler asks for location rather than inventing it
- fallback requests reuse the same request service as the web flow

## Behavior

- sender phone is required
- fuel type must be `PETROL` or `DIESEL`
- quantity must be between 0 and 20 litres
- location can be explicit coordinates now; landmark and highway-name support are still future work

## Mock provider

The development SMS provider is explicit and non-production. It exists so tests and local flows can exercise the code path without a live carrier.
