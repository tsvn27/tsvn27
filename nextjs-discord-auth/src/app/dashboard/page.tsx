'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { PlanType, OrderStatus, Order as PrismaOrder } from '@prisma/client'; // Importa Order também

interface ActivePlanDetails {
  planName: string;
  planType: PlanType;
  features: string[];
  orderCreatedAt: string;
  orderExpiresAt?: string | null;
}

// Estendendo o tipo Order para incluir o nome do plano, se necessário (já está no include da API)
interface OrderWithPlanName extends PrismaOrder {
  plan: {
    name: string;
  };
}


export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activePlan, setActivePlan] = useState<ActivePlanDetails | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderWithPlanName[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      // Fetch Active Plan
      setIsLoadingPlan(true);
      setPlanError(null);
      try {
        const resPlan = await fetch('/api/users/me/active-plan');
        if (resPlan.status === 404) {
          setActivePlan(null);
        } else if (!resPlan.ok) {
          const errorData = await resPlan.json();
          throw new Error(errorData.message || 'Falha ao buscar plano ativo');
        } else {
          const dataPlan: ActivePlanDetails = await resPlan.json();
          setActivePlan(dataPlan);
        }
      } catch (error: any) {
        console.error('Erro plano ativo:', error);
        setPlanError(error.message);
      } finally {
        setIsLoadingPlan(false);
      }

      // Fetch Order History
      setIsLoadingOrders(true);
      setOrdersError(null);
      try {
        const resOrders = await fetch('/api/users/me/orders');
        if (!resOrders.ok) {
          const errorData = await resOrders.json();
          throw new Error(errorData.message || 'Falha ao buscar histórico de pedidos');
        }
        const dataOrders: OrderWithPlanName[] = await resOrders.json();
        setOrders(dataOrders);
      } catch (error: any) {
        console.error('Erro histórico de pedidos:', error);
        setOrdersError(error.message);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    if (session) {
      fetchData();
    }
  }, [session, status, router]);

  if (status === 'loading' || (session && (isLoadingPlan || isLoadingOrders) && !planError && !ordersError && !activePlan && orders.length === 0 )) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brandBlack">
        <p className="text-brandPurple text-xl">Carregando...</p>
      </div>
    );
  }

  if (!session && status !== 'loading') {
    return (
        <div className="flex items-center justify-center min-h-screen bg-brandBlack">
            <p className="text-brandPurple text-xl">Redirecionando para login...</p>
        </div>
    );
  }

  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold text-brandPurple mb-8">Seu Painel</h1>

      {session && (
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 mb-10 border border-gray-700">
          <h2 className="text-2xl font-semibold text-brandPurple mb-4">Minhas Informações</h2>
          <div className="flex items-center space-x-4">
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt={session.user.name || 'Avatar do usuário'}
                width={80}
                height={80}
                className="rounded-full border-2 border-brandPurple"
              />
            )}
            <div>
              <p className="text-xl text-white">
                <strong>Nome:</strong> {session.user?.name || 'Não disponível'}
              </p>
              <p className="text-xl text-white">
                <strong>Email:</strong> {session.user?.email || 'Não disponível'}
              </p>
              <p className="text-sm text-gray-400">ID: {session.user?.id || 'N/A'}</p>
              <p className="text-sm text-gray-400">Role: {session.user?.role || 'USER'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 shadow-lg rounded-lg p-6 mb-10 border border-gray-700">
        <h2 className="text-2xl font-semibold text-brandPurple mb-4">Meu Plano Ativo</h2>
        {isLoadingPlan && <p className="text-gray-300">Verificando seu plano...</p>}
        {planError && <p className="text-red-400 bg-red-900 p-3 rounded mb-4">Erro ao buscar plano ativo: {planError}</p>}

        {!isLoadingPlan && !planError && activePlan && (
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white">{activePlan.planName}
              <span className={`text-sm font-medium ml-2 px-2 py-0.5 rounded-full ${activePlan.planType === PlanType.ANNUALLY ? 'bg-yellow-500 text-yellow-900' : 'bg-blue-500 text-blue-900'}`}>
                {activePlan.planType === PlanType.MONTHLY ? 'Mensal' : 'Anual'}
              </span>
            </h3>
            {activePlan.orderExpiresAt && (
              <p className="text-gray-400 mt-1">
                Expira em: {new Date(activePlan.orderExpiresAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
            <p className="text-gray-400 mt-1">
              Ativado em: {new Date(activePlan.orderCreatedAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h4 className="text-lg font-semibold text-brandPurple mt-6 mb-2">Benefícios Inclusos:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              {activePlan.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {!isLoadingPlan && !planError && !activePlan && (
          <>
            <p className="text-gray-300">Você ainda não possui um plano ativo.</p>
            <p className="text-gray-400 text-sm mt-2">
              Visite nossa <Link href="/planos" className="text-brandPurple hover:underline">página de planos</Link> para escolher o ideal para você.
            </p>
          </>
        )}
      </div>

      {/* Histórico de Compras */}
       <div className="bg-gray-800 shadow-lg rounded-lg p-6 mb-10 border border-gray-700">
        <h2 className="text-2xl font-semibold text-brandPurple mb-4">Histórico de Compras</h2>
        {isLoadingOrders && <p className="text-gray-300">Carregando histórico...</p>}
        {ordersError && <p className="text-red-400 bg-red-900 p-3 rounded mb-4">Erro ao buscar histórico: {ordersError}</p>}
        {!isLoadingOrders && !ordersError && orders.length === 0 && (
          <p className="text-gray-300">Você ainda não fez nenhum pedido.</p>
        )}
        {!isLoadingOrders && !ordersError && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-750">
                <tr>
                  <th scope="col" className="px-6 py-3">Data</th>
                  <th scope="col" className="px-6 py-3">Plano</th>
                  <th scope="col" className="px-6 py-3">Tipo</th>
                  <th scope="col" className="px-6 py-3">Valor</th>
                  <th scope="col" className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                    <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-medium text-white">{order.plan.name}</td>
                    <td className="px-6 py-4">{order.planType === PlanType.MONTHLY ? 'Mensal' : 'Anual'}</td>
                    <td className="px-6 py-4">R$ {order.totalAmount.toFixed(2).replace('.',',')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full
                        ${order.status === OrderStatus.COMPLETED ? 'bg-green-700 text-green-200' :
                          order.status === OrderStatus.PENDING ? 'bg-yellow-600 text-yellow-100' :
                          'bg-red-700 text-red-200'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold text-brandPurple mb-4">Atualizar ou Renovar Plano</h2>
        <p className="text-gray-300">
          Precisa de mais recursos ou quer garantir a continuidade do seu serviço?
        </p>
        <button
          onClick={() => router.push('/planos')}
          className="mt-4 px-6 py-2 bg-brandPurple text-white font-semibold rounded-lg hover:bg-brandPurpleDark transition-colors"
        >
          Ver Planos Disponíveis
        </button>
      </div>
    </div>
  );
}
