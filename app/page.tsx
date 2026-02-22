import Link from "next/link";
import { t } from "@/lib/i18n/messages";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-4xl font-bold">{t("pt-BR", "title")}</h1>
      <div className="mt-6 flex gap-4">
        <Link className="rounded bg-primary px-4 py-2 text-white" href="/book">Agendar</Link>
        <Link className="rounded bg-secondary px-4 py-2 text-white" href="/admin">Admin</Link>
      </div>
    </main>
  );
}
