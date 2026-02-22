import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type AdminAccess = {
  userId: string;
  shopId: string;
  role: string;
};

export async function requireAdminAccessPage(): Promise<AdminAccess> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const role = String((session.user as any).role ?? "");
  const shopId = String((session.user as any).shopId ?? "");
  const userId = String((session.user as any).id ?? "");

  if (role !== "admin" || !shopId || !userId) redirect("/admin/login");
  return { userId, shopId, role };
}

export async function requireAdminAccessApi() {
  const session = await auth();
  if (!session?.user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const role = String((session.user as any).role ?? "");
  const shopId = String((session.user as any).shopId ?? "");
  const userId = String((session.user as any).id ?? "");

  if (role !== "admin" || !shopId || !userId) {
    return { ok: false as const, status: 403, error: "Forbidden" };
  }

  return { ok: true as const, access: { role, shopId, userId } };
}
