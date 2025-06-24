const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs').promises;
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

// IDs dos canais
const ALERT_CHANNEL_ID = '1354149129122742347';
const TABLE_CHANNEL_ID = '1386332436148912338';

// Lista das bijuus/bosses com nomes normalizados
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

// Cache de cargos (roles) - será preenchido quando o bot iniciar
let rolesCache = new Map();

// Mapeamento para comandos (aceitar variações)
const ENTIDADE_ALIASES = {
  'kurama': 'Kurama',
  'shukaku': 'Shukaku',
  'songoku': 'Son Goku',
  'son': 'Son Goku',
  'goku': 'Son Goku',
  'kokuo': 'Kokuo',
  'chomei': 'Chomei',
  'saiken': 'Saiken',
  'hachibi': 'Hachibi',
  'isobu': 'Isobu',
  'matatabi': 'Matatabi',
  'obito': 'Obito',
};

// Estrutura da tabela
let tabela = {
  manha: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
  tarde: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
};

let tabelaMessageId = null;

// Sistema de alertas corrigido
const ALERTS = [
  { nome: 'Kurama', horarios: [{ h: 17, m: 30 }, { h: 5, m: 30 }] },
  { nome: 'Shukaku', horarios: [{ h: 7, m: 30 }, { h: 19, m: 30 }] },
  { nome: 'Son Goku', horarios: [{ h: 10, m: 0 }, { h: 22, m: 0 }] },
  { nome: 'Kokuo', horarios: [{ h: 11, m: 0 }, { h: 23, m: 0 }] },
  { nome: 'Chomei', horarios: [{ h: 11, m: 30 }, { h: 23, m: 30 }] },
  { nome: 'Saiken', horarios: [{ h: 12, m: 0 }, { h: 0, m: 0 }] },
  { nome: 'Hachibi', horarios: [{ h: 12, m: 30 }, { h: 0, m: 30 }] },
  { nome: 'Isobu', horarios: [{ h: 14, m: 30 }, { h: 2, m: 30 }] },
  { nome: 'Matatabi', horarios: [{ h: 15, m: 30 }, { h: 3, m: 30 }] },
  { nome: 'Obito', horarios: [{ h: 10, m: 25 }, { h: 22, m: 25 }] },
];

// Função para gerar texto da tabela melhorada
function gerarTabela() {
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let tabelaTexto = `📅 **TABELA DE BIJUUS - ${dataFormatada}**\n\n`;
  tabelaTexto += '```';
  tabelaTexto += '┌─────────────┬─────────────┬─────────────┐\n';
  tabelaTexto += '│   BIJUU     │    MANHÃ    │    TARDE    │\n';
  tabelaTexto += '├─────────────┼─────────────┼─────────────┤\n';

  ENTIDADES.forEach((entidade) => {
    const manha = tabela.manha[entidade] || '---';
    const tarde = tabela.tarde[entidade] || '---';
    
    const entidadeFormatada = entidade.padEnd(11);
    const manhaFormatada = manha.substring(0, 11).padEnd(11);
    const tardeFormatada = tarde.substring(0, 11).padEnd(11);
    
    tabelaTexto += `│ ${entidadeFormatada} │ ${manhaFormatada} │ ${tardeFormatada} │\n`;
  });

  tabelaTexto += '└─────────────┴─────────────┴─────────────┘';
  tabelaTexto += '```\n';
  tabelaTexto += '\n🔸 **Como usar:** `!nomedabijuu + periodo + @usuario`\n';
  tabelaTexto += '🔸 **Exemplo:** `!kuramamanha @João` ou `!shukakutarde @Maria`\n';
  tabelaTexto += '🔸 **Comandos:** Digite `!comandos` para ver todos os comandos';

  return tabelaTexto;
}

