import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/messages";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Card className="rounded-3xl">
        <CardHeader>
          <p className="mb-2 inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">Barber Scheduler</p>
          <CardTitle className="text-4xl md:text-5xl">{t("pt-BR", "title")}</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Plataforma moderna para agendamento: fluxo rápido para clientes e gestão completa para administradores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/book"><Button>Agendar horário</Button></Link>
          <Link href="/admin"><Button variant="outline">Entrar no painel admin</Button></Link>
        </CardContent>
      </Card>
    </main>
  );
}
