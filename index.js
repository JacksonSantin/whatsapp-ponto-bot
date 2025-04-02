require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const schedule = require("node-schedule");
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const QRCode = require("qrcode");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
let qrCodeData = "";
let clienteConectado = false;
let groupId = "";
let horariosAgendados = [
  { hora: 7, minuto: 45 },
  { hora: 12, minuto: 0 },
  { hora: 13, minuto: 27 },
  { hora: 18, minuto: 0 },
];
let jobsAgendados = [];

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WhatsApp Ponto Bot</title>
      <style>
        * {
          box-sizing: border-box;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }

        .container {
          background-color: #ffffff;
          width: 90%;
          max-width: 500px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          padding: 30px;
          text-align: center;
        }

        h1 {
          color: #128C7E;
          margin-top: 0;
          font-size: 24px;
        }

        h2 {
          color: #128C7E;
          font-size: 20px;
          margin-top: 0;
        }

        #qr-section {
          margin-top: 20px;
        }

        #qrcode {
          max-width: 250px;
          height: auto;
          margin: 15px auto;
          border: 1px solid #ddd;
          padding: 10px;
          background: white;
        }

        #waitingMessage {
          color: #888;
          font-style: italic;
        }

        small {
          color: #777;
          margin-top: 5px;
          display: block;
          text-align: left;
        }

        button {
          background-color: #128C7E;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 12px;
          margin-top: 15px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: background-color 0.3s;
        }

        button:hover {
          background-color: #0e7265;
          color: #FFFFFF !important;
        }

        #statusMessage {
          margin-top: 15px;
          font-weight: 500;
        }

        .status-container {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 10px;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: #999;
          margin-right: 8px;
        }

        .status-dot.connected {
          background-color: #25D366;
        }

        .status-text {
          font-size: 14px;
          color: #555;
        }

        .divider {
          height: 1px;
          background-color: #eee;
          margin: 25px 0;
        }

        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #888;
        }

        .horarios-container {
          margin-top: 25px;
          padding-top: 10px;
        }

        .horario-inputs {
          display: flex;
          margin-bottom: 10px;
          align-items: center;
        }

        .horario-inputs input {
          max-width: 80px;
          margin-right: 10px;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 16px;
        }

        .horario-inputs .time-separator {
          margin: 0 5px;
        }

        .horario-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 6px;
          margin-bottom: 8px;
        }

        .horario-item .horario-texto {
          font-weight: 500;
        }

        .horario-item .remover-btn {
          background-color: #ff6b6b;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          cursor: pointer;
          font-size: 12px;
          transition: background-color 0.3s;
        }

        .horario-item .remover-btn:hover {
          background-color: #ff5252;
        }

        .add-horario-btn {
          background-color: #4CAF50;
          margin-top: 5px;
          padding: 8px;
          font-size: 14px;
        }

        .horarios-list {
          max-height: 200px;
          overflow-y: auto;
          margin-top: 15px;
          text-align: left;
          padding: 5px;
        }

        #group-info {
          margin-top: 15px;
          padding: 15px;
          background-color: #f0f7ff;
          border-radius: 8px;
          border-left: 4px solid #128C7E;
          text-align: left;
        }

        #group-info p {
          margin: 5px 0;
          color: #333;
        }

        #group-info .group-name {
          font-weight: bold;
          color: #128C7E;
        }

        .instruction {
          font-size: 14px;
          color: #666;
          margin-top: 10px;
          font-style: italic;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>WhatsApp Ponto Bot</h1>

        <div class="status-container">
          <div class="status-dot ${clienteConectado ? "connected" : ""}"></div>
          <span class="status-text">${
            clienteConectado ? "Conectado" : "Aguardando conexão"
          }</span>
        </div>

        <div id="qr-section" ${clienteConectado ? 'style="display:none"' : ""}>
          <p>Escaneie o QR Code abaixo para conectar:</p>
          <img id="qrcode" src="" alt="QR Code"/>
          <p id="waitingMessage">Aguardando QR Code...</p>

          <div class="instruction">
            <p><strong>Importante:</strong> Para receber notificações, você precisa criar um grupo no WhatsApp
            com o nome "Lembrete Ponto" (ou qualquer nome que contenha "Ponto") e ser o único participante desse grupo.</p>
          </div>
        </div>

        <div class="divider"></div>

        <div id="config-section" ${
          clienteConectado ? "" : 'style="display:none"'
        }>
          <h2>Cliente conectado com sucesso!</h2>

          <div id="group-info">
            <div id="group-status">Verificando grupos disponíveis...</div>
          </div>

          <div class="horarios-container">
            <form id="horarioForm">
              <label for="horaInput">Adicionar novo horário:</label>
              <div class="horario-inputs">
                <input type="number" id="horaInput" min="0" max="23" placeholder="Hora" required>
                <span class="time-separator">:</span>
                <input type="number" id="minutoInput" min="0" max="59" placeholder="Min" required>
                <button type="submit" class="add-horario-btn">Adicionar</button>
              </div>
            </form>

            <div class="horarios-list" id="horariosLista">
              <!-- Os horários serão adicionados aqui dinamicamente -->
            </div>

            <button id="salvarHorariosBtn" class="save-btn" style="margin-top: 20px;">Salvar Horários</button>
          </div>
          <p id="horariosStatusMessage" class="status-message"></p>
        </div>

        <div class="footer">
          WhatsApp Ponto Bot • Lembretes para bater ponto diariamente
        </div>
      </div>

      <script>
        function formatarHorario(hora, minuto) {
          return \`\${hora.toString().padStart(2, '0')}:\${minuto.toString().padStart(2, '0')}\`;
        }

        function atualizarListaHorarios(horarios) {
          const listaElement = document.getElementById('horariosLista');
          listaElement.innerHTML = '';

          if (horarios.length === 0) {
            listaElement.innerHTML = '<p>Nenhum horário configurado.</p>';
            return;
          }

          horarios.forEach((horario, index) => {
            const horarioFormatado = formatarHorario(horario.hora, horario.minuto);
            const itemElement = document.createElement('div');
            itemElement.className = 'horario-item';
            itemElement.innerHTML = \`
              <span class="horario-texto">\${horarioFormatado}</span>
              <button type="button" class="remover-btn" data-index="\${index}">Remover</button>
            \`;
            listaElement.appendChild(itemElement);
          });

          document.querySelectorAll('.remover-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              const index = parseInt(this.getAttribute('data-index'));
              removerHorario(index);
            });
          });
        }

        function removerHorario(index) {
          fetch('/remover-horario', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ index: index }),
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              atualizarListaHorarios(data.horarios);
            } else {
              alert('Erro ao remover horário: ' + data.message);
            }
          })
          .catch(error => {
            console.error('Erro ao remover horário:', error);
          });
        }

        function buscarHorarios() {
          fetch('/horarios')
            .then(response => response.json())
            .then(data => {
              atualizarListaHorarios(data.horarios);
            })
            .catch(error => {
              console.error('Erro ao buscar horários:', error);
            });
        }

        function buscarGrupoInfo() {
          fetch('/grupo-info')
            .then(response => response.json())
            .then(data => {
              const groupStatusElement = document.getElementById('group-status');

              if (data.encontrado) {
                groupStatusElement.innerHTML = \`
                  <p><strong>Status:</strong> <span style="color: #25D366">✓ Grupo encontrado</span></p>
                  <p><strong>Nome do grupo:</strong> <span class="group-name">\${data.nomeGrupo}</span></p>
                  <p>As notificações serão enviadas para este grupo.</p>
                \`;
              } else {
                groupStatusElement.innerHTML = \`
                  <p><strong>Status:</strong> <span style="color: #FF0000">✗ Nenhum grupo encontrado</span></p>
                  <p>Por favor, crie um grupo no WhatsApp com a palavra "Ponto" no nome.</p>
                  <p>Você deve ser o único participante do grupo para receber notificações.</p>
                \`;
              }
            })
            .catch(error => {
              console.error('Erro ao buscar informações do grupo:', error);
              document.getElementById('group-status').innerHTML = '✗ Erro ao verificar grupos. Tente recarregar a página.';
            });
        }

        async function fetchQRCode() {
          try {
            const response = await fetch('/qrcode');
            const data = await response.json();

            if (data.qrCode) {
              document.getElementById('qrcode').src = data.qrCode;
              document.getElementById('waitingMessage').style.display = 'none';
            }

            if (data.clienteConectado) {
              document.getElementById('qr-section').style.display = 'none';
              document.getElementById('config-section').style.display = 'block';
              document.querySelector('.status-dot').classList.add('connected');
              document.querySelector('.status-text').textContent = 'Conectado';

              buscarGrupoInfo();
              buscarHorarios();
            }
          } catch (error) {
            console.error("❌ Erro ao buscar QR Code:", error);
          }
        }

        document.addEventListener('DOMContentLoaded', function() {
          document.getElementById('horarioForm').addEventListener('submit', async function(event) {
            event.preventDefault();
            const hora = parseInt(document.getElementById('horaInput').value);
            const minuto = parseInt(document.getElementById('minutoInput').value);

            if (isNaN(hora) || isNaN(minuto) || hora < 0 || hora > 23 || minuto < 0 || minuto > 59) {
              alert('Por favor, insira um horário válido.');
              return;
            }

            try {
              const response = await fetch('/adicionar-horario', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hora, minuto }),
              });

              const data = await response.json();
              if (data.success) {
                document.getElementById('horaInput').value = '';
                document.getElementById('minutoInput').value = '';
                atualizarListaHorarios(data.horarios);

                document.getElementById('horariosStatusMessage').textContent = '✓ Horário adicionado com sucesso!';
                document.getElementById('horariosStatusMessage').style.color = '#25D366';
                setTimeout(() => {
                  document.getElementById('horariosStatusMessage').textContent = '';
                }, 3000);
              } else {
                document.getElementById('horariosStatusMessage').textContent = data.message;
                document.getElementById('horariosStatusMessage').style.color = '#FF0000';
              }
            } catch (error) {
              console.error('Erro ao adicionar horário:', error);
              document.getElementById('horariosStatusMessage').textContent = '✗ Erro ao adicionar horário. Tente novamente.';
              document.getElementById('horariosStatusMessage').style.color = '#FF0000';
            }
          });

          document.getElementById('salvarHorariosBtn').addEventListener('click', async function() {
            try {
              const response = await fetch('/salvar-horarios', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              const data = await response.json();
              document.getElementById('horariosStatusMessage').textContent = data.message;
              document.getElementById('horariosStatusMessage').style.color = data.success ? '#25D366' : '#FF0000';

              if (data.success) {
                setTimeout(() => {
                  document.getElementById('horariosStatusMessage').textContent = '';
                }, 3000);
              }
            } catch (error) {
              console.error('Erro ao salvar horários:', error);
              document.getElementById('horariosStatusMessage').textContent = '✗ Erro ao salvar horários. Tente novamente.';
              document.getElementById('horariosStatusMessage').style.color = '#FF0000';
            }
          });
        });

        setInterval(fetchQRCode, 5000);
        fetchQRCode();
      </script>
    </body>
    </html>
  `);
});

