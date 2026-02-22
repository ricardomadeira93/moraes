import webpush from "web-push";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushNotificationEvents, pushSubscriptions } from "@/lib/db/schema";

type NotifyPayload = {
  eventKey: string;
  title: string;
  body: string;
  [key: string]: unknown;
};

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

export async function notifyShop(shopId: string, payload: NotifyPayload) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.shopId, shopId));

  await Promise.all(
    subs.map(async (s) => {
      const existing = await db.query.pushNotificationEvents.findFirst({
        where: and(
          eq(pushNotificationEvents.shopId, shopId),
          eq(pushNotificationEvents.subscriptionId, s.id),
          eq(pushNotificationEvents.eventKey, payload.eventKey)
        )
      });

      if (existing) return;

      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );

        await db.insert(pushNotificationEvents).values({
          shopId,
          subscriptionId: s.id,
          eventKey: payload.eventKey
        }).onConflictDoNothing();
      } catch (error) {
        console.error("push_delivery_failed", {
          shopId,
          endpoint: s.endpoint,
          message: (error as Error).message
        });
      }
    })
  );
}
