import { db } from "@/lib/db/client";
import { barbers, timeBlocks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { createTimeBlock } from "@/lib/actions/admin";
import { requireAdminAccessPage } from "@/lib/auth/access";

export default async function SchedulePage() {
  const { shopId } = await requireAdminAccessPage();
  const [b, blocks] = await Promise.all([
    db.select().from(barbers).where(eq(barbers.shopId, shopId)),
    db.select().from(timeBlocks).where(eq(timeBlocks.shopId, shopId)).orderBy(desc(timeBlocks.startsAt))
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bloqueios de agenda</h1>
      <form action={createTimeBlock} className="grid grid-cols-2 gap-2 rounded bg-white p-4 shadow">
        <select name="barberId" className="rounded border p-2" required>{b.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input name="reason" className="rounded border p-2" placeholder="Motivo" required />
        <input name="startsAt" type="datetime-local" className="rounded border p-2" required />
        <input name="endsAt" type="datetime-local" className="rounded border p-2" required />
        <button className="col-span-2 rounded bg-primary p-2 text-white">Bloquear</button>
      </form>
      <ul className="rounded bg-white p-4 shadow">{blocks.map((tb) => <li key={tb.id}>{tb.reason} - {tb.startsAt.toISOString()}</li>)}</ul>
    </div>
  );
}
