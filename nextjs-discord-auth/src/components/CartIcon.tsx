'use client';

import React from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCartIcon } from '@heroicons/react/24/outline'; // Usando Heroicons para o ícone

const CartIcon: React.FC = () => {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <Link href="/carrinho" className="relative flex items-center text-gray-300 hover:text-brandPurple transition-colors">
      <ShoppingCartIcon className="w-7 h-7" />
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-brandPurple text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
      <span className="sr-only">Ver carrinho</span>
    </Link>
  );
};

export default CartIcon;
