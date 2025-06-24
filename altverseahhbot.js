const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, Partials } = require('discord.js');
const cron = require('node-cron');
const express = require('express');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = "1386332436148912338";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const app = express();
app.get('/', (req, res) => res.send('Bot online!'));
app.listen(3000, () => console.log('✅ Servidor web iniciado.'));

const bijuus = ['Kurama', 'Shukaku', 'Son Goku', 'Kokuo', 'Chomei', 'Saiken', 'Hachibi', 'Isobu', 'Matatabi', 'Obito'];

let bijuuStatus = {
    manha: Object.fromEntries(bijuus.map(b => [b, ''])),
    tarde: Object.fromEntries(bijuus.map(b => [b, '']))
};

let bijuuMessageId = null;

// Função para obter data atual
function getFormattedDate() {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${
        (now.getMonth() + 1).toString().padStart(2, '0')}/${
        now.getFullYear()}`;
}

// Gerar embed da lista
function generateBijuuEmbed() {
    return new EmbedBuilder()
        .setTitle(`📜 Registro de Bijuus e Obito`)
        .setDescription(`Data: ${getFormattedDate()}`)
        .addFields(
            {
                name: '🌅 MANHÃ',
                value: bijuus.map(b => `${b}: ${bijuuStatus.manha[b] || '—'}`).join('\n'),
                inline: true
            },
            {
                name: '🌇 TARDE',
                value: bijuus.map(b => `${b}: ${bijuuStatus.tarde[b] || '—'}`).join('\n'),
                inline: true
            }
        )
        .setColor('#FFA500');
}

// Enviar ou atualizar a mensagem fixa
async function updateBijuuMessage() {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error('❌ Canal não encontrado.');

    const embed = generateBijuuEmbed();

    try {
        if (bijuuMessageId) {
            const msg = await channel.messages.fetch(bijuuMessageId);
            await msg.edit({ embeds: [embed] });
        } else {
            const msg = await channel.send({ embeds: [embed] });
            bijuuMessageId = msg.id;
        }
    } catch (e) {
        console.error('❌ Erro ao atualizar mensagem:', e);
    }
}

// Reset diário dos nomes e atualização da data
cron.schedule('0 0 * * *', () => {
    bijuuStatus = {
        manha: Object.fromEntries(bijuus.map(b => [b, ''])),
        tarde: Object.fromEntries(bijuus.map(b => [b, '']))
    };
    updateBijuuMessage();
    console.log('🔄 Reset diário realizado.');
}, { timezone: 'America/Sao_Paulo' });

// On Ready
client.once('ready', async () => {
    console.log(`🤖 Logado como ${client.user.tag}`);
    await updateBijuuMessage();
});

// Message Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Deletar mensagens que não sejam comandos após 5 segundos
    if (!message.content.startsWith('!')) {
        setTimeout(() => {
            message.delete().catch(() => {});
        }, 5000);
        return;
    }

    const content = message.content.toLowerCase();
    const args = content.split(' ');

    // Comandos para atualizar bijuu
    for (const bijuu of bijuus) {
        const cmdManha = `!${bijuu.toLowerCase()}manha`;
        const cmdTarde = `!${bijuu.toLowerCase()}tarde`;

        if (args[0] === cmdManha || args[0] === cmdTarde) {
            const periodo = args[0].includes('manha') ? 'manha' : 'tarde';
            const nome = message.mentions.users.first() 
                ? `<@${message.mentions.users.first().id}>`
                : args[1] || '—';

            bijuuStatus[periodo][bijuu] = nome;
            await updateBijuuMessage();

            // Deleta a mensagem de confirmação após 2 segundos
            setTimeout(() => {
                message.delete().catch(() => {});
            }, 2000);

            return;
        }
    }

    // Comando !comandos
    if (content === '!comandos') {
        const embed = new EmbedBuilder()
            .setTitle('📜 Comandos Disponíveis')
            .setColor('#5865F2')
            .setDescription(
                bijuus.map(b => 
                    `\`!${b.toLowerCase()}manha @player\` ou \`!${b.toLowerCase()}tarde @player\``
                ).join('\n') + 
                '\n\n⏰ Os registros são resetados automaticamente todos os dias à meia-noite.'
            );
        await message.reply({ embeds: [embed] });
    }
});

client.login(TOKEN);