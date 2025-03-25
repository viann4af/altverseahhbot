const Discord = require("discord.js");
const cron = require("node-cron");
const express = require("express");
const fetch = require("node-fetch"); // Adicionado para o ping automático

// Configurações
const TOKEN = process.env.TOKEN; // Usando variável de ambiente
const CHANNEL_ID = "1354149129122742347"; // Canal de notificações
const TEST_CHANNEL_ID = "1353464325586817176"; // Canal de testes
const ROLE_ID = "1353463917673840741"; // Cargo @Kage
const ADMIN_ROLE_ID = "1353134278564909076"; // Cargo admin

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
  ],
});

// Listas de entidades
const BIJUUS = {
  shukaku: "Shukaku",
  matatabi: "Matatabi",
  isobu: "Isobu",
  songoku: "Son Goku",
  kokuo: "Kokuo",
  saiken: "Saiken",
  chomei: "Chomei",
  gyuki: "Gyuki",
  kurama: "Kurama"
};

const BOSSES = {
  obito: "Obito",
  zetsu: "Zetsu",
  konan: "Konan",
  juugo: "Juugo",
  deidara: "Deidara",
  kakuzo: "Kakuzo",
  kisame: "Kisame",
  madara: "Madara"
};

// Função para verificar permissões
function hasPermission(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// Função para enviar mensagens
function sendMessage(content, isTest = false) {
  const channelId = isTest ? TEST_CHANNEL_ID : CHANNEL_ID;
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.error(`❌ Canal ${isTest ? 'de testes' : 'principal'} não encontrado!`);
    return;
  }
  channel.send(`${content} <@&${ROLE_ID}>`)
    .then(() => console.log(`📩 Mensagem ${isTest ? '(TESTE)' : ''}: ${content}`))
    .catch(err => console.error(`❌ Erro ao enviar ${isTest ? 'teste' : 'mensagem'}:`, err));
}

// Funções de teste
function testBijuuAlert(bijuuName, alertType, isTest) {
  const bijuu = BIJUUS[bijuuName.toLowerCase()];
  if (!bijuu) return false;

  const message = alertType === "agora" 
    ? `🟢 ${bijuu} SPAWNOU AGORA! @everyone` 
    : `${bijuu} irá spawnar em 10 minutos!`;
  
  sendMessage(message, isTest);
  return true;
}

function testBossAlert(bossName, alertType, isTest) {
  const boss = BOSSES[bossName.toLowerCase()];
  if (!boss) return false;

  const message = alertType === "agora" 
    ? `🔴 ${boss} APARECEU AGORA! @everyone` 
    : `${boss} irá aparecer em 10 minutos!`;
  
  sendMessage(message, isTest);
  return true;
}

// Comandos do bot
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (![CHANNEL_ID, TEST_CHANNEL_ID].includes(message.channel.id)) return;

  try {
    if (message.content === "!ping") {
      await message.reply("🏓 Pong! | Bot operacional!");
    } 
    else if (message.content.startsWith("!testarbijuu")) {
      if (!hasPermission(message.member)) {
        const reply = await message.reply("❌ Sem permissão!");
        return setTimeout(() => reply.delete(), 5000);
      }

      const args = message.content.split(" ");
      if (args.length < 3 || !["10min", "agora"].includes(args[2])) {
        const reply = await message.reply("❌ Use: `!testarbijuu [bijuu] [10min|agora]`");
        return setTimeout(() => reply.delete(), 5000);
      }

      if (!testBijuuAlert(args[1], args[2], message.channel.id === TEST_CHANNEL_ID)) {
        const reply = await message.reply(`❌ Bijuus válidas: ${Object.values(BIJUUS).join(", ")}`);
        setTimeout(() => reply.delete(), 5000);
      }
    }
    else if (message.content.startsWith("!testarboss")) {
      if (!hasPermission(message.member)) {
        const reply = await message.reply("❌ Sem permissão!");
        return setTimeout(() => reply.delete(), 5000);
      }

      const args = message.content.split(" ");
      if (args.length < 3 || !["10min", "agora"].includes(args[2])) {
        const reply = await message.reply("❌ Use: `!testarboss [boss] [10min|agora]`");
        return setTimeout(() => reply.delete(), 5000);
      }

      if (!testBossAlert(args[1], args[2], message.channel.id === TEST_CHANNEL_ID)) {
        const reply = await message.reply(`❌ Bosses válidos: ${Object.values(BOSSES).join(", ")}`);
        setTimeout(() => reply.delete(), 5000);
      }
    }
  } catch (error) {
    console.error("Erro no comando:", error);
  }
});

