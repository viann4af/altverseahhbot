const Discord = require("discord.js");
const cron = require("node-cron");
const express = require("express");
const path = require("path");
const fs = require("fs");

// Configurações
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1354149129122742347";
const TEST_CHANNEL_ID = "1353464325586817176";
const NEW_CHANNEL_ID = "1353129789497671732";
const ADMIN_ROLE_ID = "1353134278564909076";

// Banco de dados simples
const userSettings = new Map();

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.GuildMessageReactions
  ]
});

// Configuração dos GIFs e entidades
const ENTITY_ASSETS = {
  // Bijuus
  shukaku: { emoji: "🐾", gif: "shukaku.gif" },
  matatabi: { emoji: "🔥", gif: "matatabi.gif" },
  isobu: { emoji: "🌊", gif: "isobu.gif" },
  songoku: { emoji: "🐵", gif: "songoku.gif" },
  kokuo: { emoji: "🐎", gif: "kokuo.gif" },
  saiken: { emoji: "🐙", gif: "saiken.gif" },
  chomei: { emoji: "🐛", gif: "chomei.gif" },
  gyuki: { emoji: "🐂", gif: "gyuki.gif" },
  kurama: { emoji: "🦊", gif: "kurama.gif" },

  // Bosses
  obito: { emoji: "🌀", gif: "obito.gif" },
  zetsu: { emoji: "🌿", gif: "zetsu.gif" },
  konan: { emoji: "📜", gif: "konan.gif" },
  juugo: { emoji: "💢", gif: "juugo.gif" },
  deidara: { emoji: "💣", gif: "deidara.gif" },
  kakuzo: { emoji: "💀", gif: "kakuzo.gif" },
  kisame: { emoji: "🦈", gif: "kisame.gif" },
  madara: { emoji: "👁️", gif: "madara.gif" }
};

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

const ENTITY_ROLES = {
  shukaku: "Shukaku",
  matatabi: "Matatabi",
  isobu: "Isobu",
  songoku: "Son Goku",
  kokuo: "Kokuo",
  saiken: "Saiken",
  chomei: "Chomei",
  gyuki: "Gyuki",
  kurama: "Kurama",
  obito: "Obito",
  zetsu: "Zetsu",
  konan: "Konan",
  juugo: "Juugo",
  deidara: "Deidara",
  kakuzo: "Kakuzo",
  kisame: "Kisame",
  madara: "Madara"
};

async function sendAlert(entityName, isNow, isBoss = false) {
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return console.error("❌ Canal não encontrado");

  const assets = ENTITY_ASSETS[entityName.toLowerCase()];
  const roleId = channel.guild.roles.cache.find(r => r.name === ENTITY_ROLES[entityName.toLowerCase()])?.id;

  const text = isNow 
    ? `${isBoss ? "APARECEU" : "SPAWNOU"} AGORA!` 
    : `irá ${isBoss ? "aparecer" : "spawnar"} em 10 minutos!`;

  const messageContent = {
    content: roleId ? `<@&${roleId}>` : null,
    embeds: [
      new Discord.EmbedBuilder()
        .setTitle(`${assets.emoji} ${entityName} ${text}`)
        .setColor(isBoss ? "#FF0000" : "#00FF00")
    ]
  };

  // Adiciona GIF apenas se for alerta de spawn (isNow = true)
  if (isNow) {
    messageContent.files = [
      new Discord.AttachmentBuilder(
        path.join(__dirname, 'gifs', assets.gif),
        { name: assets.gif }
      )
    ];
  }

  try {
    await channel.send(messageContent);
    console.log(`✅ Alerta enviado: ${entityName} ${text}`);
  } catch (error) {
    console.error(`❌ Falha ao enviar alerta para ${entityName}:`, error);
    if (isNow) {
      console.log(`ℹ️ Verifique se o arquivo 'gifs/${assets.gif}' existe`);
    }
  }
}

