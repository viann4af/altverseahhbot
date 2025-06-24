const { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const cron = require('node-cron');
const express = require('express');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const ALERT_CHANNEL_ID = '1354149129122742347';
const FIXED_MESSAGE_CHANNEL_ID = '1386332436148912338';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const app = express();
app.get('/', (req, res) => res.send('Bot Online'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Web ativo'));

const ENTITY_LIST = [
  'Kurama', 'Shukaku', 'Son Goku', 'Kokuo', 'Chomei', 'Saiken', 'Hachibi', 'Isobu', 'Matatabi', 'Obito'
];

const ENTITY_ASSETS = {
  kurama: { emoji: '🦊', gif: 'kurama.gif' },
  shukaku: { emoji: '🐾', gif: 'shukaku.gif' },
  songoku: { emoji: '🐵', gif: 'songoku.gif' },
  kokuo: { emoji: '🐎', gif: 'kokuo.gif' },
  chomei: { emoji: '🐛', gif: 'chomei.gif' },
  saiken: { emoji: '🐙', gif: 'saiken.gif' },
  hachibi: { emoji: '🐂', gif: 'hachibi.gif' },
  isobu: { emoji: '🌊', gif: 'isobu.gif' },
  matatabi: { emoji: '🔥', gif: 'matatabi.gif' },
  obito: { emoji: '🌀', gif: 'obito.gif' }
};

let fixedMessageId = null;
let bijuuStatus = {
  manha: Object.fromEntries(ENTITY_LIST.map(e => [e, ''])),
  tarde: Object.fromEntries(ENTITY_LIST.map(e => [e, '']))
};

function getCurrentDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function buildFixedMessage() {
  return {
    content: `**Registro de Bijuus e Bosses - ${getCurrentDate()}**`,
    embeds: [
      new EmbedBuilder()
        .setTitle('🌅 MANHÃ')
        .setColor('#00FFFF')
        .setDescription(ENTITY_LIST.map(e => `${e}: ${bijuuStatus.manha[e] || ''}`).join('\n')),
      new EmbedBuilder()
        .setTitle('🌇 TARDE')
        .setColor('#FFA500')
        .setDescription(ENTITY_LIST.map(e => `${e}: ${bijuuStatus.tarde[e] || ''}`).join('\n'))
    ]
  };
}

async function updateFixedMessage() {
  const channel = await client.channels.fetch(FIXED_MESSAGE_CHANNEL_ID);
  if (!fixedMessageId) {
    const msg = await channel.send(buildFixedMessage());
    fixedMessageId = msg.id;
  } else {
    const msg = await channel.messages.fetch(fixedMessageId).catch(() => null);
    if (msg) {
      await msg.edit(buildFixedMessage());
    } else {
      const newMsg = await channel.send(buildFixedMessage());
      fixedMessageId = newMsg.id;
    }
  }
}

cron.schedule('0 0 * * *', () => {
  bijuuStatus = {
    manha: Object.fromEntries(ENTITY_LIST.map(e => [e, ''])),
    tarde: Object.fromEntries(ENTITY_LIST.map(e => [e, '']))
  };
  updateFixedMessage();
}, { timezone: 'America/Sao_Paulo' });

async function sendAlert(entity, isNow) {
  const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
  const assets = ENTITY_ASSETS[entity.toLowerCase()];
  const embed = new EmbedBuilder()
    .setTitle(`${assets.emoji} ${entity} ${isNow ? 'APARECEU AGORA!' : 'irá spawnar em 10 minutos!'}`)
    .setColor(isNow ? '#FF0000' : '#00FF00');

  const attachment = new AttachmentBuilder(path.join(__dirname, 'gifs', assets.gif));

  await channel.send({
    embeds: [embed],
    files: [attachment]
  });
}

function scheduleAlert(entity, hour, minute) {
  const preMinute = minute - 10 < 0 ? 50 : minute - 10;
  const preHour = minute - 10 < 0 ? hour - 1 : hour;

  cron.schedule(`${preMinute} ${preHour} * * *`, () => sendAlert(entity, false), { timezone: 'America/Sao_Paulo' });
  cron.schedule(`${minute} ${hour} * * *`, () => sendAlert(entity, true), { timezone: 'America/Sao_Paulo' });
}

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // Moderar mensagens
  if (message.content.startsWith('!')) {
    if (/!(\w+)(manha|tarde)/i.test(message.content)) {
      setTimeout(() => message.delete().catch(() => {}), 2000);
    }
  } else {
    setTimeout(() => message.delete().catch(() => {}), 5000);
    return;
  }

  // Comando !comandos
  if (message.content === '!comandos') {
    const embed = new EmbedBuilder()
      .setTitle('📜 Lista de Comandos')
      .setColor('#5865F2')
      .setDescription(
        `**🦊 Comandos de Registro:**\n` +
        '`!kuramamanha @user`\n' +
        '`!kuramatarde @user`\n' +
        '(Funciona para qualquer bijuu ou boss)\n\n' +
        `**🔔 Alertas:**\n` +
        '`!testarbijuu kurama 10min/agora`\n' +
        '`!testarboss obito 10min/agora`\n\n' +
        `**ℹ️ Informação:**\n` +
        '`!comandos` - Lista de comandos\n'
      )
      .setFooter({ text: 'Exemplo: !kuramatarde @player' });

    message.reply({ embeds: [embed] });
  }

  // Registro de bijuus
  const registroMatch = message.content.match(/^!(\w+)(manha|tarde)\s+<@!?(\d+)>$/i);
  if (registroMatch) {
    const [, bijuuRaw, periodoRaw, userId] = registroMatch;
    const bijuu = bijuuRaw.charAt(0).toUpperCase() + bijuuRaw.slice(1).toLowerCase();
    const periodo = periodoRaw.toLowerCase();

    if (!ENTITY_LIST.includes(bijuu)) {
      message.reply('❌ Bijuu inválida').then(msg => setTimeout(() => msg.delete(), 5000));
      return;
    }

    bijuuStatus[periodo][bijuu] = `<@${userId}>`;
    updateFixedMessage();
  }

  // Testar alertas
  const testBijuu = message.content.match(/^!testarbijuu (\w+) (10min|agora)$/i);
  if (testBijuu) {
    const [, bijuu, time] = testBijuu;
    if (!ENTITY_ASSETS[bijuu.toLowerCase()]) {
      message.reply('❌ Bijuu inválida').then(msg => setTimeout(() => msg.delete(), 5000));
      return;
    }
    sendAlert(bijuu, time === 'agora');
  }

  const testBoss = message.content.match(/^!testarboss (\w+) (10min|agora)$/i);
  if (testBoss) {
    const [, boss, time] = testBoss;
    if (!ENTITY_ASSETS[boss.toLowerCase()]) {
      message.reply('❌ Boss inválido').then(msg => setTimeout(() => msg.delete(), 5000));
      return;
    }
    sendAlert(boss, time === 'agora');
  }
});

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  await updateFixedMessage();

  // Agendar bijuus
  scheduleAlert('Shukaku', 7, 30);
  scheduleAlert('Shukaku', 19, 30);
  scheduleAlert('Matatabi', 15, 30);
  scheduleAlert('Matatabi', 3, 30);
  scheduleAlert('Isobu', 14, 30);
  scheduleAlert('Isobu', 2, 30);
  scheduleAlert('Son Goku', 10, 0);
  scheduleAlert('Son Goku', 22, 0);
  scheduleAlert('Kokuo', 11, 0);
  scheduleAlert('Kokuo', 23, 0);
  scheduleAlert('Saiken', 12, 0);
  scheduleAlert('Saiken', 0, 0);
  scheduleAlert('Chomei', 11, 30);
  scheduleAlert('Chomei', 23, 30);
  scheduleAlert('Hachibi', 12, 30);
  scheduleAlert('Hachibi', 0, 30);
  scheduleAlert('Kurama', 17, 30);
  scheduleAlert('Kurama', 5, 30);

  // Agendar bosses
  scheduleAlert('Obito', 10, 25);
  scheduleAlert('Obito', 22, 25);
  scheduleAlert('Zetsu', 10, 30);
  scheduleAlert('Zetsu', 20, 30);
  scheduleAlert('Konan', 5, 0);
  scheduleAlert('Konan', 17, 0);
  scheduleAlert('Juugo', 4, 30);
  scheduleAlert('Juugo', 16, 30);
  scheduleAlert('Deidara', 6, 0);
  scheduleAlert('Deidara', 18, 0);
  scheduleAlert('Kakuzo', 7, 0);
  scheduleAlert('Kakuzo', 19, 0);
  scheduleAlert('Kisame', 4, 0);
  scheduleAlert('Kisame', 16, 0);
  scheduleAlert('Madara', 9, 45);
  scheduleAlert('Madara', 21, 45);

  console.log('⏰ Todos os alertas configurados!');
});

client.login(TOKEN);
