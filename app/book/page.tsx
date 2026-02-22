"use client";

import { useState } from "react";

export default function BookingPage() {
  const [response, setResponse] = useState<string>("");

  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setResponse(res.ok ? "Agendamento realizado!" : data.error ?? "Erro");
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-6 text-3xl font-semibold">Agendar horário</h1>
      <form action={submit} className="space-y-3 rounded bg-white p-4 shadow">
        <input className="w-full rounded border p-2" name="barberId" placeholder="Barber UUID" required />
        <input className="w-full rounded border p-2" name="serviceId" placeholder="Service UUID" required />
        <input className="w-full rounded border p-2" name="startsAt" type="datetime-local" required />
        <input className="w-full rounded border p-2" name="name" placeholder="Nome" required />
        <input className="w-full rounded border p-2" name="phone" placeholder="Telefone" required />
        <select className="w-full rounded border p-2" name="source">
          <option value="online">Online</option>
          <option value="walk_in">Walk-in</option>
        </select>
        <button className="w-full rounded bg-primary p-2 text-white" type="submit">Confirmar</button>
      </form>
      <p className="mt-3 text-sm">{response}</p>
    </main>
  );
}
