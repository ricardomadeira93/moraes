import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { requireAdminAccessApi } from "@/lib/auth/access";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() })
});

export async function POST(req: NextRequest) {
  const authz = await requireAdminAccessApi();
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.insert(pushSubscriptions).values({
    shopId: authz.access.shopId,
    userId: authz.access.userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth
  }).onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
