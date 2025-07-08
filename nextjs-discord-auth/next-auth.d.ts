import { UserRole } from '@prisma/client'; // Importa o enum do Prisma
import NextAuth, { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Retornado por `useSession`, `getSession` e recebido como um prop para o `SessionProvider` React Context
   */
  interface Session extends DefaultSession {
    user?: {
      id?: string; // Adicionamos id aqui
      role?: UserRole | string; // Adicionamos role aqui
    } & DefaultSession['user']; // Mantém as propriedades padrão como name, email, image
  }

  /**
   * O objeto User como retornado pelo adapter (ex: do banco de dados)
   * e também o objeto user no callback jwt quando um novo usuário é criado/logado.
   */
  interface User extends DefaultUser {
    role?: UserRole | string; // Adicionamos role aqui
  }
}

declare module 'next-auth/jwt' {
  /** Retornado pelo callback `jwt` e recebido pelo callback `session` */
  interface JWT {
    id?: string;
    role?: UserRole | string;
    // Se você adicionou outras propriedades ao token no callback jwt, declare-as aqui também
    // Ex: accessToken?: string;
  }
}
