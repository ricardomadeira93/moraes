"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Option = { id: string; name: string };

type ErrorPayload = {
  error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
};

function getErrorMessage(payload: ErrorPayload): string {
  if (typeof payload.error === "string") return payload.error;
  if (!payload.error) return "Erro ao agendar";

  const firstFormError = payload.error.formErrors?.[0];
  if (firstFormError) return firstFormError;

  const fieldError = Object.values(payload.error.fieldErrors ?? {}).find((arr) => arr?.length)?.[0];
  return fieldError ?? "Erro ao agendar";
}


export function BookingForm({ barbers, services }: { barbers: Option[]; services: Option[] }) {
  const [response, setResponse] = useState<string>("");

  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data: ErrorPayload = await res.json();
    setResponse(res.ok ? "Agendamento realizado com sucesso!" : getErrorMessage(data));
  }

  return (
    <Card>
      <CardContent>
        <form action={submit} className="space-y-4">
          <div>
            <Label htmlFor="barberId">Barbeiro</Label>
            <Select id="barberId" name="barberId" required defaultValue="">
              <option value="" disabled>Selecione um barbeiro</option>
              {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
            </Select>
          </div>

          <div>
            <Label htmlFor="serviceId">Serviço</Label>
            <Select id="serviceId" name="serviceId" required defaultValue="">
              <option value="" disabled>Selecione um serviço</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </Select>
          </div>

          <div>
            <Label htmlFor="startsAt">Data e hora</Label>
            <Input id="startsAt" name="startsAt" type="datetime-local" required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" placeholder="Seu nome" required />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" placeholder="11999999999" required />
            </div>
          </div>

          <input type="hidden" name="source" value="online" />
          <Button className="w-full" type="submit">Confirmar agendamento</Button>
          {response ? <p className="text-sm text-slate-700">{response}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
