import Link from "next/link";
import { t } from "@/lib/i18n/messages";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Barber Scheduler</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">{t("pt-BR", "title")}</h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Plataforma moderna para agendamento: fluxo rápido para clientes e gestão completa para administradores.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-xl bg-primary px-5 py-3 font-medium text-white shadow-sm transition hover:opacity-90" href="/book">Agendar horário</Link>
          <Link className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 transition hover:bg-slate-50" href="/admin">Entrar no painel admin</Link>
        </div>
      </section>
    </main>
  );
}
