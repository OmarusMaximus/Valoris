# Valoris - FP&A Costing Tool

## Overview

Valoris is a FP&A (Financial Planning & Analysis) costing tool for a multi-entity industrial group (FR, CH, MA, ML, CI, SN, KE) that manufactures composted fertilizers (powder + granules), biostimulants, biocontrol products, and distributes third-party products.

## Key Business Rules

1. **Long production cycle**: Composting takes 3-6 months. Monthly yield cannot be isolated. **Yield** (rendement) = ratio PF/MP consumed, calculated over the complete cycle, not month by month.
2. **Terminology**: Use "rendement" (yield), NOT "taux de perte" (loss rate).
3. **PSF (WIP) Valuation**: Cost of RM engaged + share of transformation costs (% advancement entered by FP&A analyst).
4. **Contribution Margin** includes: commercial costs (bonuses, commissions) + variable production costs (temp workers, equipment rental, consumables).
5. **Costing Method**: CUMP/FIFO/Standard — only FPA_DIRECTOR can change.
6. **Workflow**: Analyst submits → Director validates → GM + Local Finance notified.

## Monthly Closing Cycle

1. PRODUCTION/SUPPLY → Monthly input (RM quantities, prices, FP/PSF volumes, stocks)
2. FP&A IMPORT → Import P&L (Board.com or Sage X3) with account mapping
3. FP&A ANALYSIS → Analytical reallocations between centers/products
4. FP&A VALUATION → Month-end stock valuation (PSF = RM cost + % transformation)
5. COST CALCULATION → Cost per product (CUMP/FIFO/Standard method)
6. WORKFLOW → Analyst submits → Director validates → GM + Local Finance notified

## Tech Stack

- **Next.js 14** (App Router) + TypeScript + TailwindCSS
- **Prisma** + SQLite
- **JWT** auth with RBAC (cookie-based)
- **next-intl** (FR/EN)
- **recharts** for charts
- **Zustand** for state management
- **shadcn/ui** component patterns

## Roles

- `ADMIN` — system administration
- `FPA_DIRECTOR` — validation + sole authority to modify costing method
- `FPA_ANALYST` — import, reallocations, valuation, calculation, submission
- `PRODUCTION_MANAGER` / `SUPPLY_MANAGER` — volume + price input
- `SUBSIDIARY_MANAGER` / `LOCAL_FINANCE_MANAGER` — notification only

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated layout (sidebar + header)
│   │   ├── page.tsx        # Dashboard
│   │   ├── products/       # Product catalog + BOM
│   │   ├── production/     # Monthly production input
│   │   ├── import/         # Accounting data import
│   │   ├── reallocations/  # Analytical reallocations
│   │   ├── stock-valuation/# Month-end stock valuation
│   │   ├── cost-sheets/    # Cost sheets + workflow
│   │   ├── scenarios/      # What-if scenarios (Phase 5)
│   │   ├── settings/       # Configuration
│   │   └── notifications/  # Notifications
│   ├── api/                # API routes
│   └── login/              # Login page
├── components/
│   ├── layout/             # Sidebar, Header
│   └── ui/                 # shadcn/ui components
├── generated/prisma/       # Generated Prisma client
├── i18n/                   # Internationalization (FR/EN)
├── lib/                    # Utilities (auth, prisma, cost-engine, excel-import)
└── store/                  # Zustand store
```

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:seed      # Seed database
npm run db:reset     # Reset DB + reseed
```

## Test Accounts

| Email | Role | Password |
|-------|------|----------|
| admin@valoris.com | ADMIN | password123 |
| director@valoris.com | FPA_DIRECTOR | password123 |
| analyst@valoris.com | FPA_ANALYST | password123 |
| production@valoris.com | PRODUCTION_MANAGER | password123 |
| supply@valoris.com | SUPPLY_MANAGER | password123 |
| gm@valoris.com | SUBSIDIARY_MANAGER | password123 |
| finance@valoris.com | LOCAL_FINANCE_MANAGER | password123 |

## Entities

| Code | Name | Country | Currency |
|------|------|---------|----------|
| FR | Valoris France | France | EUR |
| CH | Valoris Suisse | Suisse | CHF |
| MA | Valoris Maroc | Maroc | MAD |
| ML | Valoris Mali | Mali | XOF |
| CI | Valoris Côte d'Ivoire | Côte d'Ivoire | XOF |
| SN | Valoris Sénégal | Sénégal | XOF |
| KE | Valoris Kenya | Kenya | KES |

## Data Model

Key tables: User, Entity, Product, ProductCategory, BOMItem, ProductionEntry, ImportSession, ImportLine, CostCategory, AccountMapping, AllocationRule, Reallocation, StockValuation, CostSheet, CostSheetLine, Budget, Notification, SystemSetting.

## Phases

- **Phase 0**: Setup Next.js 14 + Prisma + Auth + i18n + Layout ✅
- **Phase 1**: Prisma schema + seed data + API CRUD products/categories ✅
- **Phase 2**: Production input + Accounting Excel import ✅
- **Phase 3**: Reallocations + Stock valuation + Cost calculation engine ✅
- **Phase 4**: Validation workflow + Dashboard + Margins ✅
- **Phase 5**: What-if scenario comparator (planned)
