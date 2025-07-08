'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Tipos
export interface CartItem {
  id: string; // ID do plano (ex: 'vendas', 'ticket')
  name: string;
  price: number; // Preço numérico para cálculos
  priceFormatted: string; // Preço formatado para exibição (ex: "R$ 49,90")
  type: 'monthly' | 'annually'; // Tipo de plano
  quantity: number;
  // Poderia adicionar imagem ou outros detalhes do plano se necessário
}

interface CartState {
  items: CartItem[];
}

interface CartContextType extends CartState {
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string, type: 'monthly' | 'annually') => void;
  updateQuantity: (id:string, type: 'monthly' | 'annually', quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Reducer para gerenciar o estado do carrinho
type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> }
  | { type: 'REMOVE_ITEM'; payload: { id: string; type: 'monthly' | 'annually' } }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; type: 'monthly' | 'annually'; quantity: number } }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === action.payload.id && item.type === action.payload.type
      );
      if (existingItemIndex > -1) {
        // Se o item (mesmo plano, mesmo tipo) já existe, não adiciona novamente (ou poderia aumentar quantidade)
        // Para planos, geralmente é 1 por tipo. Se quiser permitir múltiplos, ajuste aqui.
        // Por ora, vamos substituir se já existir, ou impedir.
        // Para este caso, vamos assumir que um plano específico (ID + tipo) só pode ser adicionado uma vez.
        // Se tentar adicionar de novo, não faz nada ou atualiza (decidiremos ao integrar com PlanoCard).
        // Por simplicidade, se já existe, não faremos nada.
        // TODO: Decidir comportamento ao adicionar item já existente.
        // Por enquanto, se já existe, não faz nada.
        if (state.items.find(i => i.id === action.payload.id && i.type === action.payload.type)) {
            return state;
        }
        return {
            ...state,
            items: [...state.items, { ...action.payload, quantity: 1 }],
        };

      } else {
        return {
          ...state,
          items: [...state.items, { ...action.payload, quantity: 1 }],
        };
      }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => !(item.id === action.payload.id && item.type === action.payload.type)),
      };
    case 'UPDATE_QUANTITY': // Para planos, a quantidade geralmente é 1. Mas útil se o carrinho for genérico.
      return {
        ...state,
        items: state.items.map(item =>
          (item.id === action.payload.id && item.type === action.payload.type)
            ? { ...item, quantity: Math.max(0, action.payload.quantity) } // Evita quantidade negativa
            : item
        ).filter(item => item.quantity > 0), // Remove itens com quantidade zero
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
};

// Provider do Carrinho
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = (itemPayload: Omit<CartItem, 'quantity'>) => {
    dispatch({ type: 'ADD_ITEM', payload: itemPayload });
  };

  const removeItem = (id: string, type: 'monthly' | 'annually') => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id, type } });
  };

  const updateQuantity = (id: string, type: 'monthly' | 'annually', quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, type, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getItemCount = () => {
    return state.items.reduce((count, item) => count + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{ ...state, addItem, removeItem, updateQuantity, clearCart, getItemCount, getTotalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook customizado para usar o contexto do carrinho
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
