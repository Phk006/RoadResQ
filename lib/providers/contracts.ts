export type SmsMessage = { to: string; body: string; idempotencyKey: string };
export interface SmsProvider {
  sendSms(message: SmsMessage): Promise<{ providerMessageId: string; status: "queued" | "sent" }>;
  receiveSms(payload: unknown): Promise<{ from: string; body: string; providerMessageId: string }>;
  verifyWebhook(headers: Headers, payload: string): Promise<boolean>;
  normalizeMessage(body: string): string;
}

export interface VoiceProvider {
  handleInboundCall(payload: unknown): Promise<{ response: string }>;
  verifyWebhook(headers: Headers, payload: string): Promise<boolean>;
}

export interface PaymentProvider {
  createPayment(input: { requestId: string; amount: number; currency: "INR"; idempotencyKey: string }): Promise<{ paymentId: string; status: "pending"; isMock: boolean }>;
  verifyPayment(payload: unknown): Promise<{ paymentId: string; status: "paid" | "failed"; isMock: boolean }>;
  refundPayment(paymentId: string): Promise<{ paymentId: string; status: "refunded" }>;
}

export interface NotificationProvider {
  send(input: { recipientId: string; event: string; title: string; body: string }): Promise<{ notificationId: string }>;
}

export interface MapProvider {
  route(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }): Promise<{ distanceKm: number; etaMinutes: number }>;
}
