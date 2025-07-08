import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import mercadopago from '@/lib/mercadopago'; // SDK configurado
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { OrderStatus, UserRole } from '@prisma/client';

interface SessionWithRoleAndId {
  user?: {
    id?: string;
    email?: string; // Necessário para o pagador no Mercado Pago
    // Adicione outros campos da sessão se necessário
  };
}

interface CreatePixPayload {
  orderId: string;
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithRoleAndId | null;

  if (!session || !session.user || !session.user.id || !session.user.email) {
    return NextResponse.json({ message: 'Não autenticado ou e-mail do usuário faltando na sessão' }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const { orderId } = (await req.json()) as CreatePixPayload;

    if (!orderId) {
      return NextResponse.json({ message: 'orderId é obrigatório' }, { status: 400 });
    }

    // 1. Buscar o pedido no banco de dados
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId: userId }, // Garante que o pedido pertence ao usuário logado
      include: { plan: true },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido não encontrado ou não pertence ao usuário' }, { status: 404 });
    }

    if (order.status !== OrderStatus.PENDING) {
      return NextResponse.json({ message: `Pedido ${orderId} não está pendente de pagamento (status: ${order.status})` }, { status: 409 }); // 409 Conflict
    }

    // 2. Preparar dados para a criação do pagamento PIX no Mercado Pago
    const paymentData = {
      transaction_amount: order.totalAmount,
      description: `Pagamento do plano: ${order.plan.name} - Pedido #${order.id.substring(0, 8)}`, // Descrição concisa
      payment_method_id: 'pix',
      payer: {
        email: userEmail,
        // first_name: session.user.name?.split(' ')[0], // Opcional, mas recomendado
        // last_name: session.user.name?.split(' ').slice(1).join(' '), // Opcional
        // identification: { // Opcional, mas pode ser exigido para certos valores/países
        //   type: 'CPF', // ou CNPJ
        //   number: '12345678900', // CPF do usuário (precisaria coletar isso no cadastro ou perfil)
        // },
      },
      external_reference: order.id, // Nosso ID do pedido para conciliação
      notification_url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/webhooks/mercadopago`, // URL para webhooks
      // date_of_expiration: // Opcional: data de expiração para o PIX (ex: 30 minutos)
      //    new Date(Date.now() + 30 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z"), // Formato ISO8601 com timezone offset
    };

    // 3. Criar o pagamento PIX usando o SDK do Mercado Pago
    // @ts-ignore // O SDK do Mercado Pago pode não ter tipos perfeitos ou pode variar
    const paymentResponse = await mercadopago.payment.create(paymentData);

    const payment = paymentResponse.body;

    if (!payment || !payment.id || !payment.point_of_interaction?.transaction_data) {
        console.error("Resposta inesperada do Mercado Pago ao criar pagamento PIX:", payment);
        throw new Error("Não foi possível obter os dados do PIX do Mercado Pago.");
    }

    // 4. Atualizar nosso pedido com o ID do pagamento do Mercado Pago
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: payment.id.toString() }, // payment.id é numérico no MP
    });

    // 5. Retornar os dados necessários para o frontend exibir o QR Code e Copia/Cola
    const pixData = {
      paymentId: payment.id, // ID do pagamento no Mercado Pago
      qrCodeBase64: payment.point_of_interaction.transaction_data.qr_code_base64,
      qrCode: payment.point_of_interaction.transaction_data.qr_code, // String para Copia e Cola
      ticketUrl: payment.point_of_interaction.transaction_data.ticket_url, // Link para o "boleto" do PIX, se disponível
    };

    return NextResponse.json(pixData);

  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error.message, error.cause ? error.cause : '');
    // Se o erro for do SDK do Mercado Pago, ele pode ter uma estrutura específica
    const errorMessage = error.cause?.message || error.message || 'Erro interno ao processar pagamento.';
    const errorStatus = error.status || 500;
    return NextResponse.json({ message: errorMessage, details: error.cause?.error }, { status: errorStatus });
  }
}
