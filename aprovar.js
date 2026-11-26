(function () {
  const $ = (id) => document.getElementById(id);
  const C = window.CONFIG;
  const chave = new URLSearchParams(location.search).get("k") || "";
  $("marca").textContent = C.EMPRESA;

  function aviso(msg, tipo) {
    $("aviso").textContent = msg || "";
    $("aviso").className = "aviso " + (tipo || "atencao") + (msg ? "" : " oculto");
  }
  function sinal() {
    $("sinal").textContent = navigator.onLine ? "Com sinal" : "Sem sinal";
    $("sinal").classList.toggle("off", !navigator.onLine);
  }
  window.addEventListener("online", () => { sinal(); carregar(); });
  window.addEventListener("offline", sinal);
  sinal();

  async function chamar(dados) {
    const r = await fetch(C.PAINEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ k: chave }, dados)),
      cache: "no-store"
    });
    const txt = await r.text();
    let json = null;
    try { json = JSON.parse(txt); } catch (e) {}
    if (!r.ok || !json) throw new Error((json && json.erro) || "Resposta inesperada do servidor.");
    if (json.ok === false) throw new Error(json.erro || "Não autorizado.");
    return json;
  }

  // ---------- ler propriedades de uma página do Notion ----------
  const prop = (p, nome) => (p.properties || {})[nome] || {};
  const texto = (v) => ((v.title || v.rich_text || []).map((t) => t.plain_text).join(""));
  const sel = (v) => (v.select && v.select.name) || "";
  const numero = (v) => (v.type === "formula" ? (v.formula && v.formula.number) : v.number);
  const hora = (v) => { const s = v.date && v.date.start; return s && s.length > 10 ? s.slice(11, 16) : ""; };
  const dataHora = (v) => {
    const s = v.date && v.date.start;
    if (!s) return "";
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleString("pt-BR", { timeZone: "America/Cuiaba", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };
  const fotoUrl = (p) => {
    const f = (prop(p, "Foto").files || [])[0];
    if (f) return (f.file && f.file.url) || (f.external && f.external.url) || "";
    return prop(p, "Link da foto").url || "";
  };

  const videoUrl = (p) => {
    const f = (prop(p, "Vídeo").files || [])[0];
    return f ? ((f.file && f.file.url) || (f.external && f.external.url) || "") : "";
  };

  function linha(rotulo, valor) {
    if (valor === "" || valor === null || valor === undefined) return "";
    const d = document.createElement("div");
    d.className = "linha";
    const a = document.createElement("span"); a.textContent = rotulo;
    const b = document.createElement("span"); b.textContent = valor;
    d.append(a, b);
    return d.outerHTML;
  }
  function pill(txt, cor) {
    const s = document.createElement("span");
    s.className = "pill " + (cor || "");
    s.textContent = txt;
    return s.outerHTML;
  }

  function cartao(p) {
    const vh = sel(prop(p, "Verificação de horário")) || "OK";
    const vf = sel(prop(p, "Verificação da foto")) || "Foto não verificada";
    const horas = numero(prop(p, "Horas"));
    const el = document.createElement("section");
    el.className = "cartao";
    el.dataset.id = p.id;
    const url = fotoUrl(p);
    el.innerHTML =
      (url ? '<img class="item-foto" alt="Foto do serviço" loading="lazy">' : '<div class="aviso atencao">Sem foto anexada.</div>') +
      (videoUrl(p) ? '<video class="item-foto" controls playsinline preload="metadata"></video>' : "") +
      '<h2 class="titulo"></h2>' +
      '<div style="margin:0 0 8px">' +
        pill(vh === "OK" ? "Horário OK" : vh, vh === "OK" ? "" : "vermelho") +
        pill(vf === "OK" ? "Foto OK" : vf, vf === "OK" ? "" : (vf === "Foto não verificada" ? "laranja" : "vermelho")) +
      "</div>" +
      linha("Entrada", hora(prop(p, "Entrada"))) +
      linha("Saída", hora(prop(p, "Saída"))) +
      linha("Horas", horas != null ? String(Math.round(horas * 100) / 100).replace(".", ",") + " h" : "") +
      linha("Horímetro", prop(p, "Horímetro final").number != null ? prop(p, "Horímetro inicial").number + " → " + prop(p, "Horímetro final").number : "") +
      linha("KM", prop(p, "KM final").number != null ? prop(p, "KM inicial").number + " → " + prop(p, "KM final").number : "") +
      linha("Quantidade", prop(p, "Quantidade realizada").number != null ? prop(p, "Quantidade realizada").number + " " + texto(prop(p, "Unidade")) : "") +
      linha("Início salvo no celular", dataHora(prop(p, "Início registrado em"))) +
      linha("Concluído no celular", dataHora(prop(p, "Hora no celular"))) +
      linha("Chegou no sistema", dataHora(prop(p, "Enviado em"))) +
      '<p class="dica obs"></p><p class="dica ia"></p>' +
      '<div class="campo oculto motivo"><label>Por que está recusando?</label><textarea placeholder="Ex.: foto não mostra o serviço, horário errado…"></textarea></div>' +
      '<div class="acoes"><button class="botao perigo recusar" type="button">✗ Recusar</button><button class="botao aprovar" type="button">✓ De acordo</button></div>';
    el.querySelector(".titulo").textContent = texto(prop(p, "Registro"));
    if (url) el.querySelector("img.item-foto").src = url;
    if (videoUrl(p)) el.querySelector("video.item-foto").src = videoUrl(p);
    const obs = texto(prop(p, "Observações"));
    if (obs) el.querySelector(".obs").textContent = "Observação do funcionário: " + obs;
    const ia = texto(prop(p, "Análise da foto (IA)"));
    if (ia) el.querySelector(".ia").textContent = "Análise da IA: " + ia.replace(/\n/g, " – ");

    const bA = el.querySelector(".aprovar"), bR = el.querySelector(".recusar");
    const caixa = el.querySelector(".motivo"), motivo = el.querySelector("textarea");

    bA.addEventListener("click", () => decidir(el, "aprovar", ""));
    bR.addEventListener("click", () => {
      if (caixa.classList.contains("oculto")) { caixa.classList.remove("oculto"); bR.textContent = "Confirmar recusa"; motivo.focus(); return; }
      if (!motivo.value.trim()) { motivo.focus(); return; }
      decidir(el, "recusar", motivo.value.trim());
    });
    return el;
  }

  async function decidir(el, acao, motivo) {
    const botoes = el.querySelectorAll("button");
    botoes.forEach((b) => (b.disabled = true));
    try {
      await chamar({ acao: acao, id: el.dataset.id, motivo: motivo });
      el.innerHTML = '<div class="aviso ' + (acao === "aprovar" ? "ok" : "erro") + '"></div>';
      el.firstChild.textContent = (acao === "aprovar" ? "De acordo registrado: " : "Recusado: ") + (el.dataset.titulo || "apontamento");
      setTimeout(() => el.remove(), 2500);
    } catch (e) {
      botoes.forEach((b) => (b.disabled = false));
      aviso(navigator.onLine ? "Não consegui gravar: " + e.message : "Sem sinal. Tente de novo quando o sinal voltar.", "erro");
    }
  }

  async function carregar() {
    if (!chave) { $("quem").textContent = ""; aviso("Link sem a chave do supervisor. Peça o link correto ao escritório.", "erro"); return; }
    if (!navigator.onLine) { aviso("Sem sinal. O painel precisa de internet para mostrar os serviços.", "atencao"); return; }
    $("atualizar").disabled = true;
    aviso("");
    try {
      const r = await chamar({ acao: "listar" });
      $("quem").textContent = "Supervisor: " + (r.supervisor || "");
      const itens = Array.isArray(r.itens) ? r.itens : [];
      $("lista").innerHTML = "";
      if (!itens.length) { aviso("Nada esperando o de acordo agora. 👍", "ok"); }
      itens.forEach((p) => {
        const c = cartao(p);
        c.dataset.titulo = texto(prop(p, "Registro"));
        $("lista").appendChild(c);
      });
    } catch (e) {
      $("quem").textContent = "";
      aviso("Não consegui abrir o painel: " + e.message, "erro");
    } finally {
      $("atualizar").disabled = false;
    }
  }
  $("atualizar").addEventListener("click", carregar);
  carregar();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