// Atualizar tabela com tratamento de erro melhorado
async function atualizarTabela() {
  try {
    const canal = await client.channels.fetch(TABLE_CHANNEL_ID);
    if (!canal) {
      console.error('❌ Canal da tabela não encontrado.');
      return;
    }

    let mensagem = null;
    
    if (tabelaMessageId) {
      try {
        mensagem = await canal.messages.fetch(tabelaMessageId);
      } catch (error) {
        console.log('⚠️ Mensagem da tabela não encontrada, criando nova...');
        tabelaMessageId = null;
      }
    }

    const conteudoTabela = gerarTabela();

    if (mensagem) {
      await mensagem.edit(conteudoTabela);
      console.log('✅ Tabela atualizada com sucesso');
    } else {
      const novaMsg = await canal.send(conteudoTabela);
      tabelaMessageId = novaMsg.id;
      await salvarTabelaId();
      console.log('✅ Nova tabela criada com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar tabela:', error);
  }
}

// Salvar ID da tabela
async function salvarTabelaId() {
  try {
    await fs.writeFile('tabela.json', JSON.stringify({ id: tabelaMessageId, data: new Date().toISOString() }));
  } catch (error) {
    console.error('❌ Erro ao salvar ID da tabela:', error);
  }
}

// Carregar cache de cargos
async function carregarRoles() {
  try {
    // Buscar o primeiro servidor (guild) do bot
    const guild = client.guilds.cache.first();
    if (!guild) {
      console.log('⚠️ Nenhum servidor encontrado');
      return;
    }

    console.log('🔄 Carregando cargos do servidor...');
    
    // Buscar todos os cargos
    await guild.roles.fetch();
    
    // Mapear cargos das bijuus
    ENTIDADES.forEach(entidade => {
      const role = guild.roles.cache.find(r => r.name.toLowerCase() === entidade.toLowerCase());
      if (role) {
        rolesCache.set(entidade, role.id);
        console.log(`✅ Cargo encontrado: ${entidade} (${role.id})`);
      } else {
        console.log(`⚠️ Cargo não encontrado: ${entidade}`);
      }
    });
    
    console.log(`📋 Total de cargos carregados: ${rolesCache.size}/${ENTIDADES.length}`);
  } catch (error) {
    console.error('❌ Erro ao carregar cargos:', error);
  }
}

// Carregar ID da tabela
async function carregarTabelaId() {
  try {
    const data = await fs.readFile('tabela.json', 'utf8');
    const parsed = JSON.parse(data);
    tabelaMessageId = parsed.id;
    console.log('✅ ID da tabela carregado:', tabelaMessageId);
  } catch (error) {
    console.log('⚠️ Arquivo tabela.json não encontrado, será criado automaticamente');
    tabelaMessageId = null;
  }
}

// Função para remover cargo de bijuu de todos os membros
async function removerCargoTodosMembros(nomeEntidade) {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const roleId = rolesCache.get(nomeEntidade);
    if (!roleId) {
      console.log(`⚠️ Cargo não encontrado para ${nomeEntidade}`);
      return;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      console.log(`⚠️ Cargo ${nomeEntidade} não existe mais no servidor`);
      return;
    }

    // Buscar membros com esse cargo
    const membrosComCargo = role.members;
    
    if (membrosComCargo.size === 0) {
      console.log(`✅ Nenhum membro possui o cargo ${nomeEntidade}`);
      return;
    }

    console.log(`🔄 Removendo cargo ${nomeEntidade} de ${membrosComCargo.size} membro(s)...`);
    
    for (const [memberId, member] of membrosComCargo) {
      try {
        await member.roles.remove(role);
        console.log(`✅ Cargo ${nomeEntidade} removido de ${member.displayName}`);
      } catch (error) {
        console.error(`❌ Erro ao remover cargo de ${member.displayName}:`, error);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao remover cargo ${nomeEntidade}:`, error);
  }
}

// Função para dar cargo de bijuu para um membro
async function darCargoMembro(nomeEntidade, userId) {
  try {
    const guild = client.guilds.cache.first();
    if (!guild) return false;

    const roleId = rolesCache.get(nomeEntidade);
    if (!roleId) {
      console.log(`⚠️ Cargo não encontrado para ${nomeEntidade}`);
      return false;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      console.log(`⚠️ Cargo ${nomeEntidade} não existe mais no servidor`);
      return false;
    }

    const member = await guild.members.fetch(userId);
    if (!member) {
      console.log(`⚠️ Membro não encontrado: ${userId}`);
      return false;
    }

    // Primeiro remover o cargo de todos os outros membros
    await removerCargoTodosMembros(nomeEntidade);
    
    // Depois dar o cargo para o novo membro
    await member.roles.add(role);
    console.log(`✅ Cargo ${nomeEntidade} dado para ${member.displayName}`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao dar cargo ${nomeEntidade}:`, error);
    return false;
  }
}
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Iniciando reset diário da tabela...');
  
  tabela = {
    manha: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
    tarde: Object.fromEntries(ENTIDADES.map((e) => [e, ''])),
  };
  
  await atualizarTabela();
  console.log('✅ Tabela resetada diariamente às 00:00');
}, { 
  timezone: 'America/Sao_Paulo',
  scheduled: true 
});

