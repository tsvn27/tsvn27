'use client'; // Necessário para useSession, signIn, signOut

import Link from 'next/link';
import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image'; // Para a imagem do usuário
import CartIcon from './CartIcon'; // Importa o CartIcon

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen flex flex-col bg-brandBlack text-white">
      <header className="bg-brandBlack shadow-md sticky top-0 z-50">
        <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold text-brandPurple hover:text-brandPurpleDark transition-colors">
              LogoSite
            </Link>
          </div>
          <div className="flex items-center space-x-6"> {/* Aumentado space-x para melhor visual */}
            <Link href="/recursos" className="text-gray-300 hover:text-brandPurple transition-colors">
              Recursos
            </Link>
            <Link href="/planos" className="text-gray-300 hover:text-brandPurple transition-colors">
              Planos
            </Link>
            <a
              href="https://discord.gg/SEU_SERVIDOR_DISCORD" // Substituir pelo link real
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-brandPurple transition-colors"
            >
              Contato
            </a>

            {/* Ícone do Carrinho */}
            <CartIcon />

            {/* Botão de Tema (Placeholder) */}
            <button className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm focus:outline-none hover:bg-gray-600" aria-label="Alternar tema">
              T
            </button>

            {/* Autenticação */}
            {isLoading ? (
              <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse" aria-label="Carregando sessão"></div>
            ) : session?.user ? (
              <div className="flex items-center space-x-3">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'Avatar'}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <span className="text-sm text-gray-300 hidden sm:inline">Olá, {session.user.name?.split(' ')[0]}</span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-sm bg-brandPurple hover:bg-brandPurpleDark text-white font-semibold rounded-lg transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="px-4 py-2 text-sm bg-brandPurple hover:bg-brandPurpleDark text-white font-semibold rounded-lg transition-colors"
              >
                Login com Discord
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="flex-grow container mx-auto px-6 py-8">
        {children}
      </main>
      <footer className="bg-brandBlack text-center py-6 text-gray-500 text-sm border-t border-gray-700">
        <p>&copy; {new Date().getFullYear()} NomeDoServiço. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Layout;
