import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { UserRole } from '@prisma/client';
import type { Session } from 'next-auth'; // Importa o tipo Session do NextAuth

// GET /api/plans - Listar planos
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null; // Usa Session do next-auth

  try {
    const isAdmin = session?.user?.role === UserRole.ADMIN || session?.user?.role === 'ADMIN';

    const queryOptions: any = {
      orderBy: { name: 'asc' }, // Ordenar por nome, por exemplo
    };

    if (!isAdmin) {
      queryOptions.where = { active: true };
    }
    // Se for admin, não adiciona 'where', então busca todos.

    const plans = await prisma.plan.findMany(queryOptions);
    return NextResponse.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json({ message: 'Erro ao buscar planos' }, { status: 500 });
  }
}

// POST /api/plans - Criar um novo plano (Admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session?.user || (session.user.role !== UserRole.ADMIN && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await req.json();
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

    // Validação básica (idealmente usar Zod ou similar)
    if (!name || priceMonthly === undefined || priceAnnually === undefined) {
      return NextResponse.json({ message: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const newPlan = await prisma.plan.create({
      data: {
        name,
        description,
        priceMonthly: parseFloat(priceMonthly),
        priceAnnually: parseFloat(priceAnnually),
        stripePriceIdMonthly,
        stripePriceIdAnnually,
        discordRoleId: discordRoleId || null, // Adicionado, pode ser null
        features: features || [],
        active: active !== undefined ? active : true,
      },
    });
    return NextResponse.json(newPlan, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar plano:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return NextResponse.json({ message: 'Já existe um plano com este nome.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Erro ao criar plano', error: error.message }, { status: 500 });
  }
}
