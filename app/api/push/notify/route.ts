import { NextResponse } from "next/server";
import { notifyShop } from "@/lib/push/webpush";
import { DEFAULT_SHOP_ID } from "@/lib/db/client";

export async function POST() {
  await notifyShop(DEFAULT_SHOP_ID, { title: "Teste", body: "Notificação manual" });
  return NextResponse.json({ ok: true });
}
