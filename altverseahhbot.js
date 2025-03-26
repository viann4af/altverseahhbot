const Discord = require("discord.js");
const cron = require("node-cron");
const express = require("express");
const fetch = require("node-fetch");

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
  ],
});

const ENTITY_ASSETS = {
  shukaku: { emoji: "🐾", gif: "https://tenor.com/pt-BR/view/naruto-lets-go-wild-shukaku-get-ready-get-ready-shukaku-gif-11956721" },
  matatabi: { emoji: "🔥", gif: "https://tenor.com/pt-BR/view/matatabi-naruto-anime-bijuu-two-tails-gif-17610422" },
  isobu: { emoji: "🌊", gif: "https://tenor.com/pt-BR/view/isobu-gif-24958375" },
  songoku: { emoji: "🐵", gif: "https://tenor.com/pt-BR/view/bijuu-gif-25955278" },
  kokuo: { emoji: "🐎", gif: "https://tenor.com/pt-BR/view/kokuo-bijuu-naruto-gif-16019463" },
  saiken: { emoji: "🐙", gif: "https://tenor.com/pt-BR/view/saiken-rokubi-bijuu-naruto-six-tails-gif-15346212056033384153" },
  chomei: { emoji: "🐛", gif: "https://tenor.com/pt-BR/view/bijuu-gif-25955282" },
  gyuki: { emoji: "🐂", gif: "https://tenor.com/pt-BR/view/gyuki-bijuu-killer-bee-roar-jinchuuriki-vs-jinchuuriki-gif-19222709" },
  kurama: { emoji: "🦊", gif: "https://tenor.com/pt-BR/view/kurama-naruto-smile-naruto-shippuden-anime-gif-17477767" },
  obito: { emoji: "🌀", gif: "https://tenor.com/pt-BR/view/anime-gif-1090960240556527685" },
  zetsu: { emoji: "🌿", gif: "https://tenor.com/pt-BR/view/zetsu-white-zetsu-white-black-black-zetsu-gif-16875069868152542261" },
  konan: { emoji: "📜", gif: "https://tenor.com/pt-BR/view/tobi-vs-konan-origami-akatsuki-gif-25024777" },
  juugo: { emoji: "💢", gif: "https://tenor.com/pt-BR/view/jugo-naruto-anime-gif-11290790" },
  deidara: { emoji: "💣", gif: "https://tenor.com/pt-BR/view/deidara-gif-22580287" },
  kakuzo: { emoji: "💀", gif: "https://tenor.com/pt-BR/view/naruto-anime-money-counting-gif-9629838" },
  kisame: { emoji: "🦈", gif: "https://tenor.com/pt-BR/view/maykson-rootwolf-uri-gif-19641768" },
  madara: { emoji: "👁️", gif: "https://tenor.com/pt-BR/view/ok-gif-26107516" },
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
  if (!channel) return console.error("Channel not found");

  const assets = ENTITY_ASSETS[entityName.toLowerCase()];
  const roleId = channel.guild.roles.cache.find(r => r.name === ENTITY_ROLES[entityName.toLowerCase()])?.id;

  const text = isNow 
    ? `${isBoss ? "APARECEU" : "SPAWNOU"} AGORA!` 
    : `irá ${isBoss ? "aparecer" : "spawnar"} em 10 minutos!`;

  const embed = new Discord.EmbedBuilder()
    .setTitle(`${assets.emoji} ${entityName} ${text}`)
    .setImage(assets.gif)
    .setColor(isBoss ? "#FF0000" : "#00FF00");

  const mentions = roleId ? `<@&${KAGE_ROLE_ID}> <@&${roleId}>` : `<@&${KAGE_ROLE_ID}>`;

  await channel.send({ 
    content: mentions,
    embeds: [embed] 
  });
  console.log(`Alert sent: ${entityName} ${text}`);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot || ![CHANNEL_ID, TEST_CHANNEL_ID].includes(message.channel.id)) return;

  try {
    if (message.content.startsWith("!notificar")) {
      const args = message.content.toLowerCase().split(" ").slice(1);
      if (args.length === 0) {
        return message.reply("Use: `!notificar kurama, madara, ...`").then(m => setTimeout(() => m.delete(), 5000));
      }

      let success = [];
      let failed = [];

      for (const entity of args) {
        const roleName = ENTITY_ROLES[entity];
        if (!roleName) {
          failed.push(entity);
          continue;
        }

        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          failed.push(roleName);
          continue;
        }

        try {
          await message.member.roles.add(role);
          success.push(roleName);
        } catch (err) {
          failed.push(roleName);
        }
      }

      let reply = "";
      if (success.length > 0) reply += `Now notifying: ${success.join(", ")}\n`;
      if (failed.length > 0) reply += `Failed: ${failed.join(", ")}`;

      await message.reply(reply);
    }
    else if (message.content.startsWith("!silenciar")) {
      const args = message.content.toLowerCase().split(" ").slice(1);
      if (args.length === 0) {
        return message.reply("Use: `!silenciar kurama, madara, ...`").then(m => setTimeout(() => m.delete(), 5000));
      }

      let success = [];
      let failed = [];

      for (const entity of args) {
        const roleName = ENTITY_ROLES[entity];
        if (!roleName) {
          failed.push(entity);
          continue;
        }

        const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          failed.push(roleName);
          continue;
        }

        try {
          await message.member.roles.remove(role);
          success.push(roleName);
        } catch (err) {
          failed.push(roleName);
        }
      }

      let reply = "";
      if (success.length > 0) reply += `No longer notifying: ${success.join(", ")}\n`;
      if (failed.length > 0) reply += `Failed: ${failed.join(", ")}`;

      await message.reply(reply);
    }
    else if (message.content.startsWith("!testarbijuu")) {
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const reply = await message.reply("No permission!");
        return setTimeout(() => reply.delete(), 5000);
      }

      const args = message.content.split(" ");
      if (args.length < 3 || !["10min", "agora"].includes(args[2])) {
        const reply = await message.reply("Use: `!testarbijuu [bijuu] [10min|agora]`");
        return setTimeout(() => reply.delete(), 5000);
      }

      const bijuuKey = args[1].toLowerCase();
      if (!BIJUUS[bijuuKey]) {
        const reply = await message.reply(`Invalid bijuu: ${Object.values(BIJUUS).join(", ")}`);
        return setTimeout(() => reply.delete(), 5000);
      }

      sendAlert(BIJUUS[bijuuKey], args[2] === "agora", false);
    }
    else if (message.content.startsWith("!testarboss")) {
      if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
        const reply = await message.reply("No permission!");
        return setTimeout(() => reply.delete(), 5000);
      }

      const args = message.content.split(" ");
      if (args.length < 3 || !["10min", "agora"].includes(args[2])) {
        const reply = await message.reply("Use: `!testarboss [boss] [10min|agora]`");
        return setTimeout(() => reply.delete(), 5000);
      }

      const bossKey = args[1].toLowerCase();
      if (!BOSSES[bossKey]) {
        const reply = await message.reply(`Invalid boss: ${Object.values(BOSSES).join(", ")}`);
        return setTimeout(() => reply.delete(), 5000);
      }

      sendAlert(BOSSES[bossKey], args[2] === "agora", true);
    }
  } catch (error) {
    console.error("Command error:", error);
  }
});

function scheduleAlerts(name, hour, minute, isBoss = false) {
  const entityKey = Object.entries(isBoss ? BOSSES : BIJUUS).find(([_, value]) => value === name)[0];

  cron.schedule(`${minute - 10} ${hour} * * *`, () => {
    sendAlert(name, false, isBoss);
  }, { timezone: "America/Sao_Paulo" });

  cron.schedule(`${minute} ${hour} * * *`, () => {
    sendAlert(name, true, isBoss);
  }, { timezone: "America/Sao_Paulo" });
}

client.on("ready", () => {
  console.log(`Bot ready as ${client.user.tag}`);

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
});

const app = express();
app.get("/", (req, res) => res.send("Bot Online!"));
app.listen(process.env.PORT || 3000);

client.login(TOKEN);