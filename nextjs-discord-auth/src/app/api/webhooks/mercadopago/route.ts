import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import mercadopago from '@/lib/mercadopago';
import { OrderStatus, PlanType } from '@prisma/client';
import { sendDirectMessage, addRoleToUser } from '@/lib/discordBot'; // Importa as funções do bot

// Variável de ambiente para o segredo do webhook (se aplicável e configurado no Mercado Pago)
// const MERCADOPAGO_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  console.log('Webhook do Mercado Pago recebido!');

  try {
    const notification = await req.json();
    console.log('Conteúdo da notificação:', JSON.stringify(notification, null, 2));

    // TODO: Validar a origem da notificação (ex: usando x-signature se fornecido pelo MP e um segredo)
    // Exemplo (conceitual, verificar documentação do MP para detalhes exatos):
    // const signature = req.headers.get('x-signature');
    // const calculatedSignature = calcularAssinatura(notification, MERCADOPAGO_WEBHOOK_SECRET);
    // if (signature !== calculatedSignature) {
    //   console.warn('Assinatura do webhook inválida.');
    //   return NextResponse.json({ message: 'Assinatura inválida' }, { status: 403 });
    // }

    if (notification.type === 'payment' && notification.action === 'payment.updated') {
      const paymentId = notification.data.id;
      console.log(`Notificação de pagamento atualizado para payment_id: ${paymentId}`);

      // Buscar informações detalhadas do pagamento no Mercado Pago
      // @ts-ignore // Tipos do SDK podem variar
      const paymentInfoResponse = await mercadopago.payment.get(paymentId);
      const paymentInfo = paymentInfoResponse.body;

      console.log('Detalhes do pagamento do MP:', JSON.stringify(paymentInfo, null, 2));

      if (!paymentInfo || !paymentInfo.external_reference) {
        console.error('external_reference (orderId) não encontrado nos detalhes do pagamento do Mercado Pago.');
        return NextResponse.json({ message: 'external_reference faltando' }, { status: 400 });
      }

      const orderId = paymentInfo.external_reference;

      // Buscar o pedido no nosso banco de dados
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          plan: true, // Inclui o plano para ter acesso a discordRoleId, nome, etc.
          user: { // Inclui o usuário para buscar a conta Discord
            include: {
              accounts: {
                where: { provider: 'discord' } // Filtra para pegar apenas a conta do Discord
              }
            }
          }
        }
      });

      if (!order) {
        console.error(`Pedido com ID ${orderId} (external_reference) não encontrado no banco de dados.`);
        // Retornar 200 OK para o Mercado Pago mesmo se o pedido não for encontrado aqui,
        // para evitar reenvios desnecessários do webhook se for um ID antigo ou inválido.
        return NextResponse.json({ message: 'Pedido não encontrado no sistema, mas webhook recebido.' });
      }

      console.log(`Pedido ${orderId} encontrado. Status atual no DB: ${order.status}. Status do pagamento MP: ${paymentInfo.status}`);

      // Atualizar o status do pedido com base no status do pagamento do Mercado Pago
      // e apenas se o pedido ainda estiver PENDING (para evitar processar múltiplas vezes)
      if (order.status === OrderStatus.PENDING) {
        let newOrderStatus: OrderStatus | null = null;
        let paymentSuccessful = false;

        if (paymentInfo.status === 'approved') {
          newOrderStatus = OrderStatus.COMPLETED;
          paymentSuccessful = true;
          console.log(`Pagamento ${paymentId} aprovado para o pedido ${orderId}.`);
        } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(paymentInfo.status)) {
          newOrderStatus = OrderStatus.FAILED; // Ou CANCELLED, REFUNDED dependendo do status
          if (paymentInfo.status === 'cancelled') newOrderStatus = OrderStatus.CANCELLED;
          if (paymentInfo.status === 'refunded' || paymentInfo.status === 'charged_back') newOrderStatus = OrderStatus.REFUNDED;
          console.log(`Pagamento ${paymentId} falhou/cancelado/reembolsado para o pedido ${orderId}. Status MP: ${paymentInfo.status}`);
        }
        // Outros status como 'in_process', 'pending' podem ser ignorados ou logados,
        // pois esperamos a confirmação final (approved ou falha).

        if (newOrderStatus) {
          const updateData: any = { status: newOrderStatus };

          if (paymentSuccessful) {
            // Calcular/confirmar data de expiração se o pagamento foi bem-sucedido
            let expiresAt: Date | undefined = order.expiresAt || undefined; // Mantém se já existir
            if (!expiresAt) { // Calcula apenas se não foi definido na criação do pedido ou se precisa reconfirmar
                if (order.planType === PlanType.MONTHLY) {
                    expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30);
                } else if (order.planType === PlanType.ANNUALLY) {
                    expiresAt = new Date();
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                }
            }
            updateData.expiresAt = expiresAt;

            // Lógica de entrega via Bot do Discord
            const discordAccount = order.user?.accounts.find(acc => acc.provider === 'discord');
            const discordUserId = discordAccount?.providerAccountId;

            if (discordUserId) {
              const dmMessage = `Olá ${order.user.name || 'usuário'}! Seu pagamento para o plano "${order.plan.name} (${order.planType === PlanType.MONTHLY ? 'Mensal' : 'Anual'})" foi confirmado com sucesso. Obrigado!`;
              sendDirectMessage(discordUserId, dmMessage)
                .then(sent => console.log(sent ? `DM de confirmação enviada para ${discordUserId}` : `Falha ao enviar DM para ${discordUserId}`))
                .catch(err => console.error(`Erro ao tentar enviar DM para ${discordUserId}:`, err));

              if (order.plan.discordRoleId && process.env.DISCORD_GUILD_ID) {
                addRoleToUser(discordUserId, order.plan.discordRoleId)
                  .then(added => console.log(added ? `Role ${order.plan.discordRoleId} adicionada para ${discordUserId}` : `Falha ao adicionar role ${order.plan.discordRoleId} para ${discordUserId}`))
                  .catch(err => console.error(`Erro ao tentar adicionar role para ${discordUserId}:`, err));
              } else {
                if (!order.plan.discordRoleId) console.log(`Plano ${order.plan.name} não possui discordRoleId configurado.`);
                if (!process.env.DISCORD_GUILD_ID && order.plan.discordRoleId) console.log(`DISCORD_GUILD_ID não definido no .env, não é possível adicionar role.`);
              }
            } else {
              console.warn(`Não foi possível encontrar o ID do Discord para o usuário ${order.userId}. Não foi possível enviar DM ou adicionar role.`);
            }
          }

          await prisma.order.update({
            where: { id: orderId },
            data: updateData,
          });
          console.log(`Pedido ${orderId} atualizado para status ${newOrderStatus}.`);
        }
      } else {
         console.log(`Pedido ${orderId} já foi processado anteriormente (status atual: ${order.status}). Ignorando webhook.`);
      }
    } else {
      console.log(`Tipo de notificação ou ação não esperada: type='${notification.type}', action='${notification.action}'. Ignorando.`);
    }

    // Responder ao Mercado Pago com status 200 OK para confirmar o recebimento
    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    return NextResponse.json({ message: 'Erro ao processar webhook', error: error.message }, { status: 500 });
  }
}
