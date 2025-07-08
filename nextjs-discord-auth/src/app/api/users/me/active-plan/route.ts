import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Ajuste se o caminho for diferente
import { OrderStatus, PlanType, UserRole } from '@prisma/client';

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

  try {
    const userId = session.user.id;

    // Buscar o pedido mais recente do usuário que esteja completo e não expirado
    // A lógica de "não expirado" depende de como 'expiresAt' é definido.
    // Se um plano é uma assinatura, 'expiresAt' deve ser gerenciado.
    // Se for uma compra única de "acesso vitalício" a um plano, pode não haver 'expiresAt'.
    // Para este exemplo, vamos assumir que 'expiresAt' existe e é relevante.
    const activeOrder = await prisma.order.findFirst({
      where: {
        userId: userId,
        status: OrderStatus.COMPLETED,
        // expiresAt: {
        //   gte: new Date(), // Maior ou igual à data/hora atual
        // },
      },
      orderBy: {
        createdAt: 'desc', // Pega o pedido completo mais recente
      },
      include: {
        plan: true, // Inclui os detalhes do plano associado
      },
    });

    if (!activeOrder) {
      return NextResponse.json({ message: 'Nenhum plano ativo encontrado' }, { status: 404 });
    }

    // Verificar se o plano ainda está ativo (caso o admin o desative)
    if (!activeOrder.plan.active) {
        return NextResponse.json({ message: 'Seu plano atual não está mais ativo. Contate o suporte.' }, { status: 403 });
    }

    // Retornar os detalhes do plano ativo e a data de expiração do pedido
    return NextResponse.json({
      planName: activeOrder.plan.name,
      planType: activeOrder.planType,
      features: activeOrder.plan.features,
      orderCreatedAt: activeOrder.createdAt,
      orderExpiresAt: activeOrder.expiresAt, // Pode ser null se não aplicável
      // ... outros detalhes do plano ou pedido que sejam úteis
    });

  } catch (error) {
    console.error('Erro ao buscar plano ativo do usuário:', error);
    return NextResponse.json({ message: 'Erro ao buscar plano ativo' }, { status: 500 });
  }
}
