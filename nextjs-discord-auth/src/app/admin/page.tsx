'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client'; // Para comparar a role
import type { Plano } from '@/types'; // Importa o tipo Plano

// Interface para os dados do formulário do plano
interface PlanFormData {
  id?: string;
  name: string;
  description: string;
  priceMonthly: string;
  priceAnnually: string;
  features: string;
  active: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnually?: string;
  discordRoleId?: string; // Novo campo
}

const initialPlanFormData: PlanFormData = {
  name: '',
  description: '',
  priceMonthly: '0.00',
  priceAnnually: '0.00',
  features: '',
  active: true,
  stripePriceIdMonthly: '',
  stripePriceIdAnnually: '',
  discordRoleId: '', // Novo campo
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [plans, setPlans] = useState<Plano[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [errorLoadingPlans, setErrorLoadingPlans] = useState<string | null>(null);

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>(initialPlanFormData);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = session?.user?.role === UserRole.ADMIN || session?.user?.role === 'ADMIN';


  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/');
      return;
    }

    if (!isAdmin && status !== 'loading') { // Garante que não está carregando antes de redirecionar
      router.push('/dashboard');
      return;
    }

    if (isAdmin) {
      fetchPlans();
    }
  }, [session, status, isAdmin, router]);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    setErrorLoadingPlans(null);
    try {
      const res = await fetch('/api/plans');
      if (!res.ok) {
        throw new Error(`Falha ao buscar planos: ${res.statusText}`);
      }
      const data: Plano[] = await res.json();
      setPlans(data);
    } catch (error: any) {
      console.error(error);
      setErrorLoadingPlans(error.message || 'Erro desconhecido ao buscar planos.');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        setFormData(prev => ({ ...prev, [name]: e.target.checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/api/plans/${formData.id}` : '/api/plans';

    const payload = {
      ...formData,
      priceMonthly: parseFloat(formData.priceMonthly),
      priceAnnually: parseFloat(formData.priceAnnually),
      features: formData.features.split(',').map(f => f.trim()).filter(f => f), // Converte string de features para array
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} plano.`);
      }

      setIsFormVisible(false);
      setFormData(initialPlanFormData);
      setIsEditing(false);
      fetchPlans(); // Re-fetch plans
      alert(`Plano ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
    } catch (error: any) {
      setFormError(error.message);
      console.error(error);
    }
  };

  const handleEdit = (plan: Plano) => {
    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      priceMonthly: plan.priceMonthly.toFixed(2),
      priceAnnually: plan.priceAnnually.toFixed(2),
      features: plan.features.join(', '),
      active: plan.active,
      stripePriceIdMonthly: plan.stripePriceIdMonthly || '',
      stripePriceIdAnnually: plan.stripePriceIdAnnually || '',
    });
    setIsEditing(true);
    setIsFormVisible(true);
    setFormError(null);
  };

  const handleToggleActive = async (plan: Plano) => {
    const newActiveState = !plan.active;
    const actionText = newActiveState ? "ativar" : "desativar";
    if (!confirm(`Tem certeza que deseja ${actionText} o plano "${plan.name}"?`)) return;

    try {
      // Para desativar, usamos DELETE (que no backend faz soft delete)
      // Para ativar, usamos PUT atualizando o campo 'active'
      let res;
      if (!newActiveState) { // Desativando
        res = await fetch(`/api/plans/${plan.id}`, { method: 'DELETE' });
      } else { // Ativando
        res = await fetch(`/api/plans/${plan.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Erro ao ${actionText} plano.`);
      }
      fetchPlans(); // Re-fetch plans
      alert(`Plano ${plan.name} ${actionText === "ativar" ? "ativado" : "desativado"} com sucesso!`);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
      console.error(error);
    }
  };

  const openCreateForm = () => {
    setIsEditing(false);
    setFormData(initialPlanFormData);
    setIsFormVisible(true);
    setFormError(null);
  };


  if (status === 'loading' || (!isAdmin && status !== 'loading' && !session)) {
     // Este caso deve ser pego pelo useEffect, mas como fallback:
    return (
      <div className="flex items-center justify-center min-h-screen bg-brandBlack">
        <p className="text-red-500 text-xl">Acesso Negado.</p>
      </div>
    );
  }

  // Se for admin, renderiza o conteúdo do painel
  return (
    <div className="py-12 container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-brandPurple">Painel Administrativo</h1>
        <button
            onClick={openCreateForm}
            className="px-6 py-2 bg-brandPurple text-white font-semibold rounded-lg hover:bg-brandPurpleDark transition-colors"
        >
          Adicionar Novo Plano
        </button>
      </div>

      {isFormVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-semibold text-brandPurple mb-6">{isEditing ? 'Editar Plano' : 'Adicionar Novo Plano'}</h2>
            {formError && <p className="text-red-400 bg-red-900 p-3 rounded mb-4">{formError}</p>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nome do Plano</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple" />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple"></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="priceMonthly" className="block text-sm font-medium text-gray-300 mb-1">Preço Mensal (ex: 19.90)</label>
                  <input type="number" step="0.01" name="priceMonthly" id="priceMonthly" value={formData.priceMonthly} onChange={handleInputChange} required className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple" />
                </div>
                <div>
                  <label htmlFor="priceAnnually" className="block text-sm font-medium text-gray-300 mb-1">Preço Anual (ex: 199.00)</label>
                  <input type="number" step="0.01" name="priceAnnually" id="priceAnnually" value={formData.priceAnnually} onChange={handleInputChange} required className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple" />
                </div>
              </div>
              <div>
                <label htmlFor="features" className="block text-sm font-medium text-gray-300 mb-1">Benefícios (separados por vírgula)</label>
                <input type="text" name="features" id="features" value={formData.features} onChange={handleInputChange} className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="stripePriceIdMonthly" className="block text-sm font-medium text-gray-300 mb-1">Stripe Price ID Mensal (Opcional)</label>
                    <input type="text" name="stripePriceIdMonthly" id="stripePriceIdMonthly" value={formData.stripePriceIdMonthly} onChange={handleInputChange} className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple" />
                </div>
                <div>
                    <label htmlFor="stripePriceIdAnnually" className="block text-sm font-medium text-gray-300 mb-1">Stripe Price ID Anual (Opcional)</label>
                    <input type="text" name="stripePriceIdAnnually" id="stripePriceIdAnnually" value={formData.stripePriceIdAnnually} onChange={handleInputChange} className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-3 focus:ring-brandPurple focus:border-brandPurple" />
                </div>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="active" id="active" checked={formData.active} onChange={handleInputChange} className="h-5 w-5 text-brandPurple bg-gray-700 border-gray-600 rounded focus:ring-brandPurple" />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-300">Plano Ativo</label>
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={() => setIsFormVisible(false)} className="px-6 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-brandPurple text-white font-semibold rounded-lg hover:bg-brandPurpleDark transition-colors">{isEditing ? 'Salvar Alterações' : 'Criar Plano'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seção de Gerenciamento de Planos */}
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-semibold text-brandPurple mb-6">Gerenciar Planos</h2>

        {isLoadingPlans && <p className="text-gray-300">Carregando planos...</p>}
        {errorLoadingPlans && <p className="text-red-400 bg-red-900 p-3 rounded">Erro ao carregar planos: {errorLoadingPlans}</p>}

        {!isLoadingPlans && !errorLoadingPlans && plans.length === 0 && (
          <p className="text-gray-400">Nenhum plano encontrado. Clique em "Adicionar Novo Plano" para começar.</p>
        )}

        {!isLoadingPlans && !errorLoadingPlans && plans.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-700 rounded-lg">
              <thead className="bg-gray-750">
                <tr>
                  <th className="text-left text-sm text-gray-300 uppercase p-4">Nome</th>
                  <th className="text-left text-sm text-gray-300 uppercase p-4">Preço Mensal</th>
                  <th className="text-left text-sm text-gray-300 uppercase p-4">Preço Anual</th>
                  <th className="text-center text-sm text-gray-300 uppercase p-4">Status</th>
                  <th className="text-left text-sm text-gray-300 uppercase p-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-600">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-650 transition-colors">
                    <td className="text-left text-white p-4">{plan.name}</td>
                    <td className="text-left text-white p-4">R$ {plan.priceMonthly.toFixed(2).replace('.',',')}</td>
                    <td className="text-left text-white p-4">R$ {plan.priceAnnually.toFixed(2).replace('.',',')}</td>
                    <td className="text-center p-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${plan.active ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'}`}>
                        {plan.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="text-left p-4 space-x-2 whitespace-nowrap">
                      <button onClick={() => handleEdit(plan)} className="text-brandPurple hover:text-brandPurpleDark font-medium">Editar</button>
                      <button onClick={() => handleToggleActive(plan)} className={`${plan.active ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'} font-medium`}>
                        {plan.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
