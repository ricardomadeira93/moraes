import { db } from "@/lib/db/client";
import { appointments } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { updateAppointmentStatus } from "@/lib/actions/admin";
import { requireAdminAccessPage } from "@/lib/auth/access";

const statuses = ["scheduled", "walk_in", "canceled", "no_show", "completed"];

export default async function AppointmentsPage() {
  const { shopId } = await requireAdminAccessPage();
  const data = await db.select().from(appointments).where(eq(appointments.shopId, shopId)).orderBy(desc(appointments.startsAt));
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Agendamentos</h1>
      {data.map((a) => (
        <form key={a.id} action={updateAppointmentStatus} className="flex items-center gap-2 rounded bg-white p-3 shadow">
          <input type="hidden" name="id" value={a.id} />
          <span className="min-w-72 text-sm">{a.startsAt.toISOString()} ({a.status})</span>
          <select name="status" defaultValue={a.status} className="rounded border p-1">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="rounded bg-secondary px-2 py-1 text-white">Salvar</button>
        </form>
      ))}
    </div>
  );
}
