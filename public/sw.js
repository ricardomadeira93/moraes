self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.open("barber-cache-v1").then(async (cache) => {
      const res = await fetch(event.request).catch(() => null);
      if (res && event.request.method === "GET") cache.put(event.request, res.clone());
      return res || cache.match(event.request);
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || { title: "Notificação", body: "Atualização" };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body }));
});
