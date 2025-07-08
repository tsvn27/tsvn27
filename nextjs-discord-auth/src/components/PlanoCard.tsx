'use client'; // Necessário para useState e hooks do carrinho

import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/contexts/CartContext';
import type { PlanoCardComponentData } from '@/types'; // Importa o tipo para os props

const PlanoCard: React.FC<PlanoCardComponentData> = (plano) => {
  const {
    id,
    nome,
    precoMensal,
    precoMensalFormatted,
    precoAnual,
    precoAnualFormatted,
    beneficios,
    popular = false // popular pode ser opcional ou determinado de outra forma
  } = plano;
  const [tipoPlano, setTipoPlano] = useState<'monthly' | 'annually'>('monthly');
  const { addItem, items: cartItems } = useCart();

  const precoAtualFormatado = tipoPlano === 'monthly' ? precoMensalFormatted : precoAnualFormatted;
  const valorAtualNumerico = tipoPlano === 'monthly' ? precoMensal : precoAnual;
  const sufixoPreco = tipoPlano === 'monthly' ? '/mês' : '/ano';

  const handleAddToCart = () => {
    const itemToAdd: Omit<CartItem, 'quantity'> = {
      id,
      name: nome,
      price: valorAtualNumerico,
      priceFormatted: precoAtualFormatado,
      type: tipoPlano,
    };
    addItem(itemToAdd);
    // Adicionar feedback visual (ex: toast "Item adicionado!") seria bom aqui
    alert(`${nome} (${tipoPlano === 'monthly' ? 'Mensal' : 'Anual'}) adicionado ao carrinho!`);
  };

  // Verifica se o plano (com o tipo selecionado) já está no carrinho
  const isInCart = cartItems.some(item => item.id === id && item.type === tipoPlano);

  return (
    <div className={`relative bg-gray-800 p-6 rounded-lg shadow-xl border ${popular ? 'border-brandPurple' : 'border-gray-700'} flex flex-col transition-all duration-300 ease-in-out transform hover:scale-105`}>
      {popular && (
        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-brandPurple text-white px-4 py-1 text-sm font-bold rounded-full shadow-lg z-10">
          Mais Popular
        </span>
      )}
      <div className="pt-8 flex flex-col h-full"> {/* Padding top aumentado e flex-col para ocupar altura */}
        <h2 className="text-3xl font-bold text-brandPurple mb-4 text-center">{nome}</h2>

        {/* Seletor Mensal/Anual */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex rounded-md shadow-sm bg-gray-700">
            <button
              onClick={() => setTipoPlano('monthly')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors
                          ${tipoPlano === 'monthly' ? 'bg-brandPurple text-white' : 'text-gray-300 hover:bg-gray-600'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setTipoPlano('annually')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors
                          ${tipoPlano === 'annually' ? 'bg-brandPurple text-white' : 'text-gray-300 hover:bg-gray-600'}`}
            >
              Anual (Economize!)
            </button>
          </div>
        </div>

        <p className="text-4xl font-extrabold text-white mb-1 text-center">
          {precoAtualFormatado}
        </p>
        <p className="text-sm font-normal text-gray-400 mb-6 text-center">{sufixoPreco}</p>

        <ul className="space-y-3 mb-8 text-gray-300 flex-grow">
          {beneficios.map((beneficio, index) => (
            <li key={index} className="flex items-start">
              <svg
                className="w-5 h-5 text-brandPurple mr-2 flex-shrink-0 mt-1"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              <span>{beneficio}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={handleAddToCart}
          disabled={isInCart}
          className="w-full mt-auto bg-brandPurple text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-brandPurpleDark transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-brandPurple focus:ring-opacity-50 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isInCart ? 'Já no Carrinho' : 'Adquirir Plano'}
        </button>
      </div>
    </div>
  );
};

export default PlanoCard;
