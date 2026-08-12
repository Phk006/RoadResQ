# Operations

Fuel10 now includes a lightweight operations command-center view at `/operations`.

## Current capabilities

- list all requests in the queue
- inspect status, fuel type, quantity, priority, and partner assignment
- refresh the queue on demand
- use the shared request service rather than a separate operations data model

## Backing API

- `GET /api/operations/requests`
- `POST /api/requests/:id/status`
- `POST /api/dispatch/assign`

## Notes

This is a foundation view, not the final full-scale control center from the product brief. The next steps are live map visualization, manual reassignment, incident management, and operational contact actions.
