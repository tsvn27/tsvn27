// Tipos compartilhados

export interface Plano {
  id: string;
  name: string; // Nome do plano, era 'nome'
  description?: string | null;
  priceMonthly: number; // Era 'precoMensal'
  priceAnnually: number; // Era 'precoAnual'
  features: string[]; // Era 'beneficios'
  active: boolean;
  stripePriceIdMonthly?: string | null;
  stripePriceIdAnnually?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // O campo 'popular' pode ser adicionado ao modelo Prisma e aqui se necessário
}

// Este tipo será usado pelo componente PlanoCard
export interface PlanoCardComponentData extends Omit<Plano, 'priceMonthly' | 'priceAnnually' | 'active' | 'createdAt' | 'updatedAt' | 'stripePriceIdMonthly' | 'stripePriceIdAnnually' | 'description' | 'name' | 'features'> {
  nome: string; // Mantendo 'nome' para o card
  precoMensal: number;
  precoMensalFormatted: string;
  precoAnual: number;
  precoAnualFormatted: string;
  beneficios: string[]; // Mantendo 'beneficios' para o card
  popular?: boolean; // Opcional, pode ser determinado no frontend ou backend
}
