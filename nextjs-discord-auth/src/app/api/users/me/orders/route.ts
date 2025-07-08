import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { UserRole } from '@prisma/client';

interface SessionWithRoleAndId {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: UserRole | string;
  };
  expires: string;
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithRoleAndId | null;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: userId,
      },
      include: {
        plan: { // Inclui os detalhes do plano para cada pedido
          select: {
            name: true,
            // description: true, // opcional
          }
        }
      },
      orderBy: {
        createdAt: 'desc', // Pedidos mais recentes primeiro
      },
    });

    if (!orders) { // findMany retorna array vazio se não encontrar, não null.
      return NextResponse.json([], { status: 200 }); // Retorna array vazio se não houver pedidos
    }

    return NextResponse.json(orders);

  } catch (error) {
    console.error(`Erro ao buscar pedidos para o usuário ${userId}:`, error);
    return NextResponse.json({ message: 'Erro ao buscar histórico de pedidos' }, { status: 500 });
  }
}
