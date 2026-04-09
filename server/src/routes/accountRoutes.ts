import { Router, Request, Response } from "express";
import { prisma } from "../services/prisma";

const router = Router();

// ============================================================================
// ACCOUNT ENDPOINTS
// ============================================================================

/**
 * GET /api/accounts
 * List all accounts with optional filtering by name or search query
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, limit = "50", offset = "0" } = req.query;

    const where = search
      ? { name: { contains: String(search), mode: "insensitive" } }
      : {};

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
        select: {
          id: true,
          name: true,
          industry: true,
          region: true,
          phone: true,
          status: true,
          billingCity: true,
          billingState: true,
          contractStatus: true,
          _count: {
            select: {
              contracts: true,
              energyPrograms: true,
              invoices: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.account.count({ where }),
    ]);

    res.json({
      data: accounts,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

/**
 * GET /api/accounts/:accountId
 * Get detailed information about a specific account
 */
router.get("/:accountId", async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        contracts: {
          select: {
            id: true,
            name: true,
            contractStatus: true,
            contractStartDate: true,
            billingScheduleEndDate: true,
            _count: { select: { invoices: true } },
          },
        },
        energyPrograms: {
          select: {
            id: true,
            name: true,
            status: true,
            pgmId: true,
            _count: { select: { invoices: true } },
          },
        },
        _count: {
          select: {
            invoices: true,
            contracts: true,
            energyPrograms: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.json(account);
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

/**
 * GET /api/accounts/:accountId/contracts
 * Get all contracts for an account
 */
router.get("/:accountId/contracts", async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where: { accountId },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
        select: {
          id: true,
          name: true,
          contractStatus: true,
          contractType: true,
          contractStartDate: true,
          billingScheduleEndDate: true,
          clientManager: true,
          serviceStatus: true,
          _count: { select: { invoices: true } },
        },
        orderBy: { contractStartDate: "desc" },
      }),
      prisma.contract.count({ where: { accountId } }),
    ]);

    res.json({
      data: contracts,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

/**
 * GET /api/accounts/:accountId/energy-programs
 * Get all energy programs for an account
 */
router.get(
  "/:accountId/energy-programs",
  async (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      // Verify account exists
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true },
      });

      if (!account) {
        return res.status(404).json({ error: "Account not found" });
      }

      const [programs, total] = await Promise.all([
        prisma.energyProgram.findMany({
          where: { accountId },
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
          select: {
            id: true,
            name: true,
            status: true,
            pgmId: true,
            technicalLead: true,
            implementationConsultant: true,
            contractStartDate: true,
            billingScheduleEndDate: true,
            _count: { select: { invoices: true } },
          },
          orderBy: { contractStartDate: "desc" },
        }),
        prisma.energyProgram.count({ where: { accountId } }),
      ]);

      res.json({
        data: programs,
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    } catch (error) {
      console.error("Error fetching energy programs:", error);
      res.status(500).json({ error: "Failed to fetch energy programs" });
    }
  }
);

/**
 * GET /api/accounts/:accountId/invoices
 * Get all invoices for an account (through contracts and energy programs)
 */
router.get("/:accountId/invoices", async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { accountId },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset)),
        select: {
          id: true,
          name: true,
          invoiceNumber: true,
          invoiceTotal: true,
          status: true,
          billMonth: true,
          dueDate: true,
          contract: { select: { id: true, name: true } },
          energyProgram: { select: { id: true, name: true } },
          _count: { select: { items: true, reconciliations: true } },
        },
        orderBy: { billMonth: "desc" },
      }),
      prisma.invoice.count({ where: { accountId } }),
    ]);

    res.json({
      data: invoices,
      total,
      limit: parseInt(String(limit)),
      offset: parseInt(String(offset)),
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// ============================================================================
// CONTRACT ENDPOINTS
// ============================================================================

/**
 * GET /api/accounts/contracts/:contractId
 * Get detailed information about a specific contract
 */
router.get("/contracts/:contractId", async (req: Request, res: Response) => {
  try {
    const { contractId } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        account: { select: { id: true, name: true } },
        invoices: {
          select: {
            id: true,
            name: true,
            invoiceNumber: true,
            invoiceTotal: true,
            status: true,
            billMonth: true,
            _count: { select: { items: true } },
          },
          orderBy: { billMonth: "desc" },
          take: 20,
        },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    res.json(contract);
  } catch (error) {
    console.error("Error fetching contract:", error);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

/**
 * GET /api/accounts/contracts/:contractId/invoices
 * Get invoices for a specific contract
 */
router.get(
  "/contracts/:contractId/invoices",
  async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      // Verify contract exists
      const contract = await prisma.contract.findUnique({
        where: { id: contractId },
        select: { id: true },
      });

      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where: { contractId },
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
          select: {
            id: true,
            name: true,
            invoiceNumber: true,
            invoiceTotal: true,
            status: true,
            billMonth: true,
            dueDate: true,
            _count: { select: { items: true, reconciliations: true } },
          },
          orderBy: { billMonth: "desc" },
        }),
        prisma.invoice.count({ where: { contractId } }),
      ]);

      res.json({
        data: invoices,
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    } catch (error) {
      console.error("Error fetching contract invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }
);

// ============================================================================
// ENERGY PROGRAM ENDPOINTS
// ============================================================================

/**
 * GET /api/accounts/programs/:programId
 * Get detailed information about a specific energy program
 */
router.get("/programs/:programId", async (req: Request, res: Response) => {
  try {
    const { programId } = req.params;

    const program = await prisma.energyProgram.findUnique({
      where: { id: programId },
      include: {
        account: { select: { id: true, name: true } },
        invoices: {
          select: {
            id: true,
            name: true,
            invoiceNumber: true,
            invoiceTotal: true,
            status: true,
            billMonth: true,
            _count: { select: { items: true } },
          },
          orderBy: { billMonth: "desc" },
          take: 20,
        },
      },
    });

    if (!program) {
      return res.status(404).json({ error: "Energy program not found" });
    }

    res.json(program);
  } catch (error) {
    console.error("Error fetching energy program:", error);
    res.status(500).json({ error: "Failed to fetch energy program" });
  }
});

/**
 * GET /api/accounts/programs/:programId/invoices
 * Get invoices for a specific energy program
 */
router.get(
  "/programs/:programId/invoices",
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const { limit = "50", offset = "0" } = req.query;

      // Verify program exists
      const program = await prisma.energyProgram.findUnique({
        where: { id: programId },
        select: { id: true },
      });

      if (!program) {
        return res.status(404).json({ error: "Energy program not found" });
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where: { energyProgramId: programId },
          take: parseInt(String(limit)),
          skip: parseInt(String(offset)),
          select: {
            id: true,
            name: true,
            invoiceNumber: true,
            invoiceTotal: true,
            status: true,
            billMonth: true,
            dueDate: true,
            _count: { select: { items: true, reconciliations: true } },
          },
          orderBy: { billMonth: "desc" },
        }),
        prisma.invoice.count({ where: { energyProgramId: programId } }),
      ]);

      res.json({
        data: invoices,
        total,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset)),
      });
    } catch (error) {
      console.error("Error fetching program invoices:", error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  }
);

export default router;
