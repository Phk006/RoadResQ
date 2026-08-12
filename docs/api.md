# API

Fuel10 route handlers use a consistent `{ data, error }` envelope.

## `POST /api/requests`

Creates a fuel request.

Request body:

```json
{
  "contactPhone": "+91 98765 43210",
  "customerName": "Asha",
  "idempotencyKey": "b2f0f7c3-2c7c-4a4d-9ad7-6a8fa1a0f9b6",
  "fuelType": "PETROL",
  "quantityLitres": 3,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "priority": "HIGH",
  "requestChannel": "WEB"
}
```

Response fields:

- `requestId`
- `status`
- `storageMode`
- `estimatedTotal`
- `currency`

## `GET /api/requests/:id`

Returns a request summary for confirmation/status reads.

Optional query parameter:

- `contactPhone` to verify the caller matches the request phone

Response fields now include assignment metadata when available:

- `assignedPartnerId`
- `assignedPartnerName`
- `assignedPartnerScore`
- `assignedPartnerEtaMinutes`
- `assignedAt`

## `POST /api/requests/:id/status`

Moves a request through the explicit lifecycle state machine.

Request body:

```json
{
  "nextStatus": "EN_ROUTE",
  "actorRole": "OPERATIONS_ADMIN",
  "reason": "Driver departed depot"
}
```

## `POST /api/dispatch/assign`

Evaluates partner candidates, assigns the best match, and advances the request into `ASSIGNED`.

## `GET /api/partners/:partnerId/requests`

Returns the queue assigned to a specific partner.

## `POST /api/requests/:id/accept`

Allows the assigned partner to accept the request.

## `POST /api/requests/:id/reject`

Allows the assigned partner to release the request back to `SEARCHING`.

## `GET /api/operations/requests`

Returns the full operations queue for the command center.

## `POST /api/sms/inbound`

Processes an inbound SMS payload.

Expected input shape:

```json
{
  "from": "+91 98765 43210",
  "body": "FUEL 3 PETROL",
  "latitude": 12.9716,
  "longitude": 77.5946
}
```

If coordinates are missing, the handler returns a location-needed response instead of fabricating GPS data.

## Health

`GET /api/health` returns a simple service health check.
