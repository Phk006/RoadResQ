# Voice

Fuel10 defines a `VoiceProvider` contract so an IVR can be attached later without changing the core request logic.

## Current state

- the provider interface exists in `lib/providers/contracts.ts`
- the mock provider can return a development response
- public IVR routing is not yet wired to a production phone number

## Planned IVR flow

- identify caller
- offer request creation or tracking
- connect to support
- hand the call into the same request service used by web and SMS

## Notes

The support number must come from `FUEL10_SUPPORT_NUMBER` in environment configuration once the telephony integration is added.
