import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, requireRole, ROLES } from '@/lib/auth'

type CleanupRule = 'TRIM_WHITESPACE' | 'NORMALIZE_CASE' | 'FIX_ACCENTS' | 'DEDUPLICATE_CUSTOMERS' | 'REMOVE_EMPTY'

function normalizeCase(s: string): string {
  if (!s) return s
  return s
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function fixAccents(s: string): string {
  if (!s) return s
  // Normalize to NFC (composed form) to fix decomposed accents
  return s.normalize('NFC')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!requireRole(user.role, [ROLES.FPA_ANALYST, ROLES.FPA_DIRECTOR, ROLES.ADMIN])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { rules } = body as { rules: CleanupRule[] }

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return NextResponse.json({ error: 'rules array is required' }, { status: 400 })
    }

    const summary: Record<string, number> = {}

    // TRIM_WHITESPACE: trim leading/trailing whitespace from text fields
    if (rules.includes('TRIM_WHITESPACE')) {
      let trimmed = 0

      // Articles
      const articles = await prisma.article.findMany({ select: { id: true, name: true } })
      for (const a of articles) {
        const trimmedName = a.name.trim()
        if (trimmedName !== a.name) {
          await prisma.article.update({ where: { id: a.id }, data: { name: trimmedName } })
          trimmed++
        }
      }

      // Customers
      const customers = await prisma.customer.findMany({ select: { id: true, name: true } })
      for (const c of customers) {
        const trimmedName = c.name.trim()
        if (trimmedName !== c.name) {
          await prisma.customer.update({ where: { id: c.id }, data: { name: trimmedName } })
          trimmed++
        }
      }

      // Sales Reps
      const reps = await prisma.salesRep.findMany({ select: { id: true, name: true } })
      for (const r of reps) {
        const trimmedName = r.name.trim()
        if (trimmedName !== r.name) {
          await prisma.salesRep.update({ where: { id: r.id }, data: { name: trimmedName } })
          trimmed++
        }
      }

      summary['TRIM_WHITESPACE'] = trimmed
    }

    // NORMALIZE_CASE: capitalize first letter, lowercase rest for names
    if (rules.includes('NORMALIZE_CASE')) {
      let normalized = 0

      const articles = await prisma.article.findMany({ select: { id: true, name: true } })
      for (const a of articles) {
        const newName = normalizeCase(a.name)
        if (newName !== a.name) {
          await prisma.article.update({ where: { id: a.id }, data: { name: newName } })
          normalized++
        }
      }

      const customers = await prisma.customer.findMany({ select: { id: true, name: true } })
      for (const c of customers) {
        const newName = normalizeCase(c.name)
        if (newName !== c.name) {
          await prisma.customer.update({ where: { id: c.id }, data: { name: newName } })
          normalized++
        }
      }

      const reps = await prisma.salesRep.findMany({ select: { id: true, name: true } })
      for (const r of reps) {
        const newName = normalizeCase(r.name)
        if (newName !== r.name) {
          await prisma.salesRep.update({ where: { id: r.id }, data: { name: newName } })
          normalized++
        }
      }

      summary['NORMALIZE_CASE'] = normalized
    }

    // FIX_ACCENTS: normalize unicode accents
    if (rules.includes('FIX_ACCENTS')) {
      let fixed = 0

      const articles = await prisma.article.findMany({ select: { id: true, name: true } })
      for (const a of articles) {
        const newName = fixAccents(a.name)
        if (newName !== a.name) {
          await prisma.article.update({ where: { id: a.id }, data: { name: newName } })
          fixed++
        }
      }

      const customers = await prisma.customer.findMany({ select: { id: true, name: true } })
      for (const c of customers) {
        const newName = fixAccents(c.name)
        if (newName !== c.name) {
          await prisma.customer.update({ where: { id: c.id }, data: { name: newName } })
          fixed++
        }
      }

      const reps = await prisma.salesRep.findMany({ select: { id: true, name: true } })
      for (const r of reps) {
        const newName = fixAccents(r.name)
        if (newName !== r.name) {
          await prisma.salesRep.update({ where: { id: r.id }, data: { name: newName } })
          fixed++
        }
      }

      summary['FIX_ACCENTS'] = fixed
    }

    // DEDUPLICATE_CUSTOMERS: merge customers with same name (different codes)
    if (rules.includes('DEDUPLICATE_CUSTOMERS')) {
      let merged = 0

      const customers = await prisma.customer.findMany({
        select: { id: true, code: true, name: true, _count: { select: { salesHistory: true } } },
      })

      // Group by normalized name
      const byName = new Map<string, typeof customers>()
      for (const c of customers) {
        const key = c.name.trim().toLowerCase()
        const group = byName.get(key) || []
        group.push(c)
        byName.set(key, group)
      }

      for (const [, group] of byName) {
        if (group.length <= 1) continue

        // Keep the customer with the most sales history
        group.sort((a, b) => b._count.salesHistory - a._count.salesHistory)
        const keeper = group[0]
        const duplicates = group.slice(1)

        for (const dup of duplicates) {
          // Reassign sales history from duplicate to keeper
          await prisma.articleSalesHistory.updateMany({
            where: { customerId: dup.id },
            data: { customerId: keeper.id },
          })

          // Delete the duplicate customer
          await prisma.customer.delete({ where: { id: dup.id } })
          merged++
        }
      }

      summary['DEDUPLICATE_CUSTOMERS'] = merged
    }

    // REMOVE_EMPTY: remove articles/customers with no sales history
    if (rules.includes('REMOVE_EMPTY')) {
      let removed = 0

      // Find articles with no sales history
      const emptyArticles = await prisma.article.findMany({
        where: { salesHistory: { none: {} } },
        select: { id: true },
      })
      if (emptyArticles.length > 0) {
        await prisma.article.deleteMany({
          where: { id: { in: emptyArticles.map(a => a.id) } },
        })
        removed += emptyArticles.length
      }

      // Find customers with no sales history
      const emptyCustomers = await prisma.customer.findMany({
        where: { salesHistory: { none: {} } },
        select: { id: true },
      })
      if (emptyCustomers.length > 0) {
        await prisma.customer.deleteMany({
          where: { id: { in: emptyCustomers.map(c => c.id) } },
        })
        removed += emptyCustomers.length
      }

      summary['REMOVE_EMPTY'] = removed
    }

    return NextResponse.json({
      success: true,
      summary,
      totalChanges: Object.values(summary).reduce((a, b) => a + b, 0),
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