function scheduleAlerts(name, hour, minute, isBoss = false) {
  // Alerta de 10 minutos antes
  let alertHour = hour;
  let alertMinute = minute - 10;
  
  // Ajuste para minutos negativos
  if (alertMinute < 0) {
    alertMinute += 60;
    alertHour -= 1;
  }
  
  // Ajuste para horas negativas (cruzar a meia-noite)
  if (alertHour < 0) {
    alertHour += 24;
  }

  // Verificação de segurança para valores válidos
  if (alertHour < 0 || alertHour > 23 || alertMinute < 0 || alertMinute > 59) {
    console.error(`❌ Horário inválido para ${name}: ${alertHour}:${alertMinute}`);
    return;
  }

  // Agendamento do alerta de 10 minutos (sem GIF)
  cron.schedule(`${alertMinute} ${alertHour} * * *`, () => {
    sendAlert(name, false, isBoss);
  }, {
    timezone: "America/Sao_Paulo",
    scheduled: true,
    recoverMissedExecutions: false
  });

  // Agendamento do spawn (com GIF)
  cron.schedule(`${minute} ${hour} * * *`, () => {
    sendAlert(name, true, isBoss);
  }, {
    timezone: "America/Sao_Paulo",
    scheduled: true,
    recoverMissedExecutions: false
  });

  console.log(`⏰ ${name} agendado para ${hour}:${minute} (alerta às ${alertHour}:${alertMinute})`);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || ![CHANNEL_ID, TEST_CHANNEL_ID, NEW_CHANNEL_ID].includes(message.channel.id)) return;

  try {
    // Comando: !comandos
    if (message.content === "!comandos") {
      const embed = new Discord.EmbedBuilder()
        .setTitle("📜 Lista de Comandos")
        .setColor("#5865F2")
        .addFields(
          {
            name: "🔔 Notificações",
            value: "`!notificar bijuu,boss` - Ativa alertas\n" +
                   "`!silenciar bijuu,boss` - Desativa alertas\n" +
                   "`!meuscargos` - Mostra suas notificações\n" +
                   "`!dormir [horas]` - Pausa notificações"
          },
          {
            name: "🛠️ Administração",
            value: "`!testarbijuu nome 10min/agora`\n" +
                   "`!testarboss nome 10min/agora`\n" +
                   "`!clearchat` - Limpa o chat"
          },
          {
            name: "ℹ️ Informação",
            value: "`!horarios` - Mostra horários\n" +
                   "`!comandos` - Esta mensagem"
          }
        )
        .setFooter({ text: "Exemplos: !notificar kurama, madara | !dormir 2" });
      
      await message.reply({ embeds: [embed] });
      return;
    }

    // Comando: !horarios
    if (message.content === "!horarios") {
      const embed = new Discord.EmbedBuilder()
        .setTitle("⏰ Horários de Spawn (GMT-3)")
        .setColor("#FFA500")
        .addFields(
          {
            name: "🦊 Bijuus",
            value: "Shukaku: 7:30 e 19:30\n" +
                   "Matatabi: 15:30 e 3:30\n" +
                   "Kurama: 17:30 e 5:30"
          },
          {
            name: "💀 Bosses",
            value: "Madara: 9:45 e 21:45\n" +
                   "Obito: 10:25 e 22:25\n" +
                   "Kisame: 4:00 e 16:00"
          }
        );
      
      await message.reply({ embeds: [embed] });
      return;
    }

    // Comando: !clearchat
    if (message.content === "!clearchat") {
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const reply = await message.reply("❌ Você precisa ser um administrador para usar este comando!");
        return setTimeout(() => reply.delete(), 5000);
      }

      await message.channel.bulkDelete(100, true)
        .then(deletedMessages => {
          message.channel.send(`✅ ${deletedMessages.size} mensagens limpas!`)
            .then(msg => setTimeout(() => msg.delete(), 5000));
        })
        .catch(error => {
          console.error("Erro ao limpar mensagens:", error);
          message.reply("❌ Erro ao limpar mensagens!")
            .then(msg => setTimeout(() => msg.delete(), 5000));
        });
      return;
    }

    // Comando: !notificar
    if (message.content.startsWith("!notificar")) {
      const args = message.content.toLowerCase().replace(/,/g, ' ').split(' ').slice(1).filter(arg => arg.trim() !== '');

      if (args.length === 0) {
        const reply = await message.reply("**Uso:** `!notificar bijuu1,boss1`\n**Exemplo:** `!notificar kurama, madara`");
        return setTimeout(() => reply.delete(), 10000);
      }

      let success = [];
      let failed = [];

      for (const entity of args) {
        const roleName = ENTITY_ROLES[entity];
        if (!roleName) {
          failed.push(entity);
          continue;
        }

        try {
          let role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
          if (!role) {
            role = await message.guild.roles.create({
              name: roleName,
              mentionable: true,
              reason: `Cargo para notificações de ${roleName}`
            });
          }

          await message.member.roles.add(role);
          success.push(roleName);
        } catch (err) {
          console.error(`❌ Erro ao adicionar cargo ${roleName}:`, err);
          failed.push(roleName);
        }
      }

      let reply = "";
      if (success.length > 0) reply += `✅ **Cargos adicionados:** ${success.join(', ')}\n`;
      if (failed.length > 0) reply += `❌ **Falha em:** ${failed.join(', ')}`;

      const response = await message.reply(reply);
      setTimeout(() => response.delete(), 15000);
    }

    // Comando: !silenciar
    if (message.content.startsWith("!silenciar")) {
      const args = message.content.toLowerCase().replace(/,/g, ' ').split(' ').slice(1).filter(arg => arg.trim() !== '');

      if (args.length === 0) {
        const reply = await message.reply("**Uso:** `!silenciar bijuu1,boss1`\n**Exemplo:** `!silenciar kurama, obito`");
        return setTimeout(() => reply.delete(), 10000);
      }

      let success = [];
      let failed = [];

      for (const entity of args) {
        const roleName = ENTITY_ROLES[entity];
        if (!roleName) {
          failed.push(entity);
          continue;
        }

        try {
          const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
          if (!role) {
            failed.push(roleName);
            continue;
          }

          await message.member.roles.remove(role);
          success.push(roleName);
        } catch (err) {
          console.error(`❌ Erro ao remover cargo ${roleName}:`, err);
          failed.push(roleName);
        }
      }

      let reply = "";
      if (success.length > 0) reply += `✅ **Cargos removidos:** ${success.join(', ')}\n`;
      if (failed.length > 0) reply += `❌ **Falha em:** ${failed.join(', ')}`;

      const response = await message.reply(reply);
      setTimeout(() => response.delete(), 15000);
    }

    // Comando: !meuscargos
    if (message.content === "!meuscargos") {
      const member = message.member;
      const roles = member.roles.cache
        .filter(role => Object.values(ENTITY_ROLES).includes(role.name))
        .map(role => role.name);

      const embed = new Discord.EmbedBuilder()
        .setTitle("🔔 Suas Notificações")
        .setColor("#00FF00")
        .setDescription(roles.length > 0 ? roles.join("\n") : "Você não está recebendo notificações")
        .setFooter({ text: "Use !notificar ou !silenciar para gerenciar" });

      await message.reply({ embeds: [embed] });
      return;
    }

    // Comando: !dormir
    if (message.content.startsWith("!dormir")) {
      const hours = parseInt(message.content.split(" ")[1]) || 2;
      const userId = message.author.id;
      
      userSettings.set(userId, {
        ...(userSettings.get(userId) || {}),
        mutedUntil: new Date(Date.now() + hours * 60 * 60 * 1000)
      });

      const reply = await message.reply(
        `🔇 Notificações pausadas por ${hours}h\n` +
        `⏰ Voltarão em ${new Date(Date.now() + hours * 60 * 60 * 1000).toLocaleTimeString()}`
      );
      setTimeout(() => reply.delete(), 10000);
      return;
    }

    // Comando: !testarbijuu
    if (message.content.startsWith("!testarbijuu")) {
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const reply = await message.reply("❌ Sem permissão!");
        return setTimeout(() => reply.delete(), 5000);
      }

      const args = message.content.split(" ");
      if (args.length < 3 || !["10min", "agora"].includes(args[2])) {
        const reply = await message.reply("❌ Use: `!testarbijuu [bijuu] [10min|agora]`");
        return setTimeout(() => reply.delete(), 5000);
      }

      const bijuuKey = args[1].toLowerCase();
      if (!BIJUUS[bijuuKey]) {
        const reply = await message.reply(`❌ Bijuus válidas: ${Object.values(BIJUUS).join(", ")}`);
        return setTimeout(() => reply.delete(), 5000);
      }

      sendAlert(BIJUUS[bijuuKey], args[2] === "agora", false);
    }

    // Comando: !testarboss
    if (message.content.startsWith("!testarboss")) {
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const reply = await message.reply("❌ Sem permissão!");
        return setTimeout(() => reply.delete(), 5000);
      }

      const args = message.content.split(" ");
      if (args.length < 3 || !["10min", "agora"].includes(args[2])) {
        const reply = await message.reply("❌ Use: `!testarboss [boss] [10min|agora]`");
        return setTimeout(() => reply.delete(), 5000);
      }

      const bossKey = args[1].toLowerCase();
      if (!BOSSES[bossKey]) {
        const reply = await message.reply(`❌ Bosses válidos: ${Object.values(BOSSES).join(", ")}`);
        return setTimeout(() => reply.delete(), 5000);
      }

      sendAlert(BOSSES[bossKey], args[2] === "agora", true);
    }

  } catch (error) {
    console.error("❌ Erro no comando:", error);
  }
});

client.on("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // Verificar pasta de GIFs
  fs.readdir(path.join(__dirname, 'gifs'), (err, files) => {
    if (err) {
      console.error('❌ Erro ao ler pasta gifs:', err);
    } else {
      console.log('📁 GIFs carregados:', files.join(', '));
    }
  });

  // Agendamentos
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

const app = express();
app.get("/", (req, res) => res.send("Bot Online!"));
app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Servidor web rodando na porta ${process.env.PORT || 3000}`);
});

client.login(TOKEN).catch(err => {
  console.error("❌ Falha ao conectar:", err);
  process.exit(1);
});