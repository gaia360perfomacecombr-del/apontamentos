// Guarda o formulário no celular para abrir sem sinal.
const VERSAO = "apontamentos-v12";
const ARQUIVOS = ["./", "index.html", "aprovar.html", "estilo.css", "config.js", "fila.js", "app.js", "aprovar.js", "manifest.json", "icone.svg", "icone-192.png", "icone-512.png", "nina.webp"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // envios para o Make não passam por aqui
  // Rede primeiro (pega atualizações); sem sinal, usa a cópia guardada.
  // ignoreSearch: qualquer link de tarefa (?tarefa=...) abre a mesma página guardada.
  // Sinal fraco: se a rede demorar mais de 4 s, abre a cópia guardada.
  const comLimite = Promise.race([
    fetch(req),
    new Promise((_, falha) => setTimeout(() => falha(new Error("lento")), 4000))
  ]);
  e.respondWith(
    comLimite
      .then((resp) => {
        if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
