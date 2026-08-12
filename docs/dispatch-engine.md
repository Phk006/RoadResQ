# Dispatch Engine

Fuel10’s dispatch engine is designed to select the best serviceable partner, not simply the closest one.

## Inputs

- customer latitude and longitude
- fuel type
- requested quantity
- request priority
- current request status
- candidate partner metrics

## Candidate filters

Before scoring, the engine filters out partners that:

- are offline
- do not have a delivery agent available
- do not support the requested fuel type
- are outside the service radius
- do not have enough fuel inventory

## Scoring

The scoring logic lives in `lib/dispatch/scoring.ts`.

Configured factors:

- ETA
- distance
- availability
- capacity
- reliability
- workload

The weights are configurable from environment variables:

- `DISPATCH_ETA_WEIGHT`
- `DISPATCH_DISTANCE_WEIGHT`
- `DISPATCH_AVAILABILITY_WEIGHT`
- `DISPATCH_CAPACITY_WEIGHT`
- `DISPATCH_RELIABILITY_WEIGHT`
- `DISPATCH_WORKLOAD_WEIGHT`
- `DISPATCH_HIGH_PRIORITY_BOOST`

## State changes

Assignment advances a request through the stored state machine rather than trusting client-supplied status:

- request is moved to `SEARCHING`
- best candidate is selected
- request is assigned to the selected partner
- assignment metadata is stored on the request row
- audit and status history are written at the database layer

## Current implementation

- `POST /api/dispatch/assign` evaluates candidate partners and stores the selected assignment
- `POST /api/requests/:id/status` moves a request through explicit transitions
- database functions enforce transition legality and write audit history

## Notes

This is the first dispatch slice. Reassignment, timeouts, partner acceptance, and automated radius expansion are still next-phase work.
