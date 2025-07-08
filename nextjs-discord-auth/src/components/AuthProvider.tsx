'use client'; // Este componente precisa ser um Client Component

import { SessionProvider } from 'next-auth/react';
import React from 'react';

interface AuthProviderProps {
  children: React.ReactNode;
  // session?: any; // Opcional, se você for passar a sessão inicial de getServerSideProps/getInitialProps
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // O `session` prop no SessionProvider é opcional e útil se você estiver
  // buscando a sessão no servidor para otimizar o carregamento inicial.
  // Para a App Router, isso é menos comum, pois os Server Components podem acessar a sessão diretamente.
  return <SessionProvider>{children}</SessionProvider>;
};

export default AuthProvider;
