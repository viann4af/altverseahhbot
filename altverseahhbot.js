const Discord = require('discord.js');
const cron = require('node-cron');
const express = require('express');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent
    ]
});

// Configurações
const ALERT_CHANNEL_ID = '1354149129122742347';
const TABLE_CHANNEL_ID = '1386332436148912338';
const ADMIN_ROLE_ID = '1353134278564909076';

let tabelaMessageId = null;

// Lista de bijuus e bosses
const ENTIDADES = ['Kurama', 'Shukaku', 'Son Goku', 'Kokuo', 'Chomei', 'Saiken', 'Hachibi', 'Isobu', 'Matatabi', 'Obito'];

let tabela = {
    manha: Object.fromEntries(ENTIDADES.map(e => [e, ''])),
    tarde: Object.fromEntries(ENTIDADES.map(e => [e, '']))
};

// ✔️ Função para gerar a tabela formatada
function gerarTabela() {
    const data = new Date();
    const dataFormatada = data.toLocaleDateString('pt-BR');

    const manha = ENTIDADES.map(e => `${e}: ${tabela.manha[e] || ''}`).join('\n');
    const tarde = ENTIDADES.map(e => `${e}: ${tabela.tarde[e] || ''}`).join('\n');

    return `📅 ${dataFormatada}

**🕗 MANHÃ**\n${manha}

**🕓 TARDE**\n${tarde}`;
}

// ✔️ Atualiza a mensagem fixa da tabela
async function atualizarTabela() {
    const canal = await client.channels.fetch(TABLE_CHANNEL_ID);
    if (!canal) return console.log('❌ Canal não encontrado.');

    try {
        const mensagem = await canal.messages.fetch(tabelaMessageId);
        mensagem.edit(gerarTabela());
    } catch {
        const msg = await canal.send(gerarTabela());
        tabelaMessageId = msg.id;
        fs.writeFileSync('tabela.json', JSON.stringify({ id: tabelaMessageId }));
    }
}

// ✔️ Reseta tabela diariamente
cron.schedule('0 0 * * *', () => {
    tabela = {
        manha: Object.fromEntries(ENTIDADES.map(e => [e, ''])),
        tarde: Object.fromEntries(ENTIDADES.map(e => [e, '']))
    };
    atualizarTabela();
    console.log('🔄 Tabela resetada.');
}, { timezone: 'America/Sao_Paulo' });

// ✔️ Sistema de Alertas
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
    { nome: 'Obito', horas: [10, 22], minutos: [25, 25] }
];

function enviarAlerta(nome, texto) {
    const canal = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (!canal) return;
    const gifPath = path.join(__dirname, 'gifs', `${nome.toLowerCase()}.gif`);
    const gif = fs.existsSync(gifPath) ? { files: [gifPath] } : {};
    canal.send({
        content: `🔔 **${nome} ${texto}**`,
        ...gif
    });
}

client.on('ready', async () => {
    console.log(`✅ Bot logado como ${client.user.tag}`);

    // Carregar tabela fixa
    try {
        const saved = JSON.parse(fs.readFileSync('tabela.json'));
        tabelaMessageId = saved.id;
        atualizarTabela();
    } catch {
        console.log('⚠️ Nenhuma tabela encontrada, criando nova...');
    }

    // Agendar alertas
    for (const alerta of ALERTS) {
        alerta.horas.forEach((h, i) => {
            const m = alerta.minutos[i];

            cron.schedule(`${(m - 10 + 60) % 60} ${(h - (m < 10 ? 1 : 0) + 24) % 24} * * *`, () => {
                enviarAlerta(alerta.nome, 'spawna em 10 minutos!');
            }, { timezone: 'America/Sao_Paulo' });

            cron.schedule(`${m} ${h} * * *`, () => {
                enviarAlerta(alerta.nome, 'SPAWNOU AGORA!');
            }, { timezone: 'America/Sao_Paulo' });
        });
    }
});

// ✔️ Sistema de comandos
client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;

    // 🔒 Sistema de deletar mensagens
    if (msg.channel.id === TABLE_CHANNEL_ID) {
        if (!msg.content.startsWith('!')) {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
        } else if (/!(\w+)(manha|tarde)/i.test(msg.content)) {
            setTimeout(() => msg.delete().catch(() => {}), 2000);
        }
    }

    const comando = msg.content.toLowerCase();

    // 🛠️ Comando de atualização da tabela
    const match = comando.match(/^!(\w+)(manha|tarde)\s*(<@!?(\d+)>|\S+)?/i);
    if (match) {
        const entidade = ENTIDADES.find(e => e.toLowerCase() === match[1]);
        const periodo = match[2];
        const nome = msg.mentions.users.first()?.username || match[3]?.replace(/<@!?(\d+)>/, '') || '';

        if (!entidade) return msg.reply('❌ Entidade inválida.');

        tabela[periodo][entidade] = nome;
        atualizarTabela();
        return;
    }

    // 📜 Comando de ajuda
    if (comando === '!comandos') {
        const embed = new Discord.EmbedBuilder()
            .setTitle('📜 Lista de Comandos')
            .setColor('#5865F2')
            .addFields(
                { name: '⚙️ Tabela', value: '`!kuramamanha @user`\n`!shukakutarde @user`\n(Edita a tabela)' },
                { name: '⏰ Alertas', value: 'Alertas automáticos 10 minutos antes e no spawn' },
                { name: 'ℹ️ Info', value: '`!comandos` - Lista de comandos' }
            )
            .setFooter({ text: 'Use os comandos no canal da tabela! 👇' });
        msg.reply({ embeds: [embed] });
    }
});

client.login(TOKEN);

// ✔️ Webserver para manter online no Koyeb
const app = express();
app.get('/', (req, res) => res.send('Bot Online!'));
app.listen(process.env.PORT || 3000, () => console.log('🌐 Webserver iniciado'));
