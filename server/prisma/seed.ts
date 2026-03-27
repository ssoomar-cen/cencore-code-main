import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.viewFavorite.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.opportunityProduct.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.product.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const [admin, manager, repA, repB] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Avery Admin",
        email: "admin@cencore.local",
        role: "ADMIN",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.user.create({
      data: {
        name: "Mason Manager",
        email: "manager@cencore.local",
        role: "MANAGER",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.user.create({
      data: {
        name: "Olivia Rep",
        email: "olivia@cencore.local",
        role: "VIEWER",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.user.create({
      data: {
        name: "Noah Rep",
        email: "noah@cencore.local",
        role: "VIEWER",
        teamId: "team-bravo",
        orgId: "org-cencore",
      },
    }),
  ]);

  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        name: "North Valley Schools",
        industry: "Education",
        region: "West",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.account.create({
      data: {
        name: "Summit Healthcare",
        industry: "Healthcare",
        region: "Central",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.account.create({
      data: {
        name: "Metro Manufacturing",
        industry: "Manufacturing",
        region: "East",
        teamId: "team-bravo",
        orgId: "org-cencore",
      },
    }),
  ]);

  await Promise.all([
    prisma.contact.create({
      data: {
        firstName: "Elena",
        lastName: "Walker",
        email: "elena.walker@nvs.org",
        accountId: accounts[0].id,
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Jacob",
        lastName: "Chen",
        email: "jacob.chen@summithealth.org",
        accountId: accounts[1].id,
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.contact.create({
      data: {
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.patel@metro-mfg.com",
        accountId: accounts[2].id,
        teamId: "team-bravo",
        orgId: "org-cencore",
      },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Lighting Optimization",
        sku: "LIGHT-OPT-001",
        family: "Efficiency",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.product.create({
      data: {
        name: "HVAC Intelligence",
        sku: "HVAC-INT-002",
        family: "Automation",
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.product.create({
      data: {
        name: "Demand Response",
        sku: "DR-003",
        family: "Grid",
        teamId: "team-bravo",
        orgId: "org-cencore",
      },
    }),
  ]);

  const opportunities = await Promise.all([
    prisma.opportunity.create({
      data: {
        name: "NVS District Retrofit",
        stage: "Proposal",
        amount: 420000,
        probability: 62,
        closeDate: new Date("2026-04-15"),
        accountId: accounts[0].id,
        ownerId: repA.id,
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.opportunity.create({
      data: {
        name: "Summit Hospital Expansion",
        stage: "Negotiation",
        amount: 730000,
        probability: 48,
        closeDate: new Date("2026-06-10"),
        accountId: accounts[1].id,
        ownerId: manager.id,
        teamId: "team-alpha",
        orgId: "org-cencore",
      },
    }),
    prisma.opportunity.create({
      data: {
        name: "Metro Plant Modernization",
        stage: "Qualification",
        amount: 310000,
        probability: 35,
        closeDate: new Date("2026-07-20"),
        accountId: accounts[2].id,
        ownerId: repB.id,
        teamId: "team-bravo",
        orgId: "org-cencore",
      },
    }),
  ]);

  await Promise.all([
    prisma.opportunityProduct.create({
      data: {
        opportunityId: opportunities[0].id,
        productId: products[0].id,
        quantity: 6,
        unitPrice: 18000,
      },
    }),
    prisma.opportunityProduct.create({
      data: {
        opportunityId: opportunities[0].id,
        productId: products[1].id,
        quantity: 2,
        unitPrice: 32000,
      },
    }),
    prisma.opportunityProduct.create({
      data: {
        opportunityId: opportunities[1].id,
        productId: products[1].id,
        quantity: 8,
        unitPrice: 26500,
      },
    }),
    prisma.opportunityProduct.create({
      data: {
        opportunityId: opportunities[2].id,
        productId: products[2].id,
        quantity: 5,
        unitPrice: 22000,
      },
    }),
  ]);

  const closingThisQuarter = await prisma.savedView.create({
    data: {
      baseEntity: "opportunities",
      name: "Closing This Quarter",
      description: "Pipeline expected to close this quarter grouped by stage",
      scope: "ORG",
      ownerId: admin.id,
      teamId: "team-alpha",
      orgId: "org-cencore",
      definition: {
        baseEntity: "opportunities",
        columns: [
          { id: "name", path: "name" },
          { id: "account_name", path: "account.name", label: "Account" },
          { id: "amount", path: "amount" },
          { id: "probability", path: "probability" },
          { id: "owner_name", path: "owner.name", label: "Owner" }
        ],
        filters: {
          op: "and",
          filters: [{ path: "close_date", op: "between", value: ["2026-04-01", "2026-06-30"] }]
        },
        groupBy: ["stage"],
        summaries: [
          { path: "amount", aggregation: "sum" },
          { path: "probability", aggregation: "avg" }
        ]
      },
    },
  });

  await prisma.savedView.create({
    data: {
      baseEntity: "accounts",
      name: "Accounts by Industry",
      description: "Industry level account and open pipeline rollup",
      scope: "TEAM",
      ownerId: manager.id,
      teamId: "team-alpha",
      orgId: "org-cencore",
      definition: {
        baseEntity: "accounts",
        columns: [
          { id: "industry", path: "industry" },
          { id: "region", path: "region" },
          { id: "open_pipeline", path: "opportunities.amount", aggregation: "sum", label: "Open Pipeline" },
          { id: "account_count", path: "id", aggregation: "count", label: "Accounts" }
        ],
        groupBy: ["industry"]
      },
    },
  });

  await prisma.savedView.create({
    data: {
      baseEntity: "products",
      name: "Product Pipeline",
      description: "Pipeline value by product family",
      scope: "ORG",
      ownerId: admin.id,
      teamId: "team-alpha",
      orgId: "org-cencore",
      definition: {
        baseEntity: "products",
        columns: [
          { id: "family", path: "family" },
          { id: "line_value", path: "opportunityProducts.extended_price", aggregation: "sum", label: "Pipeline" }
        ],
        computed: [
          { id: "extended_price", label: "Extended Price", expression: "quantity * unit_price" }
        ],
        groupBy: ["family"]
      },
    },
  });

  await prisma.viewFavorite.create({
    data: {
      viewId: closingThisQuarter.id,
      userId: repA.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
