(function () {
  const $ = (id) => document.getElementById(id);
  const P = new URLSearchParams(location.search);
  const C = window.CONFIG;

  // ---------- dados que vêm no link ----------
  const tarefa = (P.get("tarefa") || "").trim();
  const tipo = (P.get("tipo") || "servico").toLowerCase();       // maquina | veiculo | servico
  const nomeTarefa = P.get("nome") || "";
  const esperados = P.get("esperados") || "1";
  const maquina = P.get("maquina") || "", maquinaId = P.get("maquina_id") || "";
  const veiculo = P.get("veiculo") || "", veiculoId = P.get("veiculo_id") || "";
  const unidade = P.get("unidade") || "";
  const dataTarefa = (P.get("data") || "").slice(0, 10);          // AAAA-MM-DD
  const exigeVideo = P.get("video") === "1";
  const dataFim = (P.get("fim") || "").slice(0, 10);              // data prevista de término (tarefa de vários dias)
  // nome do funcionário para a Nina cumprimentar: "Seu Zé", "Dona Maria" ou só o primeiro nome
  const nomeFunc = (function () {
    const bruto = (P.get("func") || "").replace(/\([^)]*\)/g, "").replace(/,.*$/, "").trim();
    if (!bruto) return "";
    const partes = bruto.split(/\s+/);
    return /^(seu|dona|sr\.?|sra\.?)$/i.test(partes[0]) && partes[1] ? partes[0] + " " + partes[1] : partes[0];
  })();
  const ola = "Olá" + (nomeFunc ? ", " + nomeFunc : "") + "!";
  const prevista = P.get("prevista") ? Number(String(P.get("prevista")).replace(",", ".")) : null;
  const demo = /^demo/i.test((P.get("tarefa") || "").trim());   // modelo: nada é enviado

  const materiais = [];
  for (let i = 1; i <= 3; i++) {
    if (P.get("produto" + i)) materiais.push({ nome: P.get("produto" + i), id: P.get("produto" + i + "_id") || "" });
  }
  if (!materiais.length) {
    const nomes = P.getAll("produto"), ids = P.getAll("produto_id");
    nomes.slice(0, 3).forEach((n, i) => materiais.push({ nome: n, id: ids[i] || "" }));
  }

  $("marca").textContent = C.EMPRESA;
  $("empresa").textContent = C.SISTEMA;
  if (!tarefa) { $("semTarefa").classList.remove("oculto"); return; }

  // ---------- utilidades ----------
  const num = (id) => ($(id) && $(id).value !== "" ? Number($(id).value) : null);
  const minutos = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const agoraHHMM = () => new Date().toTimeString().slice(0, 5);
  const hojeISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const fmt = (n) => String(n).replace(".", ",");
  function mostrarErro(msg) {
    $("erro").textContent = msg || "";
    $("erro").classList.toggle("oculto", !msg);
    if (msg) $("erro").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function guardarLocal(chave, valor) { try { valor === null ? localStorage.removeItem(chave) : localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) {} }
  function lerLocal(chave) { try { return JSON.parse(localStorage.getItem(chave) || "null"); } catch (e) { return null; } }
  async function sha256(buf) {
    if (!(window.crypto && crypto.subtle)) return "";
    const h = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function blobParaBase64(blob) {
    return new Promise((ok, erro) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(",")[1]);
      r.onerror = () => erro(r.error);
      r.readAsDataURL(blob);
    });
  }

  // ---------- cabeçalho ----------
  const nomesTipo = { maquina: "Máquina", veiculo: "Veículo", servico: "Serviço e materiais" };
  $("titulo").textContent = nomeTarefa || "Apontamento de serviço";
  $("subtitulo").textContent =
    (tipo === "maquina" ? (maquina ? "Máquina: " + maquina : "Apontamento de máquina") :
     tipo === "veiculo" ? (veiculo ? "Veículo: " + veiculo : "Apontamento de veículo") : "Serviço e materiais") +
    (dataTarefa ? " · " + dataTarefa.split("-").reverse().join("/") + (dataFim && dataFim !== dataTarefa ? " a " + dataFim.split("-").reverse().join("/") : "") : "");
  document.title = (nomeTarefa || "Apontamento") + " – " + C.ASSISTENTE;

  // campos conforme o tipo
  if (tipo === "maquina") {
    ["campoHorIni", "campoHorFim"].forEach((c) => $(c).classList.remove("oculto"));
    if (maquina) $("rotHorIni").textContent = "Horímetro inicial – " + maquina;
  }
  if (tipo === "veiculo") {
    ["campoKmIni", "campoKmFim"].forEach((c) => $(c).classList.remove("oculto"));
    if (veiculo) $("rotKmIni").textContent = "KM inicial – " + veiculo;
  }
  if (tipo === "servico") {
    $("blocoServico").classList.remove("oculto");
    $("unidadeTxt").textContent = unidade ? "(em " + unidade + ")" : "";
    materiais.forEach((m, i) => {
      const d = document.createElement("div");
      d.className = "campo";
      d.innerHTML = '<label></label><input type="number" inputmode="decimal" step="0.01">';
      d.querySelector("label").textContent = "Quanto usou de " + m.nome;
      d.querySelector("label").htmlFor = "mat" + i;
      d.querySelector("input").id = "mat" + i;
      $("materiais").appendChild(d);
    });
  }
  $("maxSeg").textContent = $("maxSeg2").textContent = C.VIDEO_MAX_SEG;
  $("tela").classList.remove("oculto");
  if (demo) {
    const av = document.createElement("div");
    av.className = "aviso atencao";
    av.textContent = "Modelo de demonstração: pode preencher à vontade, nada será enviado.";
    $("tela").insertBefore(av, $("tela").firstChild);
  }
  $("rodape").classList.remove("oculto");

  // ---------- sinal e fila ----------
  function atualizarSinal() {
    const on = navigator.onLine;
    $("sinal").textContent = on ? "Com sinal" : "Sem sinal";
    $("sinal").classList.toggle("off", !on);
    $("avisoOffline").classList.toggle("oculto", on);
  }
  window.addEventListener("online", atualizarSinal);
  window.addEventListener("offline", atualizarSinal);
  atualizarSinal();
  async function mostrarFila() {
    const n = await Fila.contar();
    $("filaTxt").textContent = n ? (n === 1 ? "1 envio guardado no celular, esperando sinal." : n + " envios guardados no celular, esperando sinal.") : "";
  }
  document.addEventListener("fila-mudou", mostrarFila);
  mostrarFila();
  if (navigator.onLine) Fila.sincronizar();

  // =====================================================================
  // ETAPA 1 – INÍCIO (fica salvo no celular até a conclusão)
  // =====================================================================
  const chaveInicio = "inicio:" + tarefa + ":" + tipo;
  const chaveRascunho = "rascunho:" + tarefa + ":" + tipo;
  const chaveHist = "historico:" + tarefa + ":" + tipo;
  let inicio = lerLocal(chaveInicio);
  // dias já encerrados neste celular: [{ dia, quantidade, minutos }]
  let historico = lerLocal(chaveHist) || [];
  const dataBR = (iso) => (iso || "").split("-").reverse().slice(0, 2).join("/");
  const diaNumero = () => (inicio && inicio.dia_numero) || historico.length + 1;
  const totalFeito = () => historico.reduce((t, h) => t + (Number(h.quantidade) || 0), 0);

  function mostrarProgresso() {
    const n = diaNumero();
    if (n <= 1 && !dataFim) { $("progresso").classList.add("oculto"); return; }
    $("progresso").classList.remove("oculto");
    $("progDia").textContent = "Dia " + n + (dataFim ? " · previsto até " + dataBR(dataFim) : "");
    const feito = totalFeito();
    const partes = [];
    if (historico.length) partes.push(historico.length === 1 ? "1 dia encerrado" : historico.length + " dias encerrados");
    if (tipo === "servico" && (feito || prevista)) partes.push("feito: " + fmt(Math.round(feito * 100) / 100) + (prevista ? " de " + fmt(prevista) : "") + (unidade ? " " + unidade : ""));
    $("progTxt").textContent = partes.join(" · ");
    const temBarra = tipo === "servico" && prevista > 0;
    $("progBarra").classList.toggle("oculto", !temBarra);
    if (temBarra) $("progCheio").style.width = Math.min(100, Math.round((feito / prevista) * 100)) + "%";
  }

  function validarInicio() {
    const e = $("entrada").value;
    if (!e) return "Preencha a hora de entrada.";
    const hoje = hojeISO();
    if (dataTarefa && dataTarefa > hoje) return "Esta tarefa é para o dia " + dataTarefa.split("-").reverse().join("/") + ". Só dá para começar no dia.";
    if ((!dataTarefa || dataTarefa === hoje) && minutos(e) > minutos(agoraHHMM()) + 2) return "A entrada não pode ser depois de agora (" + agoraHHMM() + ").";
    if (tipo === "maquina" && num("horIni") === null) return "Preencha o horímetro inicial.";
    if (tipo === "veiculo" && num("kmIni") === null) return "Preencha o KM inicial.";
    return "";
  }

  function salvarInicio() {
    const msg = validarInicio();
    mostrarErro(msg);
    if (msg) return;
    inicio = {
      entrada: $("entrada").value,
      horimetro_inicial: num("horIni"),
      km_inicial: num("kmIni"),
      registrado_em: new Date().toISOString(),
      dia: hojeISO(),
      dia_numero: historico.length + 1,
      entrada_editada: $("entrada").value !== $("entrada").dataset.sugerida
    };
    guardarLocal(chaveInicio, inicio);
    if (demo) { mostrarEtapa(); window.scrollTo(0, 0); return; }
    // avisa o escritório (sobe quando houver sinal): tarefa fica "Em andamento"
    Fila.guardar({
      id: novoId(),
      evento: "inicio",
      criado_em: inicio.registrado_em,
      tipo, tarefa, nome_tarefa: nomeTarefa, data_tarefa: dataTarefa, data_fim_prevista: dataFim,
      dia: inicio.dia,
      dia_numero: inicio.dia_numero,
      entrada: inicio.entrada,
      entrada_editada: inicio.entrada_editada,
      horimetro_inicial: inicio.horimetro_inicial,
      km_inicial: inicio.km_inicial,
      maquina, veiculo,
      hora_celular: inicio.registrado_em
    }).then(() => {
      document.dispatchEvent(new CustomEvent("fila-mudou"));
      if (navigator.onLine) Fila.sincronizar();
    }).catch(() => {});
    mostrarEtapa();
    window.scrollTo(0, 0);
  }

  function preencherResumo() {
    const linhas = [["Dia", (inicio.dia_numero || 1) + "º dia · " + dataBR(inicio.dia || hojeISO())], ["Entrada", inicio.entrada]];
    if (inicio.horimetro_inicial != null) linhas.push(["Horímetro inicial", fmt(inicio.horimetro_inicial)]);
    if (inicio.km_inicial != null) linhas.push(["KM inicial", fmt(inicio.km_inicial)]);
    linhas.push(["Salvo em", new Date(inicio.registrado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })]);
    $("resumoLinhas").innerHTML = "";
    linhas.forEach(([a, b]) => {
      const d = document.createElement("div"); d.className = "linha";
      const s1 = document.createElement("span"); s1.textContent = a;
      const s2 = document.createElement("span"); s2.textContent = b;
      d.append(s1, s2); $("resumoLinhas").appendChild(d);
    });
  }

  $("corrigirInicio").addEventListener("click", () => {
    $("entrada").value = inicio.entrada;
    if (inicio.horimetro_inicial != null) $("horIni").value = inicio.horimetro_inicial;
    if (inicio.km_inicial != null) $("kmIni").value = inicio.km_inicial;
    $("entrada").dataset.sugerida = inicio.entrada;
    inicio = null;
    guardarLocal(chaveInicio, null);
    mostrarEtapa(true);
  });

  // =====================================================================
  // ETAPA 2 – CONCLUSÃO + EVIDÊNCIA
  // =====================================================================
  const camposFim = ["saida", "horFim", "kmFim", "qtd", "obs"].concat(materiais.map((_, i) => "mat" + i));
  function restaurarRascunho() {
    const r = lerLocal(chaveRascunho) || {};
    camposFim.forEach((c) => { if (r[c] && $(c)) $(c).value = r[c]; });
  }
  $("formFim").addEventListener("input", () => {
    const r = {};
    camposFim.forEach((c) => { if ($(c)) r[c] = $(c).value; });
    guardarLocal(chaveRascunho, r);
  });

  // ----- foto -----
  let foto = null;
  function carregarImagem(file) {
    return new Promise((ok, erro) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { ok(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
      img.onerror = erro;
      img.src = url;
    });
  }
  async function reduzir(file) {
    const img = await carregarImagem(file);
    const escala = Math.min(1, C.FOTO_LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * escala), h = Math.round(img.naturalHeight * escala);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const carimbo = new Date().toLocaleString("pt-BR") + " · " + (nomeTarefa || "").slice(0, 40);
    const fs = Math.max(14, Math.round(w / 45));
    ctx.font = "bold " + fs + "px sans-serif";
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.fillRect(0, h - fs * 1.8, ctx.measureText(carimbo).width + fs, fs * 1.8);
    ctx.fillStyle = "#fff";
    ctx.fillText(carimbo, fs / 2, h - fs * 0.6);
    return cv.toDataURL("image/jpeg", C.FOTO_QUALIDADE);
  }
  $("foto").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    $("botaoFoto").textContent = "Preparando a foto…";
    try {
      const hash = await sha256(await file.arrayBuffer());
      const dataUrl = await reduzir(file);
      foto = { base64: dataUrl.split(",")[1], hash, tiradaEm: file.lastModified ? new Date(file.lastModified).toISOString() : "", tamanhoOriginal: file.size };
      $("previa").src = dataUrl;
      $("previa").classList.remove("oculto");
      $("botaoFoto").textContent = "📷 Tirar outra foto";
      mostrarErro("");
    } catch (e) {
      foto = null;
      $("botaoFoto").textContent = "📷 Tirar foto";
      mostrarErro("Não consegui ler a foto. Tente tirar de novo.");
    }
  });

  // ----- vídeo -----
  let video = null;      // { base64, hash, mime, segundos, tamanho, gravadoNoFormulario }
  let gravador = null, fluxo = null, pedacos = [], timer = null, inicioGrav = 0;
  const podeGravar = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  if (!podeGravar) {
    $("botaoVideo").classList.add("oculto");
    $("usarCamera").classList.remove("oculto");
    $("usarCamera").className = "botao sec";
    $("usarCamera").textContent = "🎥 Gravar vídeo";
  } else {
    $("usarCamera").classList.remove("oculto");
  }

  function tipoVideo() {
    const op = ["video/webm;codecs=vp8", "video/webm", "video/mp4"];
    for (const t of op) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
    return "";
  }

  async function aceitarVideo(blob, segundos, noFormulario) {
    const mb = blob.size / 1024 / 1024;
    if (mb > C.VIDEO_MAX_MB) {
      video = null;
      mostrarErro("O vídeo ficou grande demais (" + mb.toFixed(1) + " MB). Grave de novo, mais curto (até " + C.VIDEO_MAX_SEG + " segundos).");
      return;
    }
    const buf = await blob.arrayBuffer();
    video = {
      base64: await blobParaBase64(blob),
      hash: await sha256(buf),
      mime: blob.type || "video/mp4",
      segundos: segundos,
      tamanho: blob.size,
      gravadoNoFormulario: noFormulario
    };
    $("videoPrevia").src = URL.createObjectURL(blob);
    $("videoPrevia").classList.remove("oculto");
    $("botaoVideo").textContent = "🎥 Gravar de novo";
    mostrarErro("");
  }

  function pararGravacao() {
    if (gravador && gravador.state !== "inactive") gravador.stop();
  }

  $("botaoVideo").addEventListener("click", async () => {
    mostrarErro("");
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: false
      });
    } catch (e) {
      mostrarErro("Não consegui abrir a câmera. Permita o uso da câmera, ou toque em \"Usar a câmera do celular\".");
      return;
    }
    $("videoAoVivo").srcObject = fluxo;
    $("videoAoVivo").classList.remove("oculto");
    $("videoPrevia").classList.add("oculto");
    pedacos = [];
    const mime = tipoVideo();
    gravador = new MediaRecorder(fluxo, mime ? { mimeType: mime, videoBitsPerSecond: C.VIDEO_BITS } : { videoBitsPerSecond: C.VIDEO_BITS });
    gravador.ondataavailable = (e) => { if (e.data && e.data.size) pedacos.push(e.data); };
    gravador.onstop = async () => {
      clearInterval(timer);
      const seg = Math.round((Date.now() - inicioGrav) / 1000);
      fluxo.getTracks().forEach((t) => t.stop());
      $("videoAoVivo").srcObject = null;
      $("videoAoVivo").classList.add("oculto");
      $("gravandoTxt").classList.add("oculto");
      $("pararVideo").classList.add("oculto");
      $("botaoVideo").classList.remove("oculto");
      await aceitarVideo(new Blob(pedacos, { type: gravador.mimeType || mime || "video/webm" }), seg, true);
    };
    gravador.start(1000);
    inicioGrav = Date.now();
    $("contador").textContent = "0";
    $("gravandoTxt").classList.remove("oculto");
    $("pararVideo").classList.remove("oculto");
    $("botaoVideo").classList.add("oculto");
    timer = setInterval(() => {
      const s = Math.floor((Date.now() - inicioGrav) / 1000);
      $("contador").textContent = s;
      if (s >= C.VIDEO_MAX_SEG) pararGravacao();
    }, 250);
  });
  $("pararVideo").addEventListener("click", pararGravacao);

  // alternativa: câmera do próprio celular
  $("videoArquivo").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const segundos = await new Promise((ok) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => ok(Math.round(v.duration || 0));
      v.onerror = () => ok(0);
      v.src = URL.createObjectURL(file);
    });
    if (segundos > C.VIDEO_MAX_SEG + 5) {
      mostrarErro("O vídeo tem " + segundos + " segundos. Grave um de até " + C.VIDEO_MAX_SEG + " segundos.");
      return;
    }
    await aceitarVideo(file, segundos, false);
  });

  // ----- encerrar o dia x tarefa concluída -----
  function ehFinal() { return $("comoFinal").checked; }
  function aplicarEscolha() {
    const final = ehFinal();
    $("blocoVideo").classList.toggle("oculto", !(exigeVideo && final));
    $("fotoTitulo").textContent = final ? "Foto do serviço pronto" : "Foto do avanço de hoje";
    $("fotoDica").textContent = final ? "Tire a foto na hora, mostrando o serviço terminado." : "Tire a foto na hora, mostrando o que foi feito hoje.";
    if (inicio) $("principal").textContent = final ? "Concluir tarefa e enviar" : "Encerrar o dia e enviar";
  }
  ["comoDia", "comoFinal"].forEach((id) => $(id).addEventListener("change", aplicarEscolha));
  function escolhaPadrao() {
    // tarefa de um dia (ou último dia previsto) já vem como "concluída"
    const continua = dataFim && dataFim > hojeISO();
    $(continua ? "comoDia" : "comoFinal").checked = true;
  }

  function validarFim() {
    if (!$("comoDia").checked && !$("comoFinal").checked) return "Escolha: encerrar o dia ou tarefa concluída.";
    const s = $("saida").value;
    if (!s) return "Preencha a hora de saída.";
    if (minutos(s) <= minutos(inicio.entrada)) return "A saída precisa ser depois da entrada (" + inicio.entrada + ").";
    const hoje = hojeISO();
    if ((inicio.dia || hoje) === hoje && minutos(s) > minutos(agoraHHMM()) + 2) return "A saída não pode ser depois de agora (" + agoraHHMM() + ").";
    if (tipo === "maquina") {
      if (num("horFim") === null) return "Preencha o horímetro final.";
      if (num("horFim") <= inicio.horimetro_inicial) return "O horímetro final precisa ser maior que o inicial (" + fmt(inicio.horimetro_inicial) + ").";
    }
    if (tipo === "veiculo") {
      if (num("kmFim") === null) return "Preencha o KM final.";
      if (num("kmFim") <= inicio.km_inicial) return "O KM final precisa ser maior que o inicial (" + fmt(inicio.km_inicial) + ").";
    }
    if (!foto) return "Tire a foto do serviço pronto.";
    if (exigeVideo && ehFinal() && !video) return "Esta tarefa precisa de vídeo. Grave o vídeo do serviço.";
    return "";
  }

  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  async function concluir() {
    const msg = validarFim();
    mostrarErro(msg);
    if (msg) return;
    const final = ehFinal();
    $("principal").disabled = true;
    $("principal").textContent = "Guardando…";
    const minutosDia = minutos($("saida").value) - minutos(inicio.entrada);
    function encerrarLocal() {
      guardarLocal(chaveInicio, null);
      guardarLocal(chaveRascunho, null);
      if (final) { historico = []; guardarLocal(chaveHist, null); }
      else {
        historico.push({ dia: inicio.dia || hojeISO(), dia_numero: inicio.dia_numero || historico.length + 1, quantidade: num("qtd"), minutos: minutosDia });
        guardarLocal(chaveHist, historico);
      }
    }
    function telaPronta(msg) {
      $("tela").classList.add("oculto");
      $("rodape").classList.add("oculto");
      $("pronto").classList.remove("oculto");
      $("prontoTitulo").textContent = final ? "Obrigada! Tarefa concluída ✅" : "Dia " + (inicio ? inicio.dia_numero : historico.length) + " encerrado ✅";
      $("msgPronto").textContent = msg;
      $("prontoSub").textContent = final
        ? "O supervisor vai conferir e dar o \"de acordo\". Só depois disso a tarefa fica como concluída."
        : "Amanhã, ao começar, abra este mesmo link e toque em Salvar início. O supervisor confere cada dia.";
      window.scrollTo(0, 0);
    }
    if (demo) {
      const numDia = inicio.dia_numero || 1;
      encerrarLocal();
      inicio = { dia_numero: numDia };
      telaPronta("Este é um modelo de demonstração: nada foi enviado. Numa tarefa real, a " + C.ASSISTENTE + " envia o apontamento para o supervisor conferir.");
      inicio = null;
      return;
    }
    const agora = new Date();
    const envio = {
      id: novoId(),
      versao: 2,
      evento: "conclusao",
      final: final,
      tipo_envio: final ? "Conclusão da tarefa" : "Fim do dia",
      dia: inicio.dia || hojeISO(),
      dia_numero: inicio.dia_numero || historico.length + 1,
      data_fim_prevista: dataFim,
      quantidade_acumulada: Math.round((totalFeito() + (num("qtd") || 0)) * 100) / 100,
      quantidade_prevista: prevista,
      minutos_no_dia: minutosDia,
      criado_em: agora.toISOString(),
      tipo, tarefa, nome_tarefa: nomeTarefa, esperados, data_tarefa: dataTarefa,
      entrada: inicio.entrada,
      inicio_registrado_em: inicio.registrado_em,
      entrada_editada: !!inicio.entrada_editada,
      saida: $("saida").value,
      saida_editada: $("saida").value !== $("saida").dataset.sugerida,
      horimetro_inicial: inicio.horimetro_inicial,
      horimetro_final: num("horFim"),
      maquina, maquina_id: maquinaId,
      km_inicial: inicio.km_inicial,
      km_final: num("kmFim"),
      veiculo, veiculo_id: veiculoId,
      quantidade: num("qtd"),
      unidade,
      materiais: materiais.map((m, i) => ({ nome: m.nome, id: m.id, quantidade: num("mat" + i) })),
      observacoes: $("obs").value.trim(),
      hora_celular: agora.toISOString(),
      fuso_minutos: -agora.getTimezoneOffset(),
      foto_base64: foto.base64,
      foto_hash: foto.hash,
      foto_tirada_em: foto.tiradaEm,
      foto_tamanho_original: foto.tamanhoOriginal,
      exige_video: exigeVideo,
      video_base64: video && final ? video.base64 : "",
      video_hash: video ? video.hash : "",
      video_tipo: video ? video.mime : "",
      video_segundos: video ? video.segundos : 0,
      video_gravado_no_formulario: video ? video.gravadoNoFormulario : false,
      offline_no_envio: !navigator.onLine
    };
    try {
      await Fila.guardar(envio);
    } catch (e) {
      $("principal").disabled = false;
      aplicarEscolha();
      mostrarErro("O celular está sem espaço para guardar o envio. Libere espaço e tente de novo.");
      return;
    }
    encerrarLocal();
    document.dispatchEvent(new CustomEvent("fila-mudou"));
    const subiu = navigator.onLine ? await Fila.sincronizar() : 0;
    const restantes = await Fila.contar();
    telaPronta(subiu && !restantes
      ? "A " + C.ASSISTENTE + " já enviou seu apontamento."
      : "A " + C.ASSISTENTE + " guardou seu apontamento no celular. Ele sobe sozinho quando tiver sinal — se demorar, abra este link de novo com sinal.");
  }

  // =====================================================================
  // qual etapa mostrar
  // =====================================================================
  function mostrarEtapa(corrigindo) {
    const temInicio = !!inicio;
    $("formInicio").classList.toggle("oculto", temInicio);
    $("resumoInicio").classList.toggle("oculto", !temInicio);
    $("formFim").classList.toggle("oculto", !temInicio);
    $("etapa1").className = "etapa " + (temInicio ? "feita" : "ativa");
    $("etapa2").className = "etapa " + (temInicio ? "ativa" : "");
    $("principal").textContent = "Salvar início";
    const n = diaNumero();
    const esqueceu = temInicio && inicio.dia && inicio.dia < hojeISO();
    const variosDias = !!(dataFim && dataTarefa && dataFim !== dataTarefa);
    $("ninaFala").textContent = esqueceu
      ? ola + " O dia " + dataBR(inicio.dia) + " ficou aberto. Preencha a hora de saída daquele dia e envie. Depois, salve o início de hoje. Estou aqui para ajudar."
      : temInicio
      ? "Início salvo" + (nomeFunc ? ", " + nomeFunc : "") + "! Trabalhe com segurança. No fim do expediente, preencha a saída, tire a foto e " +
        (variosDias ? "escolha: encerrar o dia ou tarefa concluída." : "toque em Concluir tarefa e enviar.")
      : n > 1
      ? ola + " Hoje é o dia " + n + " desta tarefa. 🦺 Confira o equipamento de segurança, verifique a hora de entrada e toque em Salvar início. Conte comigo!"
      : ola + " Aqui é a " + C.ASSISTENTE + ", sua parceira nesta tarefa. 🦺 Antes de começar, confira o equipamento de segurança. Em seguida, verifique a hora de entrada e toque em Salvar início. Mesmo sem sinal, eu guardo tudo para você. Bom trabalho!";
    mostrarProgresso();
    mostrarErro("");
    if (temInicio) {
      preencherResumo();
      restaurarRascunho();
      if (!$("comoDia").checked && !$("comoFinal").checked) escolhaPadrao();
      aplicarEscolha();
      if (!$("saida").value) $("saida").value = agoraHHMM();
      $("saida").dataset.sugerida = $("saida").dataset.sugerida || agoraHHMM();
    } else if (!corrigindo) {
      $("entrada").value = agoraHHMM();
      $("entrada").dataset.sugerida = $("entrada").value;
    }
  }
  $("principal").addEventListener("click", () => (inicio ? concluir() : salvarInicio()));
  $("novo").addEventListener("click", () => location.reload());
  mostrarEtapa();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
