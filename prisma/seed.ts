import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

const adapter = new PrismaLibSql({ url: 'file:prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Valoris FP&A database...\n');

  await prisma.$transaction(async (tx) => {
    // ============================================================
    // 1. ENTITIES
    // ============================================================
    console.log('Creating entities...');

    const entities = [
      { code: 'FR', name: 'Valoris France', country: 'France', currency: 'EUR' },
      { code: 'CH', name: 'Valoris Suisse', country: 'Suisse', currency: 'CHF' },
      { code: 'MA', name: 'Valoris Maroc', country: 'Maroc', currency: 'MAD' },
      { code: 'ML', name: 'Valoris Mali', country: 'Mali', currency: 'XOF' },
      { code: 'CI', name: "Valoris Côte d'Ivoire", country: "Côte d'Ivoire", currency: 'XOF' },
      { code: 'SN', name: 'Valoris Sénégal', country: 'Sénégal', currency: 'XOF' },
      { code: 'KE', name: 'Valoris Kenya', country: 'Kenya', currency: 'KES' },
    ];

    const entityMap: Record<string, string> = {};
    for (const e of entities) {
      const entity = await tx.entity.upsert({
        where: { code: e.code },
        update: { name: e.name, country: e.country, currency: e.currency },
        create: e,
      });
      entityMap[e.code] = entity.id;
    }
    console.log(`  ✓ ${entities.length} entities created`);

    // ============================================================
    // 2. USERS
    // ============================================================
    console.log('Creating users...');

    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      { email: 'admin@valoris.com', firstName: 'Admin', lastName: 'Système', role: 'ADMIN', entityId: null },
      { email: 'director@valoris.com', firstName: 'Marie', lastName: 'Dupont', role: 'FPA_DIRECTOR', entityId: entityMap.FR },
      { email: 'analyst@valoris.com', firstName: 'Pierre', lastName: 'Martin', role: 'FPA_ANALYST', entityId: entityMap.FR },
      { email: 'production@valoris.com', firstName: 'Jean', lastName: 'Durand', role: 'PRODUCTION_MANAGER', entityId: entityMap.FR },
      { email: 'supply@valoris.com', firstName: 'Sophie', lastName: 'Lefebvre', role: 'SUPPLY_MANAGER', entityId: entityMap.FR },
      { email: 'gm@valoris.com', firstName: 'François', lastName: 'Bernard', role: 'SUBSIDIARY_MANAGER', entityId: entityMap.FR },
      { email: 'finance@valoris.com', firstName: 'Claire', lastName: 'Moreau', role: 'LOCAL_FINANCE_MANAGER', entityId: entityMap.FR },
    ];

    const userMap: Record<string, string> = {};
    for (const u of users) {
      const user = await tx.user.upsert({
        where: { email: u.email },
        update: { firstName: u.firstName, lastName: u.lastName, role: u.role, entityId: u.entityId },
        create: { ...u, passwordHash },
      });
      userMap[u.email] = user.id;
    }
    console.log(`  ✓ ${users.length} users created`);

    // ============================================================
    // 3. PRODUCT CATEGORIES
    // ============================================================
    console.log('Creating product categories...');

    const categories = [
      { code: 'CAT_PF', name: 'Produit fini', type: 'FINISHED_PRODUCT' },
      { code: 'CAT_MP', name: 'Matière première', type: 'RAW_MATERIAL' },
      { code: 'CAT_PSF', name: 'Produit semi-fini', type: 'SEMI_FINISHED' },
      { code: 'CAT_EMB', name: 'Emballage', type: 'PACKAGING' },
      { code: 'CAT_TIERS', name: 'Produit tiers', type: 'THIRD_PARTY' },
    ];

    const catMap: Record<string, string> = {};
    for (const c of categories) {
      const cat = await tx.productCategory.upsert({
        where: { code: c.code },
        update: { name: c.name, type: c.type },
        create: c,
      });
      catMap[c.code] = cat.id;
    }
    console.log(`  ✓ ${categories.length} product categories created`);

    // ============================================================
    // 4. PRODUCTS
    // ============================================================
    console.log('Creating products...');

    const products = [
      { code: 'PF-COMP-P01', name: 'Compost Poudre Premium', categoryId: catMap.CAT_PF, family: 'engrais_poudre', unit: 'KG' },
      { code: 'PF-COMP-G01', name: 'Compost Granulés Standard', categoryId: catMap.CAT_PF, family: 'engrais_granules', unit: 'KG' },
      { code: 'PF-BIO-S01', name: 'Biostimulant Racinaire', categoryId: catMap.CAT_PF, family: 'biostimulant', unit: 'L' },
      { code: 'PF-BIO-C01', name: 'Agent Biocontrôle Foliaire', categoryId: catMap.CAT_PF, family: 'biocontrole', unit: 'L' },
      { code: 'PF-DIST-01', name: 'Engrais NPK Tiers', categoryId: catMap.CAT_TIERS, family: 'distribution', unit: 'KG' },
      { code: 'MP-ORG-01', name: 'Matière organique brute', categoryId: catMap.CAT_MP, family: null, unit: 'KG' },
      { code: 'MP-MIN-01', name: 'Amendement minéral', categoryId: catMap.CAT_MP, family: null, unit: 'KG' },
      { code: 'MP-BIO-01', name: 'Souches microbiennes', categoryId: catMap.CAT_MP, family: null, unit: 'L' },
      { code: 'EMB-SAC-25', name: 'Sac 25kg', categoryId: catMap.CAT_EMB, family: null, unit: 'UNIT' },
      { code: 'EMB-BIG-01', name: 'Big bag 500kg', categoryId: catMap.CAT_EMB, family: null, unit: 'UNIT' },
      { code: 'PSF-COMP-01', name: 'Compost en cours de maturation', categoryId: catMap.CAT_PSF, family: 'engrais_poudre', unit: 'KG' },
    ];

    const productMap: Record<string, string> = {};
    for (const p of products) {
      const product = await tx.product.upsert({
        where: { code: p.code },
        update: { name: p.name, categoryId: p.categoryId, family: p.family, unit: p.unit, entityId: entityMap.FR },
        create: { ...p, entityId: entityMap.FR },
      });
      productMap[p.code] = product.id;
    }
    console.log(`  ✓ ${products.length} products created`);

    // ============================================================
    // 5. BOM ITEMS (for Compost Poudre Premium)
    // ============================================================
    console.log('Creating BOM items...');

    const bomItems = [
      { parentProductId: productMap['PF-COMP-P01'], childProductId: productMap['MP-ORG-01'], quantity: 1.2, unit: 'KG', yieldRate: 0.85 },
      { parentProductId: productMap['PF-COMP-P01'], childProductId: productMap['MP-MIN-01'], quantity: 0.15, unit: 'KG', yieldRate: 1.0 },
      { parentProductId: productMap['PF-COMP-P01'], childProductId: productMap['EMB-SAC-25'], quantity: 0.04, unit: 'UNIT', yieldRate: 1.0 },
    ];

    for (const bom of bomItems) {
      await tx.bOMItem.upsert({
        where: {
          parentProductId_childProductId: {
            parentProductId: bom.parentProductId,
            childProductId: bom.childProductId,
          },
        },
        update: { quantity: bom.quantity, unit: bom.unit, yieldRate: bom.yieldRate },
        create: bom,
      });
    }
    console.log(`  ✓ ${bomItems.length} BOM items created`);

    // ============================================================
    // 6. COST CATEGORIES
    // ============================================================
    console.log('Creating cost categories...');

    const costCategories = [
      { code: 'CC_MP', name: 'Matières premières', type: 'MP', isVariable: true, includeInContributionMargin: false, sortOrder: 1 },
      { code: 'CC_MOD', name: "Main d'oeuvre directe", type: 'MOD', isVariable: true, includeInContributionMargin: false, sortOrder: 2 },
      { code: 'CC_INTERIM', name: 'Intérimaires production', type: 'OVERHEAD_PROD', isVariable: true, includeInContributionMargin: true, sortOrder: 3 },
      { code: 'CC_LOCATION', name: 'Location matériel', type: 'OVERHEAD_PROD', isVariable: true, includeInContributionMargin: true, sortOrder: 4 },
      { code: 'CC_CONSO', name: 'Consommables production', type: 'OVERHEAD_PROD', isVariable: true, includeInContributionMargin: true, sortOrder: 5 },
      { code: 'CC_ENERGIE', name: 'Énergie', type: 'OVERHEAD_PROD', isVariable: false, includeInContributionMargin: false, sortOrder: 6 },
      { code: 'CC_MAINT', name: 'Maintenance', type: 'OVERHEAD_PROD', isVariable: false, includeInContributionMargin: false, sortOrder: 7 },
      { code: 'CC_AMORT', name: 'Amortissements', type: 'OVERHEAD_PROD', isVariable: false, includeInContributionMargin: false, sortOrder: 8 },
      { code: 'CC_BONUS', name: 'Bonus commerciaux', type: 'COMMERCIAL', isVariable: true, includeInContributionMargin: true, sortOrder: 9 },
      { code: 'CC_COMMISSION', name: 'Commissions', type: 'COMMERCIAL', isVariable: true, includeInContributionMargin: true, sortOrder: 10 },
      { code: 'CC_TRANSPORT', name: 'Transport', type: 'LOGISTICS', isVariable: true, includeInContributionMargin: false, sortOrder: 11 },
      { code: 'CC_ADMIN', name: 'Frais administratifs', type: 'ADMIN', isVariable: false, includeInContributionMargin: false, sortOrder: 12 },
    ];

    const ccMap: Record<string, string> = {};
    for (const cc of costCategories) {
      const cat = await tx.costCategory.upsert({
        where: { code: cc.code },
        update: {
          name: cc.name,
          type: cc.type,
          isVariable: cc.isVariable,
          includeInContributionMargin: cc.includeInContributionMargin,
          sortOrder: cc.sortOrder,
        },
        create: cc,
      });
      ccMap[cc.code] = cat.id;
    }
    console.log(`  ✓ ${costCategories.length} cost categories created`);

    // ============================================================
    // 7. ACCOUNT MAPPINGS (Board.com source)
    // ============================================================
    console.log('Creating account mappings...');

    const accountMappings = [
      { accountCode: '601xxx', accountName: 'Achats matières premières', costCategoryId: ccMap.CC_MP, source: 'BOARD_COM' },
      { accountCode: '641xxx', accountName: 'Rémunérations du personnel', costCategoryId: ccMap.CC_MOD, source: 'BOARD_COM' },
      { accountCode: '621xxx', accountName: 'Personnel extérieur', costCategoryId: ccMap.CC_INTERIM, source: 'BOARD_COM' },
      { accountCode: '613xxx', accountName: 'Locations', costCategoryId: ccMap.CC_LOCATION, source: 'BOARD_COM' },
      { accountCode: '606xxx', accountName: 'Achats non stockés', costCategoryId: ccMap.CC_CONSO, source: 'BOARD_COM' },
      { accountCode: '6061xx', accountName: 'Fournitures énergie', costCategoryId: ccMap.CC_ENERGIE, source: 'BOARD_COM' },
      { accountCode: '615xxx', accountName: 'Entretien et réparations', costCategoryId: ccMap.CC_MAINT, source: 'BOARD_COM' },
      { accountCode: '681xxx', accountName: 'Dotations amortissements', costCategoryId: ccMap.CC_AMORT, source: 'BOARD_COM' },
      { accountCode: '709xxx', accountName: 'RFA et remises', costCategoryId: ccMap.CC_BONUS, source: 'BOARD_COM' },
      { accountCode: '622xxx', accountName: 'Commissions intermédiaires', costCategoryId: ccMap.CC_COMMISSION, source: 'BOARD_COM' },
      { accountCode: '624xxx', accountName: 'Transport sur ventes', costCategoryId: ccMap.CC_TRANSPORT, source: 'BOARD_COM' },
      { accountCode: '627xxx', accountName: 'Frais bancaires et admin', costCategoryId: ccMap.CC_ADMIN, source: 'BOARD_COM' },
    ];

    for (const am of accountMappings) {
      await tx.accountMapping.upsert({
        where: {
          accountCode_source: {
            accountCode: am.accountCode,
            source: am.source,
          },
        },
        update: { accountName: am.accountName, costCategoryId: am.costCategoryId },
        create: am,
      });
    }
    console.log(`  ✓ ${accountMappings.length} account mappings created`);

    // ============================================================
    // 8. SAMPLE PRODUCTION ENTRIES (FR, period 2026-03)
    // ============================================================
    console.log('Creating production entries...');

    const productionUserId = userMap['production@valoris.com'];
    const prodEntries = [
      {
        entityId: entityMap.FR,
        productId: productMap['PF-COMP-P01'],
        period: '2026-03',
        enteredById: productionUserId,
        qtyProduced: 50000,
        qtyConsumedMP: 60000,
        unitPriceMP: 0.45,
        stockInitial: 15000,
        stockFinal: 20000,
        qtyPSF: 10000,
        psfAdvancement: 0.6,
      },
      {
        entityId: entityMap.FR,
        productId: productMap['PF-COMP-G01'],
        period: '2026-03',
        enteredById: productionUserId,
        qtyProduced: 30000,
        qtyConsumedMP: 36000,
        unitPriceMP: 0.50,
        stockInitial: 8000,
        stockFinal: 12000,
        qtyPSF: 5000,
        psfAdvancement: 0.4,
      },
    ];

    for (const pe of prodEntries) {
      await tx.productionEntry.upsert({
        where: {
          entityId_productId_period: {
            entityId: pe.entityId,
            productId: pe.productId,
            period: pe.period,
          },
        },
        update: {
          qtyProduced: pe.qtyProduced,
          qtyConsumedMP: pe.qtyConsumedMP,
          unitPriceMP: pe.unitPriceMP,
          stockInitial: pe.stockInitial,
          stockFinal: pe.stockFinal,
          qtyPSF: pe.qtyPSF,
          psfAdvancement: pe.psfAdvancement,
        },
        create: pe,
      });
    }
    console.log(`  ✓ ${prodEntries.length} production entries created`);

    // ============================================================
    // 9. SAMPLE BUDGET DATA (FR, Jan-Jun 2026)
    // ============================================================
    console.log('Creating budget data...');

    const periods = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    const budgetLines: Array<{
      entityId: string;
      period: string;
      productFamily: string;
      costCategoryCode: string | null;
      amount: number;
      revenue: number;
    }> = [];

    // Revenue budgets per product family
    const familyRevenue: Record<string, number> = {
      engrais_poudre: 150000,
      engrais_granules: 120000,
      biostimulant: 80000,
      biocontrole: 60000,
      distribution: 45000,
    };

    for (const period of periods) {
      // Monthly multiplier: slight seasonality (Q1 lower, Q2 higher)
      const monthIdx = parseInt(period.split('-')[1]);
      const seasonality = monthIdx <= 3 ? 0.85 : 1.15;

      for (const [family, baseRevenue] of Object.entries(familyRevenue)) {
        // Revenue line (no cost category)
        budgetLines.push({
          entityId: entityMap.FR,
          period,
          productFamily: family,
          costCategoryCode: null,
          amount: 0,
          revenue: Math.round(baseRevenue * seasonality),
        });

        // Cost lines for key categories
        const costAllocations: Record<string, number> = {
          CC_MP: baseRevenue * 0.35,
          CC_MOD: baseRevenue * 0.10,
          CC_INTERIM: baseRevenue * 0.03,
          CC_ENERGIE: baseRevenue * 0.05,
          CC_TRANSPORT: baseRevenue * 0.04,
          CC_ADMIN: baseRevenue * 0.06,
        };

        for (const [ccCode, baseCost] of Object.entries(costAllocations)) {
          budgetLines.push({
            entityId: entityMap.FR,
            period,
            productFamily: family,
            costCategoryCode: ccCode,
            amount: Math.round(baseCost * seasonality),
            revenue: 0,
          });
        }
      }
    }

    for (const bl of budgetLines) {
      await tx.budget.upsert({
        where: {
          entityId_period_productFamily_costCategoryCode: {
            entityId: bl.entityId,
            period: bl.period,
            productFamily: bl.productFamily,
            costCategoryCode: bl.costCategoryCode ?? '',
          },
        },
        update: { amount: bl.amount, revenue: bl.revenue },
        create: {
          entityId: bl.entityId,
          period: bl.period,
          productFamily: bl.productFamily,
          costCategoryCode: bl.costCategoryCode,
          amount: bl.amount,
          revenue: bl.revenue,
        },
      });
    }
    console.log(`  ✓ ${budgetLines.length} budget lines created`);

    // ============================================================
    // 10. SYSTEM SETTINGS
    // ============================================================
    console.log('Creating system settings...');

    await tx.systemSetting.upsert({
      where: { key: 'defaultCostingMethod' },
      update: { value: 'CUMP' },
      create: { key: 'defaultCostingMethod', value: 'CUMP' },
    });
    console.log('  ✓ System settings configured');
  });

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
