'use client';

import React, { useState } from 'react'; // Adicionado useState
import { useCart, CartItem } from '@/contexts/CartContext'; // Importa CartItem também
import { useSession, signIn } from 'next-auth/react'; // Importa useSession e signIn
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Para redirecionamento
import { TrashIcon } from '@heroicons/react/24/outline';


export default function CarrinhoPage() {
  const { items, removeItem, clearCart, getItemCount, getTotalPrice } = useCart();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const itemCount = getItemCount();
  const totalPrice = getTotalPrice();

  // Removido handleQuantityChange pois não é usado para planos com quantidade fixa 1

  if (itemCount === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-4xl font-bold text-brandPurple mb-6">Meu Carrinho</h1>
        <p className="text-xl text-gray-300 mb-8">Seu carrinho está vazio.</p>
        <Link href="/planos" legacyBehavior>
          <a className="px-8 py-3 bg-brandPurple text-white text-lg font-semibold rounded-lg shadow-md hover:bg-brandPurpleDark transition-colors">
            Ver Planos
          </a>
        </Link>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (sessionStatus === 'loading') return;

    if (!session) {
      // Salva o carrinho no localStorage (opcional, para restaurar após login) e redireciona para login
      localStorage.setItem('redirectToCartAfterLogin', 'true'); // Sinalizador simples
      signIn('discord', { callbackUrl: '/carrinho' }); // Tenta voltar para o carrinho após login
      return;
    }

    setIsProcessingOrder(true);
    setOrderError(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items), // Envia os itens do carrinho
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Falha ao processar o pedido.');
      }

      // const createdOrders = await res.json(); // Pedidos criados com status PENDING
      // console.log('Pedidos criados:', createdOrders);

      alert('Pedido realizado com sucesso! (Status: Pendente de Pagamento)'); // Placeholder
      clearCart();
      router.push('/dashboard'); // Redireciona para o dashboard ou uma página de "meus pedidos"

    } catch (error: any) {
      setOrderError(error.message);
      console.error('Erro no checkout:', error);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  return (
    <div className="py-12 container mx-auto px-4">
      <h1 className="text-4xl font-bold text-center text-brandPurple mb-10">Meu Carrinho</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-gray-800 shadow-xl rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-brandPurple mb-6">Itens no Carrinho ({itemCount})</h2>
          {items.map((item: CartItem) => ( // Especifica o tipo do item aqui
            <div key={`${item.id}-${item.type}`} className="flex flex-col sm:flex-row items-center justify-between py-4 border-b border-gray-700 last:border-b-0">
              <div className="flex items-center mb-4 sm:mb-0 flex-grow">
                {/* Imagem do plano (placeholder) */}
                {/* <div className="w-20 h-20 bg-gray-700 rounded mr-4 flex-shrink-0"></div> */}
                <div>
                  <h3 className="text-xl font-semibold text-white">{item.name}</h3>
                  <p className="text-sm text-gray-400">
                    Tipo: {item.type === 'monthly' ? 'Mensal' : 'Anual'}
                  </p>
                  <p className="text-lg text-brandPurple font-semibold">{item.priceFormatted}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0">
                <p className='text-white'>Qnt: {item.quantity}</p>
                <button
                  onClick={() => removeItem(item.id, item.type)}
                  className="p-2 text-red-500 hover:text-red-400 transition-colors"
                  title="Remover item"
                  disabled={isProcessingOrder}
                >
                  <TrashIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))}
          {itemCount > 0 && (
            <div className="mt-6 text-right">
              <button
                onClick={clearCart}
                disabled={isProcessingOrder}
                className="text-gray-400 hover:text-red-500 font-semibold transition-colors disabled:opacity-50"
              >
                Esvaziar Carrinho
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-gray-800 shadow-xl rounded-lg p-6 border border-gray-700 sticky top-24">
          <h2 className="text-2xl font-semibold text-brandPurple mb-6">Resumo do Pedido</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-300">
              <span>Subtotal ({itemCount} item{itemCount > 1 ? 's' : ''}):</span>
              <span className="font-semibold">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between text-white text-xl font-bold pt-3 border-t border-gray-700">
              <span>Total:</span>
              <span>R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          {orderError && (
            <p className="text-red-400 bg-red-900 p-3 rounded mb-4 text-sm">{orderError}</p>
          )}
          <button
            onClick={handleCheckout}
            disabled={isProcessingOrder || sessionStatus === 'loading'}
            className="w-full py-3 bg-brandPurple text-white text-lg font-semibold rounded-lg shadow-md hover:bg-brandPurpleDark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessingOrder ? 'Processando...' : (sessionStatus === 'loading' ? 'Carregando...' : 'Finalizar Pedido')}
          </button>
          {!session && sessionStatus !== 'loading' && (
            <p className="text-xs text-center text-gray-400 mt-3">
              Você precisa <button onClick={() => signIn('discord', { callbackUrl: '/carrinho' })} className="text-brandPurple hover:underline font-semibold">fazer login</button> para finalizar a compra.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
