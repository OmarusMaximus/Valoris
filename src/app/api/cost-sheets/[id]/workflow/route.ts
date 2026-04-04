import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejectionReason } = body

    if (!action || !['submit', 'validate', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be submit, validate, or reject' },
        { status: 400 }
      )
    }

    const costSheet = await prisma.costSheet.findUnique({
      where: { id },
      include: { entity: true },
    })

    if (!costSheet) {
      return NextResponse.json(
        { error: 'Cost sheet not found' },
        { status: 404 }
      )
    }

    if (action === 'submit') {
      if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.ADMIN])) {
        return NextResponse.json(
          { error: 'Only FPA Analyst can submit cost sheets' },
          { status: 403 }
        )
      }

      if (costSheet.status !== 'DRAFT' && costSheet.status !== 'REJECTED') {
        return NextResponse.json(
          { error: 'Can only submit DRAFT or REJECTED cost sheets' },
          { status: 400 }
        )
      }

      const updated = await prisma.costSheet.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submittedById: user.id,
          submittedAt: new Date(),
          rejectionReason: null,
        },
      })

      // Notify FPA Directors
      const fpaDirectors = await prisma.user.findMany({
        where: { role: ROLES.FPA_DIRECTOR, active: true },
      })

      await prisma.notification.createMany({
        data: fpaDirectors.map((director) => ({
          userId: director.id,
          costSheetId: id,
          type: 'COST_SHEET_SUBMITTED',
          message: `Cost sheet for ${costSheet.entity.name} - ${costSheet.period} has been submitted for validation.`,
        })),
      })

      return NextResponse.json(updated)
    }

    if (action === 'validate') {
      if (!requireRole(user.role, [ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
        return NextResponse.json(
          { error: 'Only FPA Director can validate cost sheets' },
          { status: 403 }
        )
      }

      if (costSheet.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Can only validate SUBMITTED cost sheets' },
          { status: 400 }
        )
      }

      const updated = await prisma.costSheet.update({
        where: { id },
        data: {
          status: 'VALIDATED',
          validatedById: user.id,
          validatedAt: new Date(),
        },
      })

      // Notify subsidiary and local finance managers
      const managersToNotify = await prisma.user.findMany({
        where: {
          role: {
            in: [ROLES.SUBSIDIARY_MANAGER, ROLES.LOCAL_FINANCE_MANAGER],
          },
          active: true,
          entityId: costSheet.entityId,
        },
      })

      await prisma.notification.createMany({
        data: managersToNotify.map((manager) => ({
          userId: manager.id,
          costSheetId: id,
          type: 'COST_SHEET_VALIDATED',
          message: `Cost sheet for ${costSheet.entity.name} - ${costSheet.period} has been validated.`,
        })),
      })

      return NextResponse.json(updated)
    }

    if (action === 'reject') {
      if (!requireRole(user.role, [ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
        return NextResponse.json(
          { error: 'Only FPA Director can reject cost sheets' },
          { status: 403 }
        )
      }

      if (costSheet.status !== 'SUBMITTED') {
        return NextResponse.json(
          { error: 'Can only reject SUBMITTED cost sheets' },
          { status: 400 }
        )
      }

      const updated = await prisma.costSheet.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason || null,
        },
      })

      // Notify the submitting FPA Analyst
      if (costSheet.submittedById) {
        await prisma.notification.create({
          data: {
            userId: costSheet.submittedById,
            costSheetId: id,
            type: 'COST_SHEET_REJECTED',
            message: `Cost sheet for ${costSheet.entity.name} - ${costSheet.period} has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
          },
        })
      }

      return NextResponse.json(updated)
    }
  } catch (error) {
    console.error('Cost sheet workflow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
