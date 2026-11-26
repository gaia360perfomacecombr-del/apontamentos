# Apontamentos offline – Golden Incorporadora

Formulário que o funcionário abre pelo link do WhatsApp, preenche **mesmo sem sinal** e que sobe sozinho para o Make → Notion quando o celular reconectar. Depois, o supervisor dá o **de acordo** num painel próprio; só então a tarefa fica **Concluída**.

## Fluxo

1. Escritório cria a tarefa no Notion → coluna **Link offline** gera o link.
2. Funcionário recebe o link (com sinal), abre uma vez → o celular guarda o formulário.
3. Na obra, sem sinal, em duas etapas:
   - **Início** (ao abrir o link): hora de entrada (já vem com a hora de agora) e horímetro/KM inicial → **Salvar início**. Fica guardado no celular; pode fechar. Quando houver sinal, o início também sobe para o Notion: a tarefa vai para **Em andamento** e as colunas **Iniciada em** e **Início em campo** mostram quem começou, a que horas e com qual horímetro/KM.
   - **Conclusão** (abrindo o mesmo link ao terminar): hora de saída, horímetro/KM final, quantidade/materiais, **foto** e, se a tarefa tiver **Exige vídeo** marcado no Notion, **vídeo de até 20 s** gravado no próprio formulário → **Concluir e enviar**.
   Horários digitados à mão (diferentes da hora sugerida) ficam anotados nas Observações para o supervisor ver.
4. Volta o sinal → envio sobe para o Make (cenário **C**) → apontamento no Notion com **Aprovação = Aguardando de acordo**; tarefa vai para **Aguardando de acordo** (ou **Revisar horário / Revisar foto** se alguma trava pegou).
5. Supervisor abre o painel (`aprovar.html?k=CHAVE`) → vê foto, horários, alertas → **De acordo** ou **Recusar** (com motivo) → cenário **D** grava no Notion.
6. Com o de acordo de todos os formulários esperados → tarefa **Concluída**. Recusa → **Recusada pelo supervisor**.

## Travas

- Saída antes da entrada, saída depois da hora atual, envio antes do dia da tarefa (no próprio celular e de novo no Make).
- Horímetro/KM final menor que o inicial.
- Relógio do celular adiantado (hora do envio no futuro → "Hora do celular suspeita").
- Foto: câmera abre direto; carimbo de data/hora gravado na imagem; impressão digital (hash) do arquivo original → "Foto repetida"; data da foto diferente do dia da tarefa → "Foto de outro dia"; IA compara a foto com a tarefa (plano pago do Make).
- O mesmo envio nunca entra duas vezes (código único gerado no celular).

## Publicar no GitHub Pages (uma vez)

1. Crie uma conta em github.com (grátis) e um repositório **público** chamado `apontamentos`.
2. Envie todos os arquivos desta pasta para o repositório (botão *Add file → Upload files*).
3. *Settings → Pages → Branch: main / (root) → Save*. Em 1–2 minutos o site fica em `https://SEU-USUARIO.github.io/apontamentos/`.
4. No Notion, na coluna **Link offline** da base Tarefas, troque `SEU-USUARIO` pelo seu usuário do GitHub (ou peça para o Claude trocar).

## Links

- Funcionário: coluna **Link offline** de cada tarefa.
- Supervisor: `https://SEU-USUARIO.github.io/apontamentos/aprovar.html?k=CHAVE` — a CHAVE fica na coluna **Chave do supervisor** (base Funcionários). Para tirar o acesso de alguém, apague a chave ou desmarque **Ativo**.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `index.html`, `app.js` | Formulário do funcionário (Máquina, Veículo, Serviço) |
| `fila.js` | Guarda os envios no celular e manda quando houver sinal |
| `sw.js`, `manifest.json` | Faz o formulário abrir sem internet |
| `aprovar.html`, `aprovar.js` | Painel do supervisor |
| `config.js` | Endereços dos webhooks do Make e ajustes da foto |
| `estilo.css`, `icone*` | Aparência |

Ao mudar qualquer arquivo, troque `VERSAO` em `sw.js` (ex.: `apontamentos-v4`) para os celulares pegarem a atualização.
