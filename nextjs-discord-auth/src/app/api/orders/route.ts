import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { UserRole, OrderStatus, PlanType, CartItem } from '@prisma/client'; // Assumindo CartItem do prisma se adaptado, ou usar nosso tipo do frontend

// Reutilizando a tipagem da sessão que já definimos antes
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

// Tipo para os itens esperados no corpo da requisição
// Similar ao CartItem do frontend context
interface OrderItemPayload {
  id: string; // ID do plano
  name: string; // Nome do plano
  price: number; // Preço numérico do item (mensal ou anual)
  priceFormatted: string; // Preço formatado
  type: 'monthly' | 'annually'; // Tipo de plano
  quantity: number; // Geralmente 1 para planos
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithRoleAndId | null;

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const itemsToOrder = (await req.json()) as OrderItemPayload[];

    if (!itemsToOrder || itemsToOrder.length === 0) {
      return NextResponse.json({ message: 'Nenhum item fornecido para o pedido' }, { status: 400 });
    }

    const createdOrders = [];

    for (const item of itemsToOrder) {
      // 1. Verificar se o plano existe e está ativo
      const plan = await prisma.plan.findUnique({
        where: { id: item.id },
      });

      if (!plan) {
        // Considerar como tratar: pular este item, ou falhar o pedido inteiro?
        // Por agora, vamos pular e registrar um erro.
        console.error(`Plano com ID ${item.id} não encontrado para o pedido do usuário ${userId}.`);
        // Poderia adicionar a uma lista de erros para retornar ao cliente.
        continue;
      }

      if (!plan.active) {
        console.error(`Plano ${plan.name} (ID: ${item.id}) está inativo. Pedido não processado para este item.`);
        continue;
      }

      // 2. Validar o preço (opcional, mas bom para segurança)
      // O preço no 'item' deve corresponder ao preço do plano para o 'type' selecionado.
      const expectedPrice = item.type === 'monthly' ? plan.priceMonthly : plan.priceAnnually;
      if (item.price !== expectedPrice) {
        // Log de discrepância de preço e possível ação (ex: usar preço do DB, ou rejeitar)
        console.warn(`Discrepância de preço para o plano ${plan.name} (ID: ${item.id}). Frontend: ${item.price}, Backend: ${expectedPrice}. Usando preço do backend.`);
        // Para segurança, sempre usar o preço do banco de dados.
        item.price = expectedPrice;
      }

      // 3. Calcular data de expiração (exemplo simples: +30 dias para mensal, +365 para anual)
      // Esta lógica pode ser muito mais complexa dependendo das regras de negócio.
      let expiresAt: Date | undefined = undefined;
      if (item.type === 'monthly') {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // Adiciona 30 dias
      } else if (item.type === 'annually') {
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Adiciona 1 ano
      }
      // Se for um produto de compra única sem expiração, expiresAt pode ser null.

      // 4. Criar o pedido no banco de dados
      const newOrder = await prisma.order.create({
        data: {
          userId,
          planId: plan.id,
          planType: item.type === 'monthly' ? PlanType.MONTHLY : PlanType.ANNUALLY,
          status: OrderStatus.PENDING, // Pagamento ainda não foi processado
          totalAmount: item.price * item.quantity, // item.quantity é geralmente 1 para planos
          currency: 'BRL', // Ou de uma configuração
          expiresAt,
          // paymentIntentId será preenchido após a tentativa de pagamento
        },
        include: { // Incluir detalhes do plano no retorno pode ser útil
            plan: {
                select: { name: true, features: true }
            }
        }
      });
      createdOrders.push(newOrder);
    }

    if (createdOrders.length === 0 && itemsToOrder.length > 0) {
        return NextResponse.json({ message: 'Nenhum dos itens do pedido pôde ser processado (ex: planos não encontrados ou inativos).' }, { status: 400 });
    }

    // Retorna os pedidos criados (ou um ID de pedido consolidado se fosse o caso)
    // O frontend usará isso para redirecionar para pagamento ou mostrar sucesso/erro.
    return NextResponse.json(createdOrders, { status: 201 });

  } catch (error: any) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json({ message: 'Erro ao criar pedido', error: error.message }, { status: 500 });
  }
}
