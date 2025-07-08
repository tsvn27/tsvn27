import React from 'react';
import PlanoCard from '@/components/PlanoCard';
import type { Plano, PlanoCardComponentData } from '@/types'; // Importa os tipos

// Função para buscar os planos da API
// Esta função será executada no servidor
async function getPlanos(): Promise<Plano[]> {
  // Em um ambiente real, a URL base da API viria de uma variável de ambiente
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/plans`, {
    cache: 'no-store', // Para garantir dados frescos, ou configurar revalidação
  });

  if (!res.ok) {
    // Recomenda-se tratar erros de forma mais robusta
    console.error('Falha ao buscar planos:', res.status, await res.text());
    // Lançar um erro fará com que a error boundary mais próxima (error.tsx) seja renderizada.
    throw new Error('Falha ao buscar planos');
  }
  return res.json();
}

// Função para formatar o preço
const formatPrice = (price: number): string => {
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

export default async function PlanosPage() {
  let planosApi: Plano[] = [];
  let fetchError = false;

  try {
    planosApi = await getPlanos();
  } catch (error) {
    console.error(error);
    fetchError = true;
  }

  // Transforma os dados da API para o formato esperado pelo PlanoCard
  const planosParaCard: PlanoCardComponentData[] = planosApi.map(planoApi => ({
    id: planoApi.id,
    nome: planoApi.name, // Ajusta o nome do campo
    precoMensal: planoApi.priceMonthly,
    precoMensalFormatted: formatPrice(planoApi.priceMonthly),
    precoAnual: planoApi.priceAnnually,
    precoAnualFormatted: formatPrice(planoApi.priceAnnually),
    beneficios: planoApi.features, // Ajusta o nome do campo
    // 'popular' pode ser determinado aqui se houver lógica para isso, ou no backend
    // Exemplo: popular: planoApi.name === 'Plano Vendas'
  }));

  return (
    <div className="py-16">
      <h1 className="text-5xl font-extrabold text-center text-brandPurple mb-6">
        Nossos Planos
      </h1>
      <p className="text-xl text-center text-gray-300 mb-16 max-w-2xl mx-auto">
        Escolha o plano que melhor se adapta às suas necessidades e comece hoje mesmo.
      </p>

      {fetchError ? (
        <div className="text-center text-red-500 bg-red-100 p-4 rounded-md">
          <p className="font-semibold text-lg">Oops! Algo deu errado.</p>
          <p>Não foi possível carregar os planos no momento. Por favor, tente novamente mais tarde.</p>
        </div>
      ) : planosParaCard.length === 0 ? (
        <div className="text-center text-gray-400">
          <p className="text-xl">Nenhum plano disponível no momento.</p>
          <p>Por favor, verifique novamente mais tarde.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          {planosParaCard.map((plano) => (
            <PlanoCard
              key={plano.id}
              {...plano}
            />
          ))}
        </div>
      )}
    </div>
  );
}
