import Link from "next/link";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between bg-secondary p-4 text-white">
        <nav className="flex gap-4 text-sm">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/appointments">Appointments</Link>
          <Link href="/admin/barbers">Barbers</Link>
          <Link href="/admin/services">Services</Link>
          <Link href="/admin/schedule">Schedule</Link>
          <Link href="/admin/metrics">Metrics</Link>
        </nav>
        <form action={async () => {"use server"; await signOut({ redirectTo: "/" });}}>
          <button type="submit">Sair</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
