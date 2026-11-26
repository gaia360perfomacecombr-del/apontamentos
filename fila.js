// Fila de envios guardada no próprio celular (IndexedDB).
// Cada envio fica aqui até o Make confirmar que recebeu.
(function () {
  const DB = "apontamentos", STORE = "fila";

  function abrir() {
    return new Promise((ok, erro) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => ok(req.result);
      req.onerror = () => erro(req.error);
    });
  }
  async function tx(modo, fn) {
    const db = await abrir();
    return new Promise((ok, erro) => {
      const t = db.transaction(STORE, modo);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => ok(r && r.result);
      t.onerror = () => erro(t.error);
    });
  }

  const Fila = {
    guardar: (envio) => tx("readwrite", (s) => s.put(envio)),
    remover: (id) => tx("readwrite", (s) => s.delete(id)),
    todos: () => tx("readonly", (s) => s.getAll()),
    async contar() { return (await Fila.todos()).length; },

    // Tenta mandar tudo o que está na fila. Retorna quantos subiram.
    async sincronizar() {
      if (Fila._rodando) return 0;
      Fila._rodando = true;
      let enviados = 0;
      try {
        // manda na ordem em que foram feitos (início antes da conclusão)
        const itens = (await Fila.todos()).sort((a, b) => String(a.criado_em || a.hora_celular || "").localeCompare(String(b.criado_em || b.hora_celular || "")));
        for (const envio of itens) {
          try {
            const resp = await fetch(window.CONFIG.ENVIO_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.assign({}, envio, { tentativa_em: new Date().toISOString() })),
              cache: "no-store"
            });
            if (resp.ok) { await Fila.remover(envio.id); enviados++; }
          } catch (e) {
            // sem sinal ou bloqueio: para e tenta de novo depois
            break;
          }
        }
      } finally {
        Fila._rodando = false;
        document.dispatchEvent(new CustomEvent("fila-mudou"));
      }
      return enviados;
    }
  };

  window.Fila = Fila;
  window.addEventListener("online", () => Fila.sincronizar());
  setInterval(() => { if (navigator.onLine) Fila.sincronizar(); }, 60000);
})();
