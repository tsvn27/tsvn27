import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
// Ajuste o caminho para authOptions se o arquivo estiver em uma estrutura de pastas diferente.
// Se `[...nextauth]` está em `src/app/api/auth`, então o caminho abaixo deve estar correto.
import { authOptions } from '../../auth/[...nextauth]/route';
import { UserRole } from '@prisma/client';
import type { Session } from 'next-auth'; // Importa o tipo Session do NextAuth

interface RouteContext {
  params: {
    id: string;
  };
}

// GET /api/plans/:id - Obter um plano específico
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = params;
  try {
    const plan = await prisma.plan.findUnique({
      where: { id },
    });
    if (!plan) {
      return NextResponse.json({ message: 'Plano não encontrado' }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (error) {
    console.error(`Erro ao buscar plano ${id}:`, error);
    return NextResponse.json({ message: 'Erro ao buscar plano' }, { status: 500 });
  }
}

// PUT /api/plans/:id - Atualizar um plano (Admin only)
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions) as Session | null;
  const { id } = params;

  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    // Extrai apenas os campos que podem ser atualizados para evitar sobrescrever createdAt, etc.
    const {
        name,
        description,
        priceMonthly,
        priceAnnually,
        stripePriceIdMonthly,
        stripePriceIdAnnually,
        discordRoleId, // Adicionado
        features,
        active
      } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priceMonthly !== undefined) updateData.priceMonthly = parseFloat(priceMonthly);
    if (priceAnnually !== undefined) updateData.priceAnnually = parseFloat(priceAnnually);
    if (stripePriceIdMonthly !== undefined) updateData.stripePriceIdMonthly = stripePriceIdMonthly;
    if (stripePriceIdAnnually !== undefined) updateData.stripePriceIdAnnually = stripePriceIdAnnually;
    if (discordRoleId !== undefined) updateData.discordRoleId = discordRoleId === '' ? null : discordRoleId; // Permite limpar o campo
    if (features !== undefined) updateData.features = features;
    if (active !== undefined) updateData.active = active;

    // Não é necessário adicionar updatedAt manualmente, o Prisma faz isso com @updatedAt no schema

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'Nenhum dado fornecido para atualização' }, { status: 400 });
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updatedPlan);
  } catch (error: any) {
    console.error(`Erro ao atualizar plano ${id}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json({ message: 'Já existe um plano com este nome.' }, { status: 409 });
    }
    if (error.code === 'P2025') { // Erro se o registro a ser atualizado não for encontrado
        return NextResponse.json({ message: 'Plano não encontrado para atualização' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Erro ao atualizar plano', error: error.message }, { status: 500 });
  }
}

// DELETE /api/plans/:id - Deletar (ou desativar) um plano (Admin only)
// É mais comum desativar (soft delete) do que deletar permanentemente.
// Vamos implementar a desativação mudando `active` para `false`.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions) as Session | null;
  const { id } = params;

  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    // Soft delete: apenas marca como inativo
    const deactivatedPlan = await prisma.plan.update({
      where: { id },
      data: { active: false }, // updatedAt será atualizado automaticamente pelo Prisma
    });
    // Se fosse hard delete:
    // await prisma.plan.delete({ where: { id } });
    return NextResponse.json({ message: 'Plano desativado com sucesso', plan: deactivatedPlan });
  } catch (error: any) {
    console.error(`Erro ao desativar plano ${id}:`, error);
    if (error.code === 'P2025') { // Erro se o registro a ser atualizado/deletado não for encontrado
        return NextResponse.json({ message: 'Plano não encontrado para desativação' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Erro ao desativar plano', error: error.message }, { status: 500 });
  }
}
