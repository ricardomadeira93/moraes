import { requireAdminAccessPage } from "@/lib/auth/access";
import { getAppointmentMetrics } from "@/lib/metrics/appointments";

export default async function MetricsPage() {
  const { shopId } = await requireAdminAccessPage();
  const m = await getAppointmentMetrics(shopId);

  return (
    <div className="rounded bg-white p-4 shadow">
      <h1 className="mb-3 text-2xl font-semibold">Métricas</h1>
      <ul className="space-y-1 text-sm">
        <li>Online: {m.online}</li>
        <li>Walk-ins: {m.walkIn}</li>
        <li>No-shows: {m.noShows}</li>
        <li>Cancelamentos: {m.cancellations}</li>
      </ul>
    </div>
  );
}
