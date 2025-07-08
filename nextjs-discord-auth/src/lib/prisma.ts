import { PrismaClient } from '@prisma/client';

// Evita múltiplas instâncias do PrismaClient em desenvolvimento devido ao hot-reloading
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;
