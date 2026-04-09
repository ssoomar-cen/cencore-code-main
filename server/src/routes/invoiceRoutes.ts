import { Router, Request, Response } from "express";
import { prisma } from "../services/prisma.js";

export const invoiceRouter = Router();

// GET /api/invoices/:invoiceId/items
invoiceRouter.get("/:invoiceId/items", async (req: Request, res: Response, next) => {
  try {
    const { invoiceId } = req.params;
    const tenantId = req.user?.tenantId || req.body.tenantId;

    const items = await prisma.invoiceItem.findMany({
      where: {
        invoiceId,
        tenantId,
      },
      orderBy: {
        periodDate: "desc",
      },
    });

    res.json(items);
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:invoiceId/items/:itemId
invoiceRouter.get("/:invoiceId/items/:itemId", async (req: Request, res: Response, next) => {
  try {
    const { invoiceId, itemId } = req.params;
    const tenantId = req.user?.tenantId || req.body.tenantId;

    const item = await prisma.invoiceItem.findUnique({
      where: {
        id: itemId,
      },
      include: {
        invoice: true,
      },
    });

    if (!item || item.tenantId !== tenantId) {
      return res.status(404).json({ error: "Invoice item not found" });
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:invoiceId/items/:itemId/reconciliations
invoiceRouter.get("/:invoiceId/items/:itemId/reconciliations", async (req: Request, res: Response, next) => {
  try {
    const { invoiceId, itemId } = req.params;
    const tenantId = req.user?.tenantId || req.body.tenantId;

    const reconciliations = await prisma.invoiceRecon.findMany({
      where: {
        invoiceItemId: itemId,
        tenantId,
      },
      orderBy: {
        reportDate: "desc",
      },
    });

    res.json(reconciliations);
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:invoiceId/items/:itemId/reconciliations/:reconId
invoiceRouter.get("/:invoiceId/items/:itemId/reconciliations/:reconId", async (req: Request, res: Response, next) => {
  try {
    const { reconId } = req.params;
    const tenantId = req.user?.tenantId || req.body.tenantId;

    const recon = await prisma.invoiceRecon.findUnique({
      where: {
        id: reconId,
      },
      include: {
        invoiceItem: true,
        invoice: true,
      },
    });

    if (!recon || recon.tenantId !== tenantId) {
      return res.status(404).json({ error: "Invoice reconciliation not found" });
    }

    res.json(recon);
  } catch (error) {
    next(error);
  }
});
