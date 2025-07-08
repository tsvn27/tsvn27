import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';

const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID; // Opcional, para roles

let client: Client | null = null;
let clientReady = false;

if (!botToken) {
  console.warn('DISCORD_BOT_TOKEN não definido. Funcionalidades do bot do Discord estarão desabilitadas.');
} else {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // Necessário para buscar membros e adicionar roles
      GatewayIntentBits.DirectMessages, // Necessário para enviar DMs
    ],
    partials: [Partials.Channel, Partials.User], // Necessário para DMs
  });

  client.once('ready', () => {
    console.log(`Bot do Discord conectado como ${client?.user?.tag}!`);
    clientReady = true;
  });

  client.login(botToken).catch(err => {
    console.error('Falha ao conectar o bot do Discord:', err);
    client = null; // Define como null se o login falhar
  });
}

/**
 * Envia uma Mensagem Direta (DM) para um usuário do Discord.
 * @param discordUserId O ID do usuário do Discord.
 * @param message O conteúdo da mensagem a ser enviada.
 */
export async function sendDirectMessage(discordUserId: string, message: string): Promise<boolean> {
  if (!client || !clientReady) {
    console.error('Bot do Discord não está conectado ou pronto. Não é possível enviar DM.');
    return false;
  }
  try {
    const user = await client.users.fetch(discordUserId);
    if (!user) {
      console.error(`Usuário do Discord com ID ${discordUserId} não encontrado.`);
      return false;
    }
    await user.send(message);
    console.log(`DM enviada para ${user.tag} (ID: ${discordUserId})`);
    return true;
  } catch (error) {
    console.error(`Falha ao enviar DM para o usuário ${discordUserId}:`, error);
    return false;
  }
}

/**
 * Adiciona uma role a um membro em um servidor do Discord.
 * @param discordUserId O ID do usuário do Discord.
 * @param roleId O ID da role a ser adicionada.
 */
export async function addRoleToUser(discordUserId: string, roleId: string): Promise<boolean> {
  if (!client || !clientReady) {
    console.error('Bot do Discord não está conectado ou pronto. Não é possível adicionar role.');
    return false;
  }
  if (!guildId) {
    console.error('DISCORD_GUILD_ID não definido. Não é possível adicionar role sem o ID do servidor.');
    return false;
  }

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
      console.error(`Servidor Discord com ID ${guildId} não encontrado.`);
      return false;
    }
    const member = await guild.members.fetch(discordUserId);
    if (!member) {
      console.error(`Membro com ID ${discordUserId} não encontrado no servidor ${guildId}.`);
      return false;
    }
    const role = await guild.roles.fetch(roleId);
    if (!role) {
      console.error(`Role com ID ${roleId} não encontrada no servidor ${guildId}.`);
      return false;
    }

    await member.roles.add(role);
    console.log(`Role '${role.name}' adicionada ao membro ${member.user.tag} no servidor ${guild.name}.`);
    return true;
  } catch (error) {
    console.error(`Falha ao adicionar role ${roleId} ao usuário ${discordUserId} no servidor ${guildId}:`, error);
    return false;
  }
}

// Exemplo de como obter o ID do Discord de um usuário do nosso sistema:
// Esta função é mais um lembrete de como os dados podem ser ligados.
// A chamada real virá do webhook que já tem o order.userId.
/*
async function getDiscordIdFromAppUserId(appUserId: string): Promise<string | null> {
  if (!prisma) return null; // prisma não está disponível neste escopo diretamente
  // Você precisaria importar o prisma e fazer a query
  // const account = await prisma.account.findFirst({
  //   where: {
  //     userId: appUserId,
  //     provider: 'discord',
  //   },
  // });
  // return account?.providerAccountId || null;
  return null; // Placeholder
}
*/

// O cliente do bot é inicializado uma vez quando este módulo é carregado.
// As funções podem ser chamadas conforme necessário.
// Não há necessidade de chamar client.login() toda vez.
// Considere que o bot pode levar alguns segundos para estar 'ready'.
// Para aplicações de longa duração, o bot permaneceria conectado.
// Em um ambiente serverless (como Vercel), o bot se conectaria a cada invocação da função serverless,
// o que pode ser ineficiente. Para esse caso, usar a API HTTP do Discord diretamente pode ser melhor
// para ações pontuais como enviar DM ou adicionar role, em vez de manter um cliente WebSocket.
// Por simplicidade, vamos manter com discord.js, mas ciente dessa limitação em serverless.
