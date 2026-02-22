import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const hash = (v: string) => createHash("sha256").update(v).digest("hex");

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await db.query.users.findFirst({ where: eq(users.email, String(credentials.email)) });
        if (!user || user.passwordHash !== hash(String(credentials.password))) return null;
        return { id: user.id, email: user.email, role: user.role, shopId: user.shopId };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.shopId = (user as any).shopId;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.sub;
      (session.user as any).role = token.role;
      (session.user as any).shopId = token.shopId;
      return session;
    }
  },
  pages: { signIn: "/admin/login" }
};
