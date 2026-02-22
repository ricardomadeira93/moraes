export type SmsType = "booking_confirmation" | "reminder_30m" | "cancellation";

export interface SmsProvider {
  sendSMS(input: { to: string; message: string; type: SmsType }): Promise<void>;
}

export class MockSmsProvider implements SmsProvider {
  async sendSMS(input: { to: string; message: string; type: SmsType }) {
    console.log(`[MockSMS][${input.type}] ${input.to}: ${input.message}`);
  }
}

export const smsProvider: SmsProvider = new MockSmsProvider();
