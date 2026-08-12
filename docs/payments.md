# Payments

Fuel10 defines a `PaymentProvider` contract and a mock implementation so the request flow can be exercised without a live gateway.

## Current state

- `lib/providers/contracts.ts` contains the provider interface
- `lib/providers/mock.ts` contains a mock payment provider
- pricing is centralized in `lib/pricing/service.ts`

## Notes

- the mock provider must never be presented as a real financial transaction
- the production gateway adapter is still a later phase item
- payment storage already exists in the migration schema

## Next step

Wire a real payment request/verification endpoint only after a live payment provider is selected and configured.
