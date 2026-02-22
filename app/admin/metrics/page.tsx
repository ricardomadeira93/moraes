import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireAdminAccessPage } from "@/lib/auth/access";

export default async function MetricsPage() {
  const { shopId } = await requireAdminAccessPage();
  const result = await db.execute(sql`
    select
      count(*) filter (where status = 'no_show')::int as no_shows,
      count(*) filter (where source = 'walk_in')::int as walk_ins,
      count(*) filter (where source = 'online')::int as online_bookings,
      count(*) filter (where status = 'canceled')::int as cancellations
    from appointments where shop_id = ${shopId}
  `);
  const r = (result as any).rows?.[0] ?? { no_shows: 0, walk_ins: 0, online_bookings: 0, cancellations: 0 };
  return (
    <div className="rounded bg-white p-4 shadow">
      <h1 className="mb-3 text-2xl font-semibold">Métricas</h1>
      <ul className="space-y-1 text-sm">
        <li>No-shows: {r.no_shows}</li>
        <li>Walk-ins: {r.walk_ins}</li>
        <li>Online: {r.online_bookings}</li>
        <li>Cancelamentos: {r.cancellations}</li>
      </ul>
    </div>
  );
}
