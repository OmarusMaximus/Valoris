import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';
import fs from 'fs';

import path from 'path';
const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
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
      { code: 'PF-AMEO-P01', name: 'Compost Premium Poudre', categoryId: catMap.CAT_PF, family: 'AMEO', formulation: 'POUDRE', origin: 'GROUPE_LOCAL', unit: 'KG' },
      { code: 'PF-AMEO-G01', name: 'Compost Standard Granulé', categoryId: catMap.CAT_PF, family: 'AMEO', formulation: 'GRANULE', origin: 'GROUPE_LOCAL', unit: 'KG' },
      { code: 'PF-BIO-S01', name: 'Biostimulant Racinaire', categoryId: catMap.CAT_PF, family: 'BIOSTIMULANT', formulation: 'LIQUIDE', origin: 'GROUPE_LOCAL', unit: 'L' },
      { code: 'PF-BIO-C01', name: 'Biocontrôle Foliaire', categoryId: catMap.CAT_PF, family: 'BIOCONTROLE', formulation: 'WP', origin: 'GROUPE_LOCAL', unit: 'KG' },
      { code: 'PF-CC-01', name: 'Correcteur Fer-Zinc', categoryId: catMap.CAT_PF, family: 'CORRECTEUR_CARENCES', formulation: 'LIQUIDE', origin: 'GROUPE_IMPORTE', unit: 'L' },
      { code: 'PF-DIV-01', name: 'Engrais NPK Tiers', categoryId: catMap.CAT_TIERS, family: 'DIVERS', formulation: 'GRANULE', origin: 'TIERS', unit: 'KG' },
      { code: 'MP-ORG-01', name: 'Matière organique brute', categoryId: catMap.CAT_MP, family: null, formulation: null, origin: 'GROUPE_LOCAL', unit: 'KG' },
      { code: 'MP-MIN-01', name: 'Amendement minéral', categoryId: catMap.CAT_MP, family: null, formulation: null, origin: 'GROUPE_IMPORTE', unit: 'KG' },
      { code: 'MP-BIO-01', name: 'Souches microbiennes', categoryId: catMap.CAT_MP, family: null, formulation: null, origin: 'GROUPE_IMPORTE', unit: 'L' },
      { code: 'EMB-SAC-25', name: 'Sac 25kg', categoryId: catMap.CAT_EMB, family: null, formulation: null, origin: 'GROUPE_LOCAL', unit: 'UNIT' },
      { code: 'EMB-BIG-01', name: 'Big bag 500kg', categoryId: catMap.CAT_EMB, family: null, formulation: null, origin: 'GROUPE_LOCAL', unit: 'UNIT' },
      { code: 'PSF-COMP-01', name: 'Compost en cours de maturation', categoryId: catMap.CAT_PSF, family: 'AMEO', formulation: 'POUDRE', origin: 'GROUPE_LOCAL', unit: 'KG' },
    ];

    const productMap: Record<string, string> = {};
    for (const p of products) {
      const product = await tx.product.upsert({
        where: { code: p.code },
        update: { name: p.name, categoryId: p.categoryId, family: p.family, formulation: p.formulation, origin: p.origin, unit: p.unit, entityId: entityMap.FR },
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
      { parentProductId: productMap['PF-AMEO-P01'], childProductId: productMap['MP-ORG-01'], quantity: 1.2, unit: 'KG', yieldRate: 0.85 },
      { parentProductId: productMap['PF-AMEO-P01'], childProductId: productMap['MP-MIN-01'], quantity: 0.15, unit: 'KG', yieldRate: 1.0 },
      { parentProductId: productMap['PF-AMEO-P01'], childProductId: productMap['EMB-SAC-25'], quantity: 0.04, unit: 'UNIT', yieldRate: 1.0 },
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
    // 5b. ARTICLES (Sales packaging of products)
    // ============================================================
    console.log('Creating articles...');

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'articles');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const articleDefs = [
      { code: 'ART-AMEO-P01-25', name: 'Compost Premium Poudre 25kg', productCode: 'PF-AMEO-P01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 25, contentUnit: 'KG', catalogPrice: 18.50, standardCost: 12.30 },
      { code: 'ART-AMEO-P01-500', name: 'Compost Premium Poudre Big Bag 500kg', productCode: 'PF-AMEO-P01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 500, contentUnit: 'KG', catalogPrice: 320, standardCost: 215 },
      { code: 'ART-AMEO-G01-25', name: 'Compost Granulé 25kg', productCode: 'PF-AMEO-G01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 25, contentUnit: 'KG', catalogPrice: 22.00, standardCost: 14.80 },
      { code: 'ART-AMEO-G01-500', name: 'Compost Granulé Big Bag 500kg', productCode: 'PF-AMEO-G01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 500, contentUnit: 'KG', catalogPrice: 380, standardCost: 258 },
      { code: 'ART-BIO-S01-1', name: 'Biostimulant Racinaire 1L', productCode: 'PF-BIO-S01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 1, contentUnit: 'L', catalogPrice: 35.00, standardCost: 18.50 },
      { code: 'ART-BIO-S01-5', name: 'Biostimulant Racinaire 5L', productCode: 'PF-BIO-S01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 5, contentUnit: 'L', catalogPrice: 155.00, standardCost: 82.00 },
      { code: 'ART-BIO-S01-20', name: 'Biostimulant Racinaire 20L', productCode: 'PF-BIO-S01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 20, contentUnit: 'L', catalogPrice: 560.00, standardCost: 295.00 },
      { code: 'ART-BIO-C01-1', name: 'Biocontrôle Foliaire 1kg', productCode: 'PF-BIO-C01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 1, contentUnit: 'KG', catalogPrice: 42.00, standardCost: 22.00 },
      { code: 'ART-CC-01-1', name: 'Correcteur Fer-Zinc 1L', productCode: 'PF-CC-01', stockUnit: 'UNIT', salesUnit: 'UNIT', contentQty: 1, contentUnit: 'L', catalogPrice: 28.00, standardCost: 15.00 },
    ];

    const articleMap: Record<string, string> = {};
    for (const a of articleDefs) {
      const { productCode, ...rest } = a;
      const article = await tx.article.upsert({
        where: { code: a.code },
        update: { name: rest.name, productId: productMap[productCode], stockUnit: rest.stockUnit, salesUnit: rest.salesUnit, contentQty: rest.contentQty, contentUnit: rest.contentUnit, catalogPrice: rest.catalogPrice, standardCost: rest.standardCost },
        create: { ...rest, productId: productMap[productCode] },
      });
      articleMap[a.code] = article.id;
    }
    console.log(`  ✓ ${articleDefs.length} articles created`);

    // ============================================================
    // 5c. CUSTOMERS
    // ============================================================
    console.log('Creating customers...');

    const customerDefs = [
      { code: 'CLI-COOP-01', name: 'Coopérative Agricole du Sud', type: 'COOPERATIVE', region: 'Sud', country: 'France' },
      { code: 'CLI-COOP-02', name: 'Coopérative Céréalière Nord', type: 'COOPERATIVE', region: 'Nord', country: 'France' },
      { code: 'CLI-DIST-01', name: 'AgroDistrib France', type: 'DISTRIBUTEUR', region: 'National', country: 'France' },
      { code: 'CLI-DIST-02', name: 'Phyto Distribution', type: 'DISTRIBUTEUR', region: 'Ouest', country: 'France' },
      { code: 'CLI-DIR-01', name: 'Domaine des Vignes', type: 'DIRECT', region: 'Sud-Est', country: 'France' },
      { code: 'CLI-EXP-01', name: 'Morocco Agri Import', type: 'EXPORT', region: 'International', country: 'Maroc' },
    ];

    const customerMap: Record<string, string> = {};
    for (const c of customerDefs) {
      const customer = await tx.customer.upsert({
        where: { code: c.code },
        update: { name: c.name, type: c.type, region: c.region, country: c.country, entityId: entityMap.FR },
        create: { ...c, entityId: entityMap.FR },
      });
      customerMap[c.code] = customer.id;
    }
    console.log(`  ✓ ${customerDefs.length} customers created`);

    // ============================================================
    // 5d. SALES REPS
    // ============================================================
    console.log('Creating sales reps...');

    const salesRepDefs = [
      { code: 'COM-01', firstName: 'Thomas', lastName: 'Girard', email: 'thomas.girard@valoris.com', region: 'Sud' },
      { code: 'COM-02', firstName: 'Julie', lastName: 'Roche', email: 'julie.roche@valoris.com', region: 'Nord' },
      { code: 'COM-03', firstName: 'Marc', lastName: 'Faure', email: 'marc.faure@valoris.com', region: 'Ouest' },
      { code: 'COM-04', firstName: 'Isabelle', lastName: 'Blanc', email: 'isabelle.blanc@valoris.com', region: 'National' },
    ];

    const salesRepMap: Record<string, string> = {};
    for (const sr of salesRepDefs) {
      const salesRep = await tx.salesRep.upsert({
        where: { code: sr.code },
        update: { firstName: sr.firstName, lastName: sr.lastName, email: sr.email, region: sr.region, entityId: entityMap.FR },
        create: { ...sr, entityId: entityMap.FR },
      });
      salesRepMap[sr.code] = salesRep.id;
    }
    console.log(`  ✓ ${salesRepDefs.length} sales reps created`);

    // ============================================================
    // 5e. ARTICLE SALES HISTORY (with customer + sales rep distribution)
    // ============================================================
    console.log('Creating article sales history...');

    const salesHistoryData: Array<{
      articleCode: string;
      period: string;
      customerCode: string;
      salesRepCode: string;
      revenue: number;
      qtySold: number;
      avgPrice: number;
      variableCost: number;
    }> = [];

    // Distribution: split each article's monthly totals across customer/salesRep pairs
    // ART-AMEO-P01-25: Compost Poudre 25kg - steady growth, seasonal dip in Dec
    const art1Periods = [
      { period: '2025-10', revenue: 14800, qtySold: 820, avgPrice: 18.05, variableCost: 9950 },
      { period: '2025-11', revenue: 15500, qtySold: 855, avgPrice: 18.13, variableCost: 10350 },
      { period: '2025-12', revenue: 12200, qtySold: 680, avgPrice: 17.94, variableCost: 8400 },
      { period: '2026-01', revenue: 16100, qtySold: 890, avgPrice: 18.09, variableCost: 10900 },
      { period: '2026-02', revenue: 17400, qtySold: 950, avgPrice: 18.32, variableCost: 11700 },
      { period: '2026-03', revenue: 18900, qtySold: 1020, avgPrice: 18.53, variableCost: 12650 },
    ];
    // Split: 40% COOP-01/COM-01, 30% DIST-01/COM-04, 30% DIR-01/COM-01
    for (const p of art1Periods) {
      salesHistoryData.push({ articleCode: 'ART-AMEO-P01-25', customerCode: 'CLI-COOP-01', salesRepCode: 'COM-01', ...p, revenue: Math.round(p.revenue * 0.4), qtySold: Math.round(p.qtySold * 0.4), variableCost: Math.round(p.variableCost * 0.4) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-P01-25', customerCode: 'CLI-DIST-01', salesRepCode: 'COM-04', ...p, revenue: Math.round(p.revenue * 0.3), qtySold: Math.round(p.qtySold * 0.3), variableCost: Math.round(p.variableCost * 0.3) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-P01-25', customerCode: 'CLI-DIR-01', salesRepCode: 'COM-01', ...p, revenue: Math.round(p.revenue * 0.3), qtySold: Math.round(p.qtySold * 0.3), variableCost: Math.round(p.variableCost * 0.3) });
    }

    // ART-AMEO-P01-500: Compost Poudre Big Bag - larger volumes, B2B pattern
    const art2Periods = [
      { period: '2025-10', revenue: 44800, qtySold: 142, avgPrice: 315.49, variableCost: 30200 },
      { period: '2025-11', revenue: 48000, qtySold: 152, avgPrice: 315.79, variableCost: 32500 },
      { period: '2025-12', revenue: 38400, qtySold: 122, avgPrice: 314.75, variableCost: 26100 },
      { period: '2026-01', revenue: 51200, qtySold: 162, avgPrice: 316.05, variableCost: 34800 },
      { period: '2026-02', revenue: 54400, qtySold: 172, avgPrice: 316.28, variableCost: 37100 },
      { period: '2026-03', revenue: 57600, qtySold: 182, avgPrice: 316.48, variableCost: 39500 },
    ];
    // Split: 50% COOP-02/COM-02, 30% DIST-02/COM-03, 20% EXP-01/COM-04
    for (const p of art2Periods) {
      salesHistoryData.push({ articleCode: 'ART-AMEO-P01-500', customerCode: 'CLI-COOP-02', salesRepCode: 'COM-02', ...p, revenue: Math.round(p.revenue * 0.5), qtySold: Math.round(p.qtySold * 0.5), variableCost: Math.round(p.variableCost * 0.5) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-P01-500', customerCode: 'CLI-DIST-02', salesRepCode: 'COM-03', ...p, revenue: Math.round(p.revenue * 0.3), qtySold: Math.round(p.qtySold * 0.3), variableCost: Math.round(p.variableCost * 0.3) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-P01-500', customerCode: 'CLI-EXP-01', salesRepCode: 'COM-04', ...p, revenue: Math.round(p.revenue * 0.2), qtySold: Math.round(p.qtySold * 0.2), variableCost: Math.round(p.variableCost * 0.2) });
    }

    // ART-AMEO-G01-25: Compost Granulé 25kg - strong spring demand
    const art3Periods = [
      { period: '2025-10', revenue: 17600, qtySold: 810, avgPrice: 21.73, variableCost: 11800 },
      { period: '2025-11', revenue: 18700, qtySold: 860, avgPrice: 21.74, variableCost: 12600 },
      { period: '2025-12', revenue: 14300, qtySold: 660, avgPrice: 21.67, variableCost: 9800 },
      { period: '2026-01', revenue: 19800, qtySold: 910, avgPrice: 21.76, variableCost: 13400 },
      { period: '2026-02', revenue: 22000, qtySold: 1005, avgPrice: 21.89, variableCost: 14900 },
      { period: '2026-03', revenue: 24200, qtySold: 1100, avgPrice: 22.00, variableCost: 16400 },
    ];
    // Split: 35% COOP-01/COM-01, 25% COOP-02/COM-02, 25% DIST-01/COM-03, 15% DIR-01/COM-01
    for (const p of art3Periods) {
      salesHistoryData.push({ articleCode: 'ART-AMEO-G01-25', customerCode: 'CLI-COOP-01', salesRepCode: 'COM-01', ...p, revenue: Math.round(p.revenue * 0.35), qtySold: Math.round(p.qtySold * 0.35), variableCost: Math.round(p.variableCost * 0.35) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-G01-25', customerCode: 'CLI-COOP-02', salesRepCode: 'COM-02', ...p, revenue: Math.round(p.revenue * 0.25), qtySold: Math.round(p.qtySold * 0.25), variableCost: Math.round(p.variableCost * 0.25) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-G01-25', customerCode: 'CLI-DIST-01', salesRepCode: 'COM-03', ...p, revenue: Math.round(p.revenue * 0.25), qtySold: Math.round(p.qtySold * 0.25), variableCost: Math.round(p.variableCost * 0.25) });
      salesHistoryData.push({ articleCode: 'ART-AMEO-G01-25', customerCode: 'CLI-DIR-01', salesRepCode: 'COM-01', ...p, revenue: Math.round(p.revenue * 0.15), qtySold: Math.round(p.qtySold * 0.15), variableCost: Math.round(p.variableCost * 0.15) });
    }

    for (const sh of salesHistoryData) {
      const { articleCode, customerCode, salesRepCode, ...data } = sh;
      const cId = customerMap[customerCode];
      await tx.articleSalesHistory.upsert({
        where: {
          articleId_period_customerId: {
            articleId: articleMap[articleCode],
            period: data.period,
            customerId: cId,
          },
        },
        update: {
          revenue: data.revenue,
          qtySold: data.qtySold,
          avgPrice: data.avgPrice,
          variableCost: data.variableCost,
          salesRepId: salesRepMap[salesRepCode],
        },
        create: {
          articleId: articleMap[articleCode],
          period: data.period,
          customerId: cId,
          salesRepId: salesRepMap[salesRepCode],
          revenue: data.revenue,
          qtySold: data.qtySold,
          avgPrice: data.avgPrice,
          variableCost: data.variableCost,
        },
      });
    }
    console.log(`  ✓ ${salesHistoryData.length} sales history entries created`);

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
        productId: productMap['PF-AMEO-P01'],
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
        productId: productMap['PF-AMEO-G01'],
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
      AMEO: 270000,
      BIOSTIMULANT: 80000,
      BIOCONTROLE: 60000,
      CORRECTEUR_CARENCES: 40000,
      DIVERS: 45000,
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
