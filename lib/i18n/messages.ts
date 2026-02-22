import type { Locale } from "@/lib/types";

export const messages: Record<Locale, Record<string, string>> = {
  "pt-BR": {
    title: "Agendamento Barbearia",
    book: "Agendar",
    admin: "Administração"
  },
  en: {
    title: "Barber Booking",
    book: "Book",
    admin: "Admin"
  },
  "es-419": {
    title: "Reserva de Barbería",
    book: "Reservar",
    admin: "Administración"
  }
};

export function t(locale: Locale, key: string) {
  return messages[locale][key] ?? messages["pt-BR"][key] ?? key;
}
