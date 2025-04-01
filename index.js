require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const schedule = require("node-schedule");
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 3000;

let qrCodeData = "";

app.get("/", (req, res) => {
  res.send(`
    <h1>Bot está rodando!</h1>
    <p>Escaneie o QR Code abaixo para conectar:</p>
    <img id="qrcode" src="" />
    <p id="waitingMessage">Aguardando QR Code...</p>
    <script>
        async function fetchQRCode() {
          try {
              const response = await fetch('/qrcode');
              const data = await response.json();
              if (data.qrCode) {
                  document.getElementById('qrcode').src = data.qrCode;
                  document.getElementById('waitingMessage').style.display = 'none';
              } else {
                  console.log("❌ QR Code ainda não disponível, tentando novamente...");
              }
          } catch (error) {
              console.error("❌ Erro ao buscar QR Code:", error);
          }
        }
        setInterval(fetchQRCode, 600000);
        fetchQRCode(); 
    </script>
  `);
});

app.get("/qrcode", (req, res) => {
  if (!qrCodeData) {
    return res
      .status(503)
      .json({ message: "QR Code ainda não gerado. Aguarde..." });
  }
  res.json({ qrCode: qrCodeData });
});

app.listen(PORT, () => console.log("Servidor online na porta 3000"));

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on("qr", async (qr) => {
  try {
    qrCodeData = await QRCode.toDataURL(qr);
    console.log("📸 QR Code gerado! Acesse http://localhost:3000 para escanear.");
  } catch (error) {
    console.error("❌ Erro ao gerar QR Code:", error);
  }
});

client.on("ready", () => {
  console.log("Bot está pronto!");

  schedule.scheduleJob("0 17 * * *", () => {
    enviarMensagem();
  });

  schedule.scheduleJob("0 18 * * *", () => {
    enviarMensagem();
  });
});

async function enviarMensagem() {
  const numero = process.env.WHATSAPP_NUMBER;
  const mensagem = "É hora de bater o ponto! ⏰";

  try {
    await client.sendMessage(numero, mensagem);
    console.log(`📩 Mensagem enviada para ${numero}`);
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
