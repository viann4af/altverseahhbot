const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const express = require('express');

const TOKEN = process.env.TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// IDs fixos
const ALERT_CHANNEL_ID = '1354149129122742347'; // Canal dos alertas
const TABLE_CHANNEL_ID = '1386332436148912338'; // Canal da tabela fixa

// Lista das bijuus/bosses
const ENTIDADES = [
  'Kurama',
  'Shukaku',
  'Son Goku',
  'Kokuo',
  'Chomei',
  'Saiken',
  'Hachibi',
  'Isobu',
  'Matatabi',
  'Obito',
];

// Estrutura da tabela (manhã e tarde)
let tabela = {
  manha: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
  tarde: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
};

let tabelaMessageId = null;

// Função para gerar texto da tabela lado a lado (compacta)
function gerarTabela() {
  const data = new Date();
  const dataFormatada = data.toLocaleDateString('pt-BR');

  // Colunas para manhã e tarde
  const manhaLinhas = ENTIDADES.map((e) => `${e}: ${tabela.manha[e] || ''}`);
  const tardeLinhas = ENTIDADES.map((e) => `${e}: ${tabela.tarde[e] || ''}`);

  // Montar colunas lado a lado (ajustando espaços)
  const linhas = manhaLinhas.map((m, i) => {
    const t = tardeLinhas[i];
    // Ajustar tamanho da coluna manhã para 20 chars (exemplo)
    return m.padEnd(20, ' ') + '   ' + t;
  });

  return `📅 ${dataFormatada}\n\n` +
         `**MANHÃ**         |         **TARDE**\n` +
         `--------------------|--------------------\n` +
         linhas.join('\n');
}

// Atualiza a mensagem fixa ou cria ela se não existir
async function atualizarTabela() {
  try {
    const canal = await client.channels.fetch(TABLE_CHANNEL_ID);
    if (!canal) return console.log('Canal da tabela não encontrado.');

    let mensagem;
    if (tabelaMessageId) {
      mensagem = await canal.messages.fetch(tabelaMessageId).catch(() => null);
    }

    if (mensagem) {
      await mensagem.edit(gerarTabela());
    } else {
      const novaMsg = await canal.send(gerarTabela());
      tabelaMessageId = novaMsg.id;
      fs.writeFileSync('tabela.json', JSON.stringify({ id: tabelaMessageId }));
    }
  } catch (err) {
    console.error('Erro ao atualizar tabela:', err);
  }
}

// Carregar ID da mensagem fixa do arquivo tabela.json
function carregarTabelaId() {
  try {
    const data = fs.readFileSync('tabela.json', 'utf8');
    tabelaMessageId = JSON.parse(data).id;
  } catch {
    tabelaMessageId = null;
  }
}

// Reset diário da tabela e atualizar mensagem
cron.schedule('0 0 * * *', () => {
  tabela = {
    manha: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
    tarde: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
  };
  atualizarTabela();
  console.log('Tabela resetada diariamente.');
}, { timezone: 'America/Sao_Paulo' });

// Sistema de alertas (com GIFs)
const ALERTS = [
  { nome: 'Kurama', horas: [17, 5], minutos: [30, 30] },
  { nome: 'Shukaku', horas: [7, 19], minutos: [30, 30] },
  { nome: 'Son Goku', horas: [10, 22], minutos: [0, 0] },
  { nome: 'Kokuo', horas: [11, 23], minutos: [0, 0] },
  { nome: 'Chomei', horas: [11, 23], minutos: [30, 30] },
  { nome: 'Saiken', horas: [12, 0], minutos: [0, 0] },
  { nome: 'Hachibi', horas: [12, 0], minutos: [30, 30] },
  { nome: 'Isobu', horas: [14, 2], minutos: [30, 30] },
  { nome: 'Matatabi', horas: [15, 3], minutos: [30, 30] },
  { nome: 'Obito', horas: [10, 22], minutos: [25, 25] },
];

// Enviar alerta no canal de alertas com GIF (se existir)
function enviarAlerta(nome, texto) {
  const canal = client.channels.cache.get(ALERT_CHANNEL_ID);
  if (!canal) return;
  const gifPath = path.join(__dirname, 'gifs', `${nome.toLowerCase()}.gif`);
  const opcaoGif = fs.existsSync(gifPath) ? { files: [gifPath] } : {};
  canal.send({
    content: `🔔 **${nome} ${texto}**`,
    ...opcaoGif,
  });
}

// Agendar alertas 10 minutos antes e no spawn
function agendarAlertas() {
  for (const alerta of ALERTS) {
    alerta.horas.forEach((h, i) => {
      const m = alerta.minutos[i];
      // Alerta 10 min antes (ajustando para o minuto correto)
      const minAntes = (m - 10 + 60) % 60;
      const horaAntes = m < 10 ? (h + 23) % 24 : h;

      cron.schedule(`${minAntes} ${horaAntes} * * *`, () => {
        enviarAlerta(alerta.nome, 'spawna em 10 minutos!');
      }, { timezone: 'America/Sao_Paulo' });

      // Alerta exato do spawn
      cron.schedule(`${m} ${h} * * *`, () => {
        enviarAlerta(alerta.nome, 'SPAWNOU AGORA!');
      }, { timezone: 'America/Sao_Paulo' });
    });
  }
}

// Quando bot ficar online
client.on('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  carregarTabelaId();
  atualizarTabela();
  agendarAlertas();
});

// Moderação de mensagens no canal da tabela
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  if (msg.channel.id === TABLE_CHANNEL_ID) {
    // Se não for comando (!), apaga em 5s
    if (!msg.content.startsWith('!')) {
      setTimeout(() => msg.delete().catch(() => {}), 5000);
      return;
    }
    // Se for comando de bijuu (ex: !hachibitarde), apaga em 2s
    if (/!(\w+)(manha|tarde)/i.test(msg.content)) {
      setTimeout(() => msg.delete().catch(() => {}), 2000);
      return;
    }
  }

  // Processar comandos de bijuu
  const comando = msg.content.toLowerCase();
  const match = comando.match(/^!(\w+)(manha|tarde)\s*(<@!?(\d+)>|\S+)?/i);
  if (match) {
    const entidade = ENTIDADES.find((e) => e.toLowerCase() === match[1]);
    const periodo = match[2];
    const nome = msg.mentions.users.first()?.username || match[3]?.replace(/<@!?(\d+)>/, '') || '';

    if (!entidade) {
      msg.reply('❌ Entidade inválida. Use o nome correto da bijuu.');
      return;
    }

    tabela[periodo][entidade] = nome;
    await atualizarTabela();
    return;
  }

  // Comando de ajuda
  if (comando === '!comandos') {
    const embed = new EmbedBuilder()
      .setTitle('📜 Lista de Comandos')
      .setColor('#5865F2')
      .addFields(
        {
          name: '⚙️ Atualizar tabela',
          value:
            '`!kuramamanha @user`\n`!shukakutarde @user`\n\nUse o nome correto da bijuu, seguido de "manha" ou "tarde" e mencione o usuário que matou.',
        },
        { name: '⏰ Alertas automáticos', value: 'Alertas enviados 10 minutos antes e no spawn.' },
        { name: 'ℹ️ Informações', value: '`!comandos` - Mostra essa lista de comandos.' }
      )
      .setFooter({ text: 'Use os comandos apenas no canal da tabela.' });

    msg.reply({ embeds: [embed] });
  }
});

// Rodar webserver para manter online no Koyeb
const app = express();
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Webserver iniciado'));

// Login
client.login(TOKEN);
