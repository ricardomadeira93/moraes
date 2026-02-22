import { db } from "@/lib/db/client";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { saveService } from "@/lib/actions/admin";
import { requireAdminAccessPage } from "@/lib/auth/access";

export default async function ServicesPage() {
  const { shopId } = await requireAdminAccessPage();
  const data = await db.select().from(services).where(eq(services.shopId, shopId));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Serviços</h1>
      <form action={saveService} className="flex gap-2">
        <input name="name" className="rounded border p-2" placeholder="Nome" required />
        <input name="durationSlots" type="number" min={1} className="rounded border p-2" placeholder="Slots" required />
        <button className="rounded bg-primary px-3 text-white">Adicionar</button>
      </form>
      <ul className="rounded bg-white p-4 shadow">
        {data.map((s) => <li key={s.id}>{s.name} - {s.durationSlots * 30} min</li>)}
      </ul>
    </div>
  );
}
