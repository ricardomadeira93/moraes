import { db, DEFAULT_SHOP_ID } from "@/lib/db/client";
import { barbers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { saveBarber } from "@/lib/actions/admin";

export default async function BarbersPage() {
  const data = await db.select().from(barbers).where(eq(barbers.shopId, DEFAULT_SHOP_ID));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Barbeiros</h1>
      <form action={saveBarber} className="flex gap-2">
        <input name="name" className="rounded border p-2" placeholder="Nome" required />
        <button className="rounded bg-primary px-3 text-white">Adicionar</button>
      </form>
      <ul className="rounded bg-white p-4 shadow">
        {data.map((b) => <li key={b.id}>{b.name}</li>)}
      </ul>
    </div>
  );
}
