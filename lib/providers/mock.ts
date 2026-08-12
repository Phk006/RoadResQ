import type { MapProvider, NotificationProvider, PaymentProvider, SmsMessage, SmsProvider, VoiceProvider } from "@/lib/providers/contracts";

export class MockSmsProvider implements SmsProvider {
  async sendSms(message: SmsMessage) { return { providerMessageId: `mock_sms_${message.idempotencyKey}`, status: "queued" as const }; }
  async receiveSms(payload: unknown) { const value = payload as { from?: string; body?: string; id?: string }; return { from: value.from ?? "unknown", body: value.body ?? "", providerMessageId: value.id ?? crypto.randomUUID() }; }
  async verifyWebhook() { return true; }
  normalizeMessage(body: string) { return body.trim().replace(/\s+/g, " ").toUpperCase(); }
}

export class MockVoiceProvider implements VoiceProvider {
  async handleInboundCall() { return { response: "Fuel10 development IVR. Press 1 for emergency fuel." }; }
  async verifyWebhook() { return true; }
}

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(input: { requestId: string; amount: number; currency: "INR"; idempotencyKey: string }) { return { paymentId: `mock_payment_${input.idempotencyKey}`, status: "pending" as const, isMock: true }; }
  async verifyPayment(payload: unknown) { const value = payload as { paymentId?: string; succeed?: boolean }; return { paymentId: value.paymentId ?? "mock_payment_unknown", status: value.succeed ? "paid" as const : "failed" as const, isMock: true }; }
  async refundPayment(paymentId: string) { return { paymentId, status: "refunded" as const }; }
}

export class MockNotificationProvider implements NotificationProvider {
  async send(input: { recipientId: string; event: string; title: string; body: string }) { return { notificationId: `mock_notification_${input.event}_${input.recipientId}` }; }
}

export class StraightLineMapProvider implements MapProvider {
  async route(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
    const distanceKm = haversine(origin, destination);
    return { distanceKm, etaMinutes: Math.max(1, Math.ceil((distanceKm / 35) * 60)) };
  }
}

function haversine(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 100) / 100;
}
