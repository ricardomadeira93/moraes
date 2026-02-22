import Link from "next/link";
import { signOut } from "@/auth";
import { requireAdminAccessPage } from "@/lib/auth/access";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/appointments", label: "Agendamentos" },
  { href: "/admin/barbers", label: "Barbeiros" },
  { href: "/admin/services", label: "Serviços" },
  { href: "/admin/schedule", label: "Agenda" },
  { href: "/admin/metrics", label: "Métricas" }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccessPage();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={async () => {"use server"; await signOut({ redirectTo: "/" });}}>
            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
