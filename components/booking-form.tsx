"use client";

import { useState } from "react";

type Option = { id: string; name: string };

export function BookingForm({ barbers, services }: { barbers: Option[]; services: Option[] }) {
  const [response, setResponse] = useState<string>("");

  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setResponse(res.ok ? "Agendamento realizado com sucesso!" : data.error ?? "Erro ao agendar");
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Barbeiro</label>
        <select className="w-full rounded-xl border border-slate-300 p-3" name="barberId" required defaultValue="">
          <option value="" disabled>Selecione um barbeiro</option>
          {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Serviço</label>
        <select className="w-full rounded-xl border border-slate-300 p-3" name="serviceId" required defaultValue="">
          <option value="" disabled>Selecione um serviço</option>
          {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Data e hora</label>
        <input className="w-full rounded-xl border border-slate-300 p-3" name="startsAt" type="datetime-local" required />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
          <input className="w-full rounded-xl border border-slate-300 p-3" name="name" placeholder="Seu nome" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
          <input className="w-full rounded-xl border border-slate-300 p-3" name="phone" placeholder="11999999999" required />
        </div>
      </div>

      <input type="hidden" name="source" value="online" />
      <button className="w-full rounded-xl bg-primary p-3 font-medium text-white transition hover:opacity-90" type="submit">Confirmar agendamento</button>
      {response ? <p className="text-sm text-slate-700">{response}</p> : null}
    </form>
  );
}
