'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // useParams para pegar orderId da URL
import { useSession } from 'next-auth/react';
import Image from 'next/image'; // Para exibir o QR Code Base64
import Link from 'next/link';

interface PixData {
  paymentId: string | number;
  qrCodeBase64: string;
  qrCode: string; // Copia e Cola
  ticketUrl?: string; // Opcional
}

export default function PagarPedidoPage() {
  const params = useParams();
  const orderId = params.orderId as string; // Pega o orderId da URL
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/pedido/${orderId}/pagar`); // Redireciona para login se não logado
      return;
    }

    if (orderId && session) {
      const createPixPayment = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetch('/api/payments/create-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Falha ao gerar dados de pagamento PIX.');
          }
          const data: PixData = await res.json();
          setPixData(data);
        } catch (err: any) {
          setError(err.message);
          console.error("Erro ao criar pagamento PIX:", err);
        } finally {
          setIsLoading(false);
        }
      };
      createPixPayment();
    }
  }, [orderId, session, sessionStatus, router]);

  const handleCopyToClipboard = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode).then(() => {
        setCopySuccess('Código PIX copiado com sucesso!');
        setTimeout(() => setCopySuccess(''), 2000); // Limpa a mensagem após 2 segundos
      }, (err) => {
        setCopySuccess('Falha ao copiar o código PIX.');
        console.error('Erro ao copiar para a área de transferência:', err);
      });
    }
  };

  // Polling para verificar status do pagamento (simplificado)
  // Em produção, webhooks são mais eficientes. Isso é apenas para feedback imediato ao usuário.
  useEffect(() => {
    if (!pixData?.paymentId || error) return;

    const interval = setInterval(async () => {
      try {
        // Esta API de verificação de status de pagamento precisaria ser criada.
        // Ex: GET /api/payments/status/[paymentId] que consulta o Mercado Pago.
        // Por agora, vamos simular que após um tempo o pagamento é confirmado e redirecionamos.
        // console.log(`Verificando status do pagamento ${pixData.paymentId}... (simulação)`);

        // SIMULAÇÃO: Redirecionar para o dashboard após X segundos como se o pagamento fosse confirmado via webhook.
        // A lógica real de atualização de status do pedido e redirecionamento deve ser acionada pelo webhook.
        // Este polling é apenas para UX e não deve ser a fonte da verdade para o status do pedido.
      } catch (err) {
        // console.error("Erro ao verificar status do pagamento:", err);
      }
    }, 10000); // Verifica a cada 10 segundos (exemplo)

    return () => clearInterval(interval);
  }, [pixData, error, router]);


  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brandBlack text-white p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandPurple mb-4"></div>
        <p className="text-xl text-brandPurple">Gerando informações de pagamento PIX...</p>
        <p className="text-gray-400">Aguarde um momento.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brandBlack text-white p-6 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Erro ao Processar Pagamento</h2>
        <p className="text-red-400 bg-red-900 p-4 rounded-md mb-6">{error}</p>
        <Link href="/carrinho" legacyBehavior>
          <a className="px-6 py-2 bg-brandPurple text-white font-semibold rounded-lg hover:bg-brandPurpleDark transition-colors">
            Voltar para o Carrinho
          </a>
        </Link>
      </div>
    );
  }

  if (!pixData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brandBlack text-white p-6">
        <p className="text-xl text-gray-400">Não foi possível carregar os dados de pagamento.</p>
         <Link href="/dashboard" legacyBehavior>
          <a className="mt-4 px-6 py-2 bg-brandPurple text-white font-semibold rounded-lg hover:bg-brandPurpleDark transition-colors">
            Ir para o Dashboard
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brandBlack flex flex-col items-center justify-center p-4 sm:p-8 text-white">
      <div className="bg-gray-800 p-6 sm:p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-brandPurple mb-6 sm:mb-8 text-center">Pagamento PIX</h1>

        <div className="mb-6 text-center">
          <p className="text-gray-300 mb-2 text-lg">Escaneie o QR Code abaixo com o app do seu banco:</p>
          <div className="flex justify-center p-4 bg-white rounded-lg shadow-md">
            <Image src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="PIX QR Code" width={280} height={280} />
          </div>
        </div>

        <div className="mb-8 text-center">
          <p className="text-gray-300 mb-2 text-lg">Ou use o código PIX Copia e Cola:</p>
          <div className="bg-gray-700 p-4 rounded-lg shadow-md relative">
            <textarea
              readOnly
              value={pixData.qrCode}
              className="w-full bg-transparent text-gray-200 text-sm p-2 border border-gray-600 rounded resize-none focus:outline-none focus:ring-1 focus:ring-brandPurple"
              rows={4}
            />
            <button
              onClick={handleCopyToClipboard}
              className="mt-2 w-full bg-brandPurple hover:bg-brandPurpleDark text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-150"
            >
              {copySuccess ? copySuccess : 'Copiar Código PIX'}
            </button>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mb-6">
          Após o pagamento, seu pedido será processado. Você será notificado e seu plano ativado.
          O ID do seu pagamento no Mercado Pago é: <span className="font-mono text-xs">{pixData.paymentId}</span>.
        </p>

        <div className="text-center">
            <Link href="/dashboard" legacyBehavior>
                <a className="text-brandPurple hover:underline font-medium">
                    Ir para o Dashboard
                </a>
            </Link>
            {pixData.ticketUrl && (
                 <p className="mt-2 text-xs text-gray-500">
                    Você também pode ver o <a href={pixData.ticketUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">comprovante PIX aqui</a>.
                </p>
            )}
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-8 text-center">
        Este é um ambiente de teste. Nenhum valor real será cobrado.
      </p>
    </div>
  );
}
