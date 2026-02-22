import { and, eq } from "drizzle-orm";
import { BookingForm } from "@/components/booking-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db/client";
import { barbers, services } from "@/lib/db/schema";

export default async function BookingPage() {
  try {
    const shop = await db.query.shops.findFirst();
    if (!shop) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Agendar horário</CardTitle>
              <CardDescription>Loja não configurada.</CardDescription>
            </CardHeader>
            <CardContent>
              Cadastre a loja e execute as migrações para habilitar o agendamento.
            </CardContent>
          </Card>
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
  } catch (error) {
    const message = (error as Error).message;
    const missingSchema = message.includes('relation "shops" does not exist');

    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Banco de dados não inicializado</CardTitle>
            <CardDescription>
              {missingSchema
                ? "As tabelas ainda não foram criadas."
                : "Não foi possível carregar dados de agendamento."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>Execute as migrações antes de testar:</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-slate-100">pnpm db:migrate</pre>
          </CardContent>
        </Card>
      </main>
    );
  }
}