app.get("/qrcode", (req, res) => {
  res.json({
    qrCode: qrCodeData,
    clienteConectado: clienteConectado,
  });
});

app.get("/horarios", (req, res) => {
  res.json({
    success: true,
    horarios: horariosAgendados,
  });
});

app.get("/grupo-info", async (req, res) => {
  try {
    if (!groupId) {
      console.log("⏳ Verificando grupos novamente devido a requisição...");
      const chats = await client.getChats();

      let pontoGrupo = null;
      chats.forEach((chat) => {
        if (chat.isGroup && chat.name.toLowerCase().includes("ponto")) {
          pontoGrupo = chat;
        }
      });

      if (pontoGrupo) {
        groupId = pontoGrupo.id._serialized;
        groupName = pontoGrupo.name;
        console.log(`✅ [API] Grupo encontrado: ${groupName}`);
      }
    }

    res.json({
      encontrado: groupId !== "",
      nomeGrupo: groupName || "❌ Não encontrado",
    });
  } catch (error) {
    console.error("❌ Erro ao verificar grupos na API:", error);
    res.json({
      encontrado: false,
      nomeGrupo: "❌ Erro ao verificar grupos",
    });
  }
});

app.post("/adicionar-horario", (req, res) => {
  const { hora, minuto } = req.body;

  if (
    isNaN(hora) ||
    isNaN(minuto) ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return res.json({
      success: false,
      message:
        "⚠️ Horário inválido. A hora deve estar entre 0-23 e o minuto entre 0-59.",
    });
  }

  const horarioExiste = horariosAgendados.some(
    (h) => h.hora === hora && h.minuto === minuto
  );
  if (horarioExiste) {
    return res.json({
      success: false,
      message: "⚠️ Este horário já está na lista.",
    });
  }

  try {
    horariosAgendados.push({ hora, minuto });
    horariosAgendados.sort((a, b) => {
      if (a.hora === b.hora) {
        return a.minuto - b.minuto;
      }
      return a.hora - b.hora;
    });

    console.log(`✅ Horário adicionado: ${hora}:${minuto}`);

    res.json({
      success: true,
      horarios: horariosAgendados,
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar horário:", error);
    res.json({
      success: false,
      message: "❌ Erro ao adicionar horário. Tente novamente.",
    });
  }
});

app.post("/remover-horario", (req, res) => {
  const { index } = req.body;

  if (index < 0 || index >= horariosAgendados.length) {
    return res.json({
      success: false,
      message: "❌ Índice inválido.",
    });
  }

  try {
    const horarioRemovido = horariosAgendados.splice(index, 1)[0];
    console.log(
      `✅ Horário removido: ${horarioRemovido.hora}:${horarioRemovido.minuto}`
    );

    res.json({
      success: true,
      horarios: horariosAgendados,
    });
  } catch (error) {
    console.error("❌ Erro ao remover horário:", error);
    res.json({
      success: false,
      message: "❌ Erro ao remover horário. Tente novamente.",
    });
  }
});

app.post("/salvar-horarios", (req, res) => {
  try {
    if (!groupId) {
      return res.json({
        success: false,
        message:
          "⚠️ Nenhum grupo encontrado. Crie um grupo com 'Ponto' no nome.",
      });
    }

    configurarAgendamentos();

    res.json({
      success: true,
      message: "✅ Horários salvos e agendados com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao salvar horários:", error);
    res.json({
      success: false,
      message: "❌ Erro ao salvar horários. Tente novamente.",
    });
  }
});

app.listen(PORT, () => console.log(`✅ Servidor online na porta ${PORT}`));

const client = new Client({
  authStrategy: new LocalAuth(),
});

let groupName = "";

client.on("qr", async (qr) => {
  try {
    qrCodeData = await QRCode.toDataURL(qr);
    console.log(
      "📸 QR Code gerado! Acesse https://whatsapp-ponto-bot.onrender.com para escanear."
    );
    clienteConectado = false;
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code:", error);
  }
});

client.on("ready", async () => {
  console.log("✅ Bot está pronto!");
  clienteConectado = true;

  try {
    console.log("⏳ Buscando grupos disponíveis...");
    const chats = await client.getChats();
    console.log(`Total de chats encontrados: ${chats.length}`);

    console.log("=== GRUPOS DISPONÍVEIS ===");
    let pontoGrupo = null;

    chats.forEach((chat) => {
      if (chat.isGroup) {
        console.log(`Nome do grupo: ${chat.name}`);
        console.log(`ID do grupo: ${chat.id._serialized}`);
        console.log(`É grupo: ${chat.isGroup}`);
        console.log("------------------------");

        const nomeGrupoLower = chat.name.toLowerCase();
        const contem = nomeGrupoLower.includes("ponto");
        console.log(
          `Nome em lowercase: ${nomeGrupoLower}, Contém 'ponto': ${contem}`
        );

        if (contem) {
          pontoGrupo = chat;
          console.log("✅ Grupo correspondente encontrado!");
        }
      }
    });

    if (pontoGrupo) {
      groupId = pontoGrupo.id._serialized;
      groupName = pontoGrupo.name;
      console.log(
        `✅ Grupo para notificações encontrado: ${groupName} (${groupId})`
      );
    } else {
      console.log("❌ Nenhum grupo com 'Ponto' no nome foi encontrado.");
      console.log("Lista de todos os chats:");
      chats.forEach((chat, index) => {
        console.log(`${index}: ${chat.name} (isGroup: ${chat.isGroup})`);
      });
    }
  } catch (error) {
    console.error("❌ Erro ao buscar grupos:", error);
    console.error(error.stack);
  }

  setTimeout(async () => {
    try {
      console.log("⏳ Tentando novamente verificar grupos...");
      const chats = await client.getChats();
      let pontoGrupo = null;

      chats.forEach((chat) => {
        if (chat.isGroup && chat.name.toLowerCase().includes("ponto")) {
          pontoGrupo = chat;
        }
      });

      if (pontoGrupo) {
        groupId = pontoGrupo.id._serialized;
        groupName = pontoGrupo.name;
        console.log(`✅ [Retry] Grupo encontrado: ${groupName} (${groupId})`);
      } else {
        console.log("❌ [Retry] Nenhum grupo com 'Ponto' no nome encontrado.");
      }
    } catch (error) {
      console.error("❌ Erro na segunda tentativa:", error);
    }
  }, 10000);

  configurarAgendamentos();
});

function configurarAgendamentos() {
  if (jobsAgendados.length > 0) {
    jobsAgendados.forEach((job) => {
      if (job && typeof job.cancel === "function") {
        job.cancel();
      }
    });
    jobsAgendados = [];
  }

  if (!groupId) {
    console.log(
      "⚠️ Nenhum grupo configurado para envio de mensagens. Não agendando notificações."
    );
    return;
  }

  horariosAgendados.forEach((horario) => {
    const { hora, minuto } = horario;
    const cronExpression = `${minuto} ${hora} * * *`;

    try {
      const job = schedule.scheduleJob(cronExpression, () => {
        enviarMensagem();
      });

      if (job) {
        jobsAgendados.push(job);
        console.log(
          `✅ Agendamento configurado para ${hora}:${
            minuto < 10 ? "0" + minuto : minuto
          }`
        );
      } else {
        console.error(`❌ Falha ao agendar para ${hora}:${minuto}`);
      }
    } catch (error) {
      console.error(
        `❌ Erro ao configurar agendamento para ${hora}:${minuto}:`,
        error
      );
    }
  });

  const horariosFormatados = horariosAgendados
    .map((h) => `${h.hora}:${h.minuto < 10 ? "0" + h.minuto : h.minuto}`)
    .join(", ");

  console.log(
    `📅 Agendamentos configurados para: ${
      horariosFormatados || "nenhum horário"
    }`
  );
}

async function enviarMensagem() {
  if (!groupId) {
    console.log("❌ Nenhum grupo configurado para envio de mensagens");
    return;
  }

  const mensagem = "É hora de bater o ponto! ⏰";

  try {
    await client.sendMessage(groupId, mensagem);
    console.log(`📩 Mensagem enviada para o grupo ${groupName}`);
  } catch (error) {
    console.error("❌ Erro ao enviar mensagem:", error);
  }
}

setInterval(() => {
  fetch("https://whatsapp-ponto-bot.onrender.com/")
    .then(() => console.log("Ping enviado para manter ativo"))
    .catch(() => console.log("Erro no ping"));
}, 600000);

client.initialize();