// Enviar alerta melhorado com menção ao cargo
async function enviarAlerta(nome, texto, isSpawn = false) {
  try {
    const canal = client.channels.cache.get(ALERT_CHANNEL_ID);
    if (!canal) {
      console.error('❌ Canal de alertas não encontrado');
      return;
    }

    const emoji = isSpawn ? '🚨' : '⏰';
    const cor = isSpawn ? 0xff0000 : 0xffa500;
    
    // Buscar cargo da bijuu para mencionar
    const roleId = rolesCache.get(nome);
    const mencaoRole = roleId ? `<@&${roleId}>` : '';
    
    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ALERTA DE BIJUU`)
      .setDescription(`**${nome}** ${texto}`)
      .setColor(cor)
      .setFooter({ text: 'Use os comandos apenas no canal da tabela | Cargos são gerenciados automaticamente' })

    // Mensagem com menção ao cargo
    const mensagemTexto = mencaoRole ? `${mencaoRole}\n` : '';

    const messageOptions = { 
      content: mensagemTexto,
      embeds: [embed] 
    };
    
    // Tentar adicionar GIF se existir
    const gifPath = path.join(__dirname, 'gifs', `${nome.toLowerCase()}.gif`);
    try {
      await fs.access(gifPath);
      const attachment = new AttachmentBuilder(gifPath);
      messageOptions.files = [attachment];
      embed.setImage(`attachment://${nome.toLowerCase()}.gif`);
    } catch {
      // GIF não existe, continuar sem ele
    }

    await canal.send(messageOptions);
    console.log(`✅ Alerta enviado: ${nome} - ${texto} ${roleId ? '(com menção ao cargo)' : '(sem cargo)'}`);
    
  } catch (error) {
    console.error('❌ Erro ao enviar alerta:', error);
  }
}

// Agendar alertas CORRIGIDO
function agendarAlertas() {
  console.log('📅 Agendando alertas...');
  
  ALERTS.forEach((alerta) => {
    alerta.horarios.forEach((horario) => {
      const { h, m } = horario;
      
      // Calcular horário 10 minutos antes
      let horaAntes = h;
      let minutoAntes = m - 10;
      
      if (minutoAntes < 0) {
        minutoAntes += 60;
        horaAntes = (horaAntes - 1 + 24) % 24;
      }

      // Agendar alerta 10 minutos antes
      const cronAntes = `${minutoAntes} ${horaAntes} * * *`;
      cron.schedule(cronAntes, () => {
        enviarAlerta(alerta.nome, 'spawna em **10 minutos**! 🔔', false);
      }, { 
        timezone: 'America/Sao_Paulo',
        scheduled: true 
      });

      // Agendar alerta no spawn exato
      const cronSpawn = `${m} ${h} * * *`;
      cron.schedule(cronSpawn, () => {
        enviarAlerta(alerta.nome, '**SPAWNOU AGORA!** 💥', true);
      }, { 
        timezone: 'America/Sao_Paulo',
        scheduled: true 
      });

      console.log(`✅ Alertas agendados para ${alerta.nome}: ${h}:${m.toString().padStart(2, '0')}`);
    });
  });
}

// Quando bot ficar online
client.on('ready', async () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
  console.log(`📊 Servindo ${client.guilds.cache.size} servidor(es)`);
  
  await carregarRoles(); // Carregar cargos primeiro
  await carregarTabelaId();
  await atualizarTabela();
  agendarAlertas();
  
  // Definir status do bot
  client.user.setActivity('Bijuus no Naruto', { type: 'WATCHING' });
  
  console.log('✅ Bot totalmente inicializado!');
});

