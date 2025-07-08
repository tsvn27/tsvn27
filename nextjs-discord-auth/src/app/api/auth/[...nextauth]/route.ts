import NextAuth, { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma'; // Importa a instância do PrismaClient

// Validação básica das variáveis de ambiente
if (!process.env.DISCORD_CLIENT_ID) {
  throw new Error('Missing DISCORD_CLIENT_ID in .env.local');
}
if (!process.env.DISCORD_CLIENT_SECRET) {
  throw new Error('Missing DISCORD_CLIENT_SECRET in .env.local');
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET in .env.local. Generate one with `openssl rand -base64 32`');
}
if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in .env.local.');
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify email guilds' } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt', // Usar JWT para sessão permite adicionar mais dados ao token
  },
  callbacks: {
    async jwt({ token, user }) {
      // Ao fazer login (user existe), adiciona o id e role do usuário ao token JWT
      // O objeto 'user' aqui é o User do Prisma (ou o User do NextAuth DefaultUser estendido)
      if (user) {
        token.id = user.id;
        token.role = user.role; // user.role deve estar definido no tipo User em next-auth.d.ts
      }
      return token;
    },
    async session({ session, token }) {
      // Adiciona o id e role do token JWT à sessão do cliente
      // As propriedades em 'token' foram definidas no callback jwt
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  // pages: {
  //   signIn: '/auth/signin',
  // }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
