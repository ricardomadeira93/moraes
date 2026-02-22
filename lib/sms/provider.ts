export type SmsType = "booking_confirmation" | "reminder_30m" | "cancellation";

export type SmsMessage = {
  to: string;
  body: string;
  type: SmsType;
  metadata?: Record<string, string>;
};

/**
 * Interface-based abstraction so providers can be swapped (Twilio, MessageBird, Zenvia, etc.).
 */
export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<{ provider: string; accepted: boolean; id?: string }>;
}

/**
 * Default local/staging provider: logs messages and always succeeds.
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock";

  async send(message: SmsMessage) {
    const id = `mock_${Date.now()}`;
    console.log(`[MockSMS][${message.type}] to=${message.to} id=${id} body="${message.body}"`);
    return { provider: this.name, accepted: true, id };
  }
}

/**
 * Safe no-op provider for environments where SMS should be disabled.
 */
export class NoopSmsProvider implements SmsProvider {
  readonly name = "noop";
  async send() {
    return { provider: this.name, accepted: true };
  }
}

/**
 * Replace this switch with real providers as needed.
 */
export function createSmsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "noop":
      return new NoopSmsProvider();
    case "mock":
    default:
      return new MockSmsProvider();
  }
}

export const smsProvider: SmsProvider = createSmsProvider();

/** Usage examples for application services/jobs. */
export async function sendBookingConfirmationSMS(phone: string) {
  return smsProvider.send({
    to: phone,
    type: "booking_confirmation",
    body: "Seu horário foi confirmado."
  });
}

export async function sendReminderSMS(phone: string) {
  return smsProvider.send({
    to: phone,
    type: "reminder_30m",
    body: "Lembrete: seu atendimento começa em 30 minutos."
  });
}

export async function sendCancellationSMS(phone: string) {
  return smsProvider.send({
    to: phone,
    type: "cancellation",
    body: "Seu agendamento foi cancelado."
  });
}