// Tratamento de mensagens MELHORADO
client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;

  // Moderação do canal da tabela
  if (msg.channel.id === TABLE_CHANNEL_ID) {
    const conteudo = msg.content.toLowerCase().trim();
    
    // Se não for comando, apagar em 5 segundos
    if (!conteudo.startsWith('!')) {
      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 5000);
      return;
    }

    // Se for comando de bijuu, apagar em 3 segundos (tempo para processar)
    if (/^!(kurama|shukaku|songoku|son|goku|kokuo|chomei|saiken|hachibi|isobu|matatabi|obito)(manha|tarde)/i.test(conteudo)) {
      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 3000);
    }
  }

  // Processar comandos
  await processarComandos(msg);
});

// Função para processar comandos MELHORADA
async function processarComandos(msg) {
  const conteudo = msg.content.toLowerCase().trim();
  
  // Comando de ajuda
  if (conteudo === '!comandos' || conteudo === '!help' || conteudo === '!ajuda') {
    const embed = new EmbedBuilder()
      .setTitle('📜 Lista de Comandos do Bot')
      .setColor(0x00ff00)
      .addFields(
        {
          name: '⚔️ Registrar Kill de Bijuu',
          value: '`!nomedabijuu + periodo + @usuario`\n' +
                 '**Exemplos:**\n' +
                 '• `!kuramamanha @João`\n' +
                 '• `!shukakutarde @Maria`\n' +
                 '• `!songokumanha @Pedro`',
          inline: false
        },
        {
          name: '🐾 Bijuus Disponíveis',
          value: ENTIDADES.map(e => `• ${e}`).join('\n'),
          inline: true
        },
        {
          name: '🏷️ Sistema de Cargos',
          value: '• Quem mata ganha o cargo da bijuu\n• Cargo é removido dos outros\n• Alertas mencionam o cargo',
          inline: true
        },
        {
          name: '🕐 Períodos',
          value: '• `manha` - Período da manhã\n• `tarde` - Período da tarde',
          inline: false
        },
        {
          name: '⏰ Alertas Automáticos',
          value: 'O bot envia alertas:\n• 10 min antes do spawn\n• No momento exato do spawn\n• Menciona o cargo da bijuu',
          inline: false
        },
      )
        {
          name: '📋 Outros Comandos',
          value: '• `!comandos` - Mostra esta lista\n• `!horarios` - Mostra horários de spawn\n• `!cargos` - Lista cargos carregados',
          inline: false
        }
      .setTimestamp();

      .setTimestamp();

    try {
      await msg.reply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Erro ao enviar comandos:', error);
    }
    return;
  }

  // Comando de cargos
  if (conteudo === '!cargos' || conteudo === '!roles') {
    let cargosTexto = '🏷️ **STATUS DOS CARGOS**\n\n';
    
    if (rolesCache.size === 0) {
      cargosTexto += '❌ Nenhum cargo foi encontrado.\n';
      cargosTexto += 'Certifique-se que existem cargos com os mesmos nomes das bijuus no servidor.';
    } else {
      ENTIDADES.forEach((entidade) => {
        const roleId = rolesCache.get(entidade);
        if (roleId) {
          cargosTexto += `✅ **${entidade}**: <@&${roleId}>\n`;
        } else {
          cargosTexto += `❌ **${entidade}**: Cargo não encontrado\n`;
        }
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🏷️ Status dos Cargos')
      .setDescription(cargosTexto)
      .setColor(0x9932cc)
      .setFooter({ text: 'Os cargos devem ter exatamente o mesmo nome das bijuus' })
      .setTimestamp();

    try {
      await msg.reply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Erro ao enviar cargos:', error);
    }
    return;
  }

  // Comando de horários
  if (conteudo === '!horarios' || conteudo === '!spawns') {
    let horariosTexto = '📅 **HORÁRIOS DE SPAWN DAS BIJUUS**\n\n';
    
    ALERTS.forEach((alerta) => {
      horariosTexto += `🐾 **${alerta.nome}:**\n`;
      alerta.horarios.forEach((horario, index) => {
        const periodo = index === 0 ? 'Manhã' : 'Tarde';
        horariosTexto += `   • ${periodo}: ${horario.h.toString().padStart(2, '0')}:${horario.m.toString().padStart(2, '0')}\n`;
      });
      horariosTexto += '\n';
    });

    const embed = new EmbedBuilder()
      .setTitle('⏰ Horários de Spawn')
      .setDescription(horariosTexto)
      .setColor(0x0099ff)
      .setTimestamp();

    try {
      await msg.reply({ embeds: [embed] });
    } catch (error) {
      console.error('❌ Erro ao enviar horários:', error);
    }
    return;
  }

  // Processar comandos de bijuu
  const match = conteudo.match(/^!(\w+)(manha|tarde)\s*(<@!?(\d+)>|\S+)?/i);
  if (match) {
    const entidadeInput = match[1];
    const periodo = match[2];
    const usuarioMention = msg.mentions.users.first();
    const nomeTexto = match[3];

    // Encontrar entidade usando aliases
    const entidadeReal = ENTIDADE_ALIASES[entidadeInput] || 
                        ENTIDADES.find(e => e.toLowerCase() === entidadeInput);

    if (!entidadeReal) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Bijuu Inválida')
        .setDescription(`A bijuu **${entidadeInput}** não foi encontrada.\n\n` +
                       `**Bijuus disponíveis:**\n${ENTIDADES.map(e => `• ${e.toLowerCase()}`).join('\n')}`)
        .setColor(0xff0000);

      try {
        await msg.reply({ embeds: [embed] });
      } catch (error) {
        console.error('❌ Erro ao enviar erro de bijuu:', error);
      }
      return;
    }

    // Determinar nome do usuário
    let nomeUsuario = '';
    let userId = null;
    
    if (usuarioMention) {
      nomeUsuario = usuarioMention.displayName || usuarioMention.username;
      userId = usuarioMention.id;
    } else if (nomeTexto && !nomeTexto.startsWith('<@')) {
      nomeUsuario = nomeTexto.replace(/[<>@!]/g, '');
      // Se não foi mencionado, usar o próprio autor do comando
      userId = msg.author.id;
    } else {
      nomeUsuario = msg.author.displayName || msg.author.username;
      userId = msg.author.id;
    }

    // Atualizar tabela
    tabela[periodo][entidadeReal] = nomeUsuario;
    await atualizarTabela();

    // Gerenciar cargo da bijuu
    let cargoAtualizado = false;
    if (userId) {
      cargoAtualizado = await darCargoMembro(entidadeReal, userId);
    }

    // Confirmação
    const embed = new EmbedBuilder()
      .setTitle('✅ Bijuu Registrada')
      .setDescription(`**${entidadeReal}** (${periodo}) foi registrada para **${nomeUsuario}**` +
                     (cargoAtualizado ? `\n🏷️ Cargo **${entidadeReal}** atribuído!` : ''))
      .setColor(0x00ff00)
      .setTimestamp();

    try {
      const confirmacao = await msg.reply({ embeds: [embed] });
      // Apagar confirmação após 5 segundos
      setTimeout(() => {
        confirmacao.delete().catch(() => {});
      }, 5000);
    } catch (error) {
      console.error('❌ Erro ao enviar confirmação:', error);
    }
  }
}

// Tratamento de erros
client.on('error', (error) => {
  console.error('❌ Erro do cliente Discord:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

// Servidor web para Koyeb
const app = express();

app.get('/', (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  res.json({
    status: 'online',
    bot: client.user?.tag || 'Carregando...',
    uptime: `${hours}h ${minutes}m`,
    servers: client.guilds.cache.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    ready: client.isReady(),
    ping: client.ws.ping 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor web rodando na porta ${PORT}`);
});

// Login do bot
if (!TOKEN) {
  console.error('❌ TOKEN não encontrado nas variáveis de ambiente!');
  process.exit(1);
}

client.login(TOKEN).catch((error) => {
  console.error('❌ Erro ao fazer login:', error);
  process.exit(1);
});