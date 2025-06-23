const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, Partials } = require("discord.js");
const cron = require("node-cron");
const express = require("express");
const path = require("path");
const fs = require("fs");

// Configurações
const TOKEN = process.env.TOKEN;
const ALERT_CHANNEL_ID = "1354149129122742347";
const COMMAND_CHANNEL_ID = "1386332436148912338"; // Canal da mensagem fixa
const ADMIN_ROLE_ID = "1353134278564909076";

// Banco de dados simples para a mensagem fixa
let bijuuStatus = {
  manhã: {
    kurama: "",
    shukaku: "",
    songoku: "",
    kokuo: "",
    choumei: "",
    saiken: "",
    hachibi: "",
    isobu: "",
    matatabi: ""
  },
  tarde: {
    kurama: "",
    shukaku: "",
    songoku: "",
    kokuo: "",
    choumei: "",
    saiken: "",
    hachibi: "",
    isobu: "",
    matatabi: ""
  },
  data: ""
};
let fixedMessageId = null;

// Banco para !dormir
const userSettings = new Map();

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// GIFs e emojis
const ENTITY_ASSETS = {
  kurama: { emoji: "🦊", gif: "kurama.gif" },
  shukaku: { emoji: "🐾", gif: "shukaku.gif" },
  songoku: { emoji: "🐵", gif: "songoku.gif" },
  kokuo: { emoji: "🐎", gif: "kokuo.gif" },
  choumei: { emoji: "🐛", gif: "choumei.gif" },
  saiken: { emoji: "🐙", gif: "saiken.gif" },
  hachibi: { emoji: "🐂", gif: "hachibi.gif" },
  isobu: { emoji: "🌊", gif: "isobu.gif" },
  matatabi: { emoji: "🔥", gif: "matatabi.gif" }
};

// Atualizar embed da mensagem fixa
async function updateFixedMessage() {
  const channel = await client.channels.fetch(COMMAND_CHANNEL_ID);
  if (!channel) return console.error("Canal da mensagem fixa não encontrado.");

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR");
  bijuuStatus.data = dataFormatada;

  const embed = new EmbedBuilder()
    .setTitle(`📜 Registro de Bijuus`)
    .setColor("#FFA500")
    .setDescription(`Data: **${dataFormatada}**`)
    .addFields(
      { name: "🌅 MANHÃ", value: formatStatus(bijuuStatus.manhã), inline: true },
      { name: "🌇 TARDE", value: formatStatus(bijuuStatus.tarde), inline: true }
    )
    .setFooter({ text: "Use ![bijuu]manha @user ou ![bijuu]tarde @user" });

  try {
    if (fixedMessageId) {
      const msg = await channel.messages.fetch(fixedMessageId);
      await msg.edit({ embeds: [embed] });
    } else {
      const msg = await channel.send({ embeds: [embed] });
      fixedMessageId = msg.id;
    }
  } catch (err) {
    console.error("Erro ao atualizar mensagem fixa:", err);
  }
}

// Formatar status das bijuus
function formatStatus(periodo) {
  return Object.entries(periodo)
    .map(([key, value]) => `${capitalize(key)}: ${value || "—"}`)
    .join("\n");
}

// Capitalizar
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Reset diário
cron.schedule("0 0 * * *", async () => {
  for (const periodo of ["manhã", "tarde"]) {
    Object.keys(bijuuStatus[periodo]).forEach(key => bijuuStatus[periodo][key] = "");
  }
  await updateFixedMessage();
  console.log("🕛 Reset diário aplicado.");
}, {
  timezone: "America/Sao_Paulo"
});

// Comandos
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Comandos da mensagem fixa
  const bijuuKeys = Object.keys(ENTITY_ASSETS);
  for (const periodo of ["manha", "tarde"]) {
    for (const bijuu of bijuuKeys) {
      if (message.content.toLowerCase().startsWith(`!${bijuu}${periodo}`)) {
        const user = message.mentions.users.first();
        if (!user) {
          return message.reply("❌ Marque um usuário.").then(msg => setTimeout(() => msg.delete(), 5000));
        }
        bijuuStatus[periodo === "manha" ? "manhã" : "tarde"][bijuu] = `<@${user.id}>`;
        await updateFixedMessage();
        return message.react("✅");
      }
    }
  }
});

// Alertas de GIFs (mantido do original)
async function sendAlert(entity, isNow) {
  const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
  const { emoji, gif } = ENTITY_ASSETS[entity.toLowerCase()];
  const text = isNow ? "SPAWNOU AGORA!" : "Irá spawnar em 10 minutos!";

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} ${capitalize(entity)} ${text}`)
    .setColor(isNow ? "#FF0000" : "#00FF00");

  const file = new AttachmentBuilder(path.join(__dirname, "gifs", gif));

  channel.send({ embeds: [embed], files: [file] });
  console.log(`🔔 Alerta enviado para ${entity}`);
}

// Agendamentos exemplo (adicione os seus horários aqui)
function scheduleAlerts() {
  const horarios = [
    { name: "Kurama", hour: 17, minute: 30 },
    { name: "Kurama", hour: 5, minute: 30 },
    { name: "Shukaku", hour: 7, minute: 30 },
    { name: "Shukaku", hour: 19, minute: 30 }
    // Adicione todos os outros
  ];

  horarios.forEach(({ name, hour, minute }) => {
    const alertHour = minute >= 10 ? hour : (hour - 1 + 24) % 24;
    const alertMinute = (minute - 10 + 60) % 60;

    cron.schedule(`${alertMinute} ${alertHour} * * *`, () => {
      sendAlert(name, false);
    }, { timezone: "America/Sao_Paulo" });

    cron.schedule(`${minute} ${hour} * * *`, () => {
      sendAlert(name, true);
    }, { timezone: "America/Sao_Paulo" });

    console.log(`⏰ Agendado ${name} ${hour}:${minute}`);
  });
}

// Quando o bot inicia
client.on("ready", async () => {
  console.log(`✅ Logado como ${client.user.tag}`);
  await updateFixedMessage();
  scheduleAlerts();
});

// Express (para manter online no Koyeb)
const app = express();
app.get("/", (req, res) => res.send("Bot Online!"));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Web rodando na porta ${process.env.PORT || 3000}`);
});

client.login(TOKEN);
