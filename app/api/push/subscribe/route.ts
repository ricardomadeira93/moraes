import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, DEFAULT_SHOP_ID } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() })
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.insert(pushSubscriptions).values({
    shopId: DEFAULT_SHOP_ID,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
