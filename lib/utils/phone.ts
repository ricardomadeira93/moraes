export function normalizePhone(raw: string): string {
  const normalized = raw.replace(/\D/g, "");
  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error("Invalid phone number");
  }
  return normalized;
}
