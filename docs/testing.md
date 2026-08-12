# Testing

Fuel10 uses Vitest for unit and service-layer tests.

## Current coverage

- pricing calculations
- location providers
- SMS parsing
- dispatch scoring
- request state transitions
- request service idempotency

## Commands

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Notes

- The repository is structured so dispatch, pricing, SMS parsing, and request persistence can be tested without rendering the UI.
- Mock providers are deliberately explicit so tests do not accidentally look like production integrations.
- End-to-end browser coverage is still a later phase item.
