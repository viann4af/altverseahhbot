const Discord = require("discord.js");
const cron = require("node-cron");
const express = require("express");
const path = require("path");
const fs = require("fs");

// Configurações
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1354149129122742347";
const TEST_CHANNEL_ID = "1353464325586817176";
const KAGE_ROLE_ID = "1353463917673840741";
const ADMIN_ROLE_ID = "1353134278564909076";

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.GuildMessageReactions
  ],
});

// Configuração dos GIFs locais
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

  try {
    await channel.send({
      content: roleId ? `<@&${KAGE_ROLE_ID}> <@&${roleId}>` : `<@&${KAGE_ROLE_ID}>`,
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle(`${assets.emoji} ${entityName} ${text}`)
          .setColor(isBoss ? "#FF0000" : "#00FF00")
      ],
      files: [
        new Discord.AttachmentBuilder(
          path.join(__dirname, 'gifs', assets.gif),
          { name: assets.gif }
        )
      ]
    });
    console.log(`✅ Alerta enviado: ${entityName} ${text}`);
  } catch (error) {
    console.error(`❌ Falha ao enviar alerta para ${entityName}:`, error);
    console.log(`ℹ️ Verifique se o arquivo 'gifs/${assets.gif}' existe`);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || ![CHANNEL_ID, TEST_CHANNEL_ID].includes(message.channel.id)) return;

  try {
    // Novo comando !clearchat
    if (message.content === "!clearchat") {
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const reply = await message.reply("❌ Você precisa ser um administrador para usar este comando!");
        return setTimeout(() => reply.delete(), 5000);
      }

      if (!message.channel.isTextBased()) return;

      // Limpa até 100 mensagens (máximo por chamada)
      await message.channel.bulkDelete(100, true)
        .then(deletedMessages => {
          message.channel.send(`✅ ${deletedMessages.size} mensagens foram limpas!`)
            .then(msg => setTimeout(() => msg.delete(), 5000));
        })
        .catch(error => {
          console.error("Erro ao limpar mensagens:", error);
          message.reply("❌ Ocorreu um erro ao tentar limpar as mensagens!")
            .then(msg => setTimeout(() => msg.delete(), 5000));
        });
      return;
    }

    if (message.content.startsWith("!notificar")) {
      const args = message.content.toLowerCase()
        .replace(/,/g, ' ')
        .split(' ')
        .slice(1)
        .filter(arg => arg.trim() !== '');

      if (args.length === 0) {
        const reply = await message.reply("**Uso:** `!notificar bijuu1, boss1, ...`\n**Exemplo:** `!notificar kurama, madara`");
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
      if (success.length > 0) reply += `✅ **Cargos adicionados:** ${success.map(s => `@${s}`).join(', ')}\n`;
      if (failed.length > 0) reply += `❌ **Falha em:** ${failed.join(', ')}`;

      const response = await message.reply(reply);
      setTimeout(() => response.delete(), 15000);
    }
    else if (message.content.startsWith("!silenciar")) {
      const args = message.content.toLowerCase()
        .replace(/,/g, ' ')
        .split(' ')
        .slice(1)
        .filter(arg => arg.trim() !== '');

      if (args.length === 0) {
        const reply = await message.reply("**Uso:** `!silenciar bijuu1, boss1, ...`\n**Exemplo:** `!silenciar kurama, obito`");
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
      if (success.length > 0) reply += `✅ **Cargos removidos:** ${success.map(s => `@${s}`).join(', ')}\n`;
      if (failed.length > 0) reply += `❌ **Falha em:** ${failed.join(', ')}`;

      const response = await message.reply(reply);
      setTimeout(() => response.delete(), 15000);
    }
    else if (message.content.startsWith("!testarbijuu")) {
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
    else if (message.content.startsWith("!testarboss")) {
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

function scheduleAlerts(name, hour, minute, isBoss = false) {
  const entityKey = Object.entries(isBoss ? BOSSES : BIJUUS).find(([_, value]) => value === name)[0];

  let alertMinute = minute - 10;
  let alertHour = hour;
  
  if (alertMinute < 0) {
    alertMinute += 60;
    alertHour -= 1;
    if (alertHour < 0) alertHour = 23;
  }

  cron.schedule(`${alertMinute} ${alertHour} * * *`, () => {
    sendAlert(name, false, isBoss);
  }, { timezone: "America/Sao_Paulo" });

  cron.schedule(`${minute} ${hour} * * *`, () => {
    sendAlert(name, true, isBoss);
  }, { timezone: "America/Sao_Paulo" });
}

client.on("ready", () => {
  console.log(`\n✅ Bot online como ${client.user.tag}\n`);

  // Verificação da pasta gifs
  const gifsPath = path.join(__dirname, 'gifs');
  fs.readdir(gifsPath, (err, files) => {
    if (err) {
      console.error('❌ Erro ao ler pasta gifs:', err);
      console.log('ℹ️ Certifique-se de que a pasta "gifs" existe e contém os arquivos');
      return;
    }
    console.log('📁 GIFs carregados:', files.join(', '));
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

  console.log("\n⏰ Todos os agendamentos foram configurados!");
});

const app = express();
app.get("/", (req, res) => res.send("Bot Online!"));
app.listen(process.env.PORT || 3000, () => {
  console.log(`\n🌐 Servidor web rodando na porta ${process.env.PORT || 3000}`);
});

client.login(TOKEN).catch(err => {
  console.error("❌ Falha ao conectar:", err);
  process.exit(1);
});