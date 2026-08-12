# Realtime

The current build uses pragmatic polling in a few places where realtime delivery is not yet wired:

- customer request tracking refreshes every 5 seconds
- partner and operations queues can be refreshed manually

This keeps the workflow usable while the Supabase Realtime layer is added later.

## Next realtime targets

- request assignment updates
- delivery status changes
- delivery-agent location updates
- operations queue updates

## Direction

The realtime implementation should eventually subscribe to request and delivery changes server-side, but the current code intentionally keeps the polling surface small and explicit.
