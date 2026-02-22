import { and, eq } from "drizzle-orm";
import { BookingForm } from "@/components/booking-form";
import { db } from "@/lib/db/client";
import { barbers, services } from "@/lib/db/schema";

export default async function BookingPage() {
  const shop = await db.query.shops.findFirst();
  if (!shop) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Agendar horário</h1>
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Loja não configurada. Cadastre uma loja primeiro.
        </p>
      </main>
    );
  }

  const [barberOptions, serviceOptions] = await Promise.all([
    db
      .select({ id: barbers.id, name: barbers.name })
      .from(barbers)
      .where(and(eq(barbers.shopId, shop.id), eq(barbers.active, true))),
    db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(and(eq(services.shopId, shop.id), eq(services.active, true)))
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Agendar horário</h1>
        <p className="mt-2 text-slate-600">Escolha barbeiro, serviço e horário em poucos segundos.</p>
      </div>
      <BookingForm barbers={barberOptions} services={serviceOptions} />
    </main>
  );
}
