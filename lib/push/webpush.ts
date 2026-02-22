import webpush from "web-push";
import { db } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

export async function notifyShop(shopId: string, payload: object) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.shopId, shopId));
  await Promise.all(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      ).catch(() => null)
    )
  );
}
