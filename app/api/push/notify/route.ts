import { NextResponse } from "next/server";
import { notifyShop } from "@/lib/push/webpush";
import { requireAdminAccessApi } from "@/lib/auth/access";

export async function POST() {
  const authz = await requireAdminAccessApi();
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  await notifyShop(authz.access.shopId, { eventKey: `manual:${Date.now()}`, title: "Teste", body: "Notificação manual" });
  return NextResponse.json({ ok: true });
}