// Agendadores
function scheduleAlerts(name, hour, minute, isBoss = false) {
  // Ajuste para horários negativos
  let alertMinute = minute - 10;
  let alertHour = hour;
  if (alertMinute < 0) {
    alertMinute += 60;
    alertHour = hour === 0 ? 23 : hour - 1;
  }

  // Agendamento
  cron.schedule(`${alertMinute} ${alertHour} * * *`, () => {
    sendMessage(`${name} ${isBoss ? 'irá aparecer' : 'irá spawnar'} em 10 minutos!`);
  }, { timezone: "America/Sao_Paulo" });

  cron.schedule(`${minute} ${hour} * * *`, () => {
    sendMessage(`${isBoss ? '🔴' : '🟢'} ${name} ${isBoss ? 'APARECEU' : 'SPAWNOU'} AGORA! @everyone`);
  }, { timezone: "America/Sao_Paulo" });
}

// Inicialização
client.on("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // Agendar Bijuus
  scheduleAlerts("Shukaku", 7, 30);
  scheduleAlerts("Shukaku", 19, 30);
  scheduleAlerts("Matatabi", 15, 30);
  scheduleAlerts("Matatabi", 3, 30);
  scheduleAlerts("Isobu", 14, 30);
  scheduleAlerts("Isobu", 2, 30);
  scheduleAlerts("Son Goku", 10, 0);
  scheduleAlerts("Son Goku", 22, 0);
  scheduleAlerts("Kokuo", 11, 0);
  scheduleAlerts("Kokuo", 23, 0);
  scheduleAlerts("Saiken", 12, 0);
  scheduleAlerts("Saiken", 0, 0);
  scheduleAlerts("Chomei", 13, 30);
  scheduleAlerts("Chomei", 23, 30);
  scheduleAlerts("Gyuki", 12, 30);
  scheduleAlerts("Gyuki", 0, 30);
  scheduleAlerts("Kurama", 17, 30);
  scheduleAlerts("Kurama", 5, 30);

  

  // Agendar Bosses
  scheduleAlerts("Obito", 10, 25, true);
  scheduleAlerts("Obito", 22, 25, true);
  scheduleAlerts("Zetsu", 10, 30, true);
  scheduleAlerts("Zetsu", 20, 30, true);
  scheduleAlerts("Konan", 5, 0, true);
  scheduleAlerts("Konan", 17, 0, true);
  scheduleAlerts("Juugo", 4, 30, true);
  scheduleAlerts("Juugo", 16, 30, true);
  scheduleAlerts("Deidara", 6, 0, true);
  scheduleAlerts("Deidara", 18, 0, true);
  scheduleAlerts("Kakuzo", 7, 0, true);
  scheduleAlerts("Kakuzo", 19, 0, true);
  scheduleAlerts("Kisame", 4, 0, true);
  scheduleAlerts("Kisame", 16, 0, true);
  scheduleAlerts("Madara", 9, 45, true);
  scheduleAlerts("Madara", 21, 45, true);
  

  console.log("⏰ Todos os agendamentos foram configurados!");
});

// Servidor web + ping automático
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  console.log("🔄 Ping recebido (keep-alive)");
  res.status(200).send("AltverseAhhBot Online!");
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  
  // Ping automático a cada 5 minutos
  if (process.env.RAILWAY_STATIC_URL) {
    setInterval(() => {
      fetch(process.env.RAILWAY_STATIC_URL).catch(() => {});
    }, 300000);
  }
});

// Ping automático (evita dormência)
setInterval(() => {
  fetch('altverseahhbot-production.up.railway.app').catch(console.error);
}, 300000); // 5 minutos

client.login(TOKEN).catch(console.error);