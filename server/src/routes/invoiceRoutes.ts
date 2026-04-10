import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

export const invoiceRouter = Router();

// GET /api/invoices/:invoiceId/items
invoiceRouter.get("/:invoiceId/items", async (req: Request, res: Response, next) => {
  try {
    const { invoiceId } = req.params;
    const tenantId = req.user?.tenantId || req.body.tenantId;

    const items = await db.query(
      `SELECT * FROM invoice_item WHERE invoice_id = $1 AND tenant_id = $2 ORDER BY period_date DESC`,
      [invoiceId, tenantId]
    );

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

    const items = await db.query(
      `SELECT ii.*, i.name as invoice_name, i.invoice_number FROM invoice_item ii
       LEFT JOIN invoice i ON ii.invoice_id = i.invoice_id
       WHERE ii.invoice_item_id = $1 AND ii.tenant_id = $2`,
      [itemId, tenantId]
    );

    const item = items[0];
    if (!item) {
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

    const reconciliations = await db.query(
      `SELECT * FROM invoice_recon WHERE invoice_item_id = $1 AND tenant_id = $2 ORDER BY report_date DESC`,
      [itemId, tenantId]
    );

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

    const recons = await db.query(
      `SELECT ir.*, ii.name as item_name FROM invoice_recon ir
       LEFT JOIN invoice_item ii ON ir.invoice_item_id = ii.invoice_item_id
       WHERE ir.invoice_recon_id = $1 AND ir.tenant_id = $2`,
      [reconId, tenantId]
    );

    const recon = recons[0];
    if (!recon) {
      return res.status(404).json({ error: "Invoice reconciliation not found" });
    }

    res.json(recon);
  } catch (error) {
    next(error);
  }
});
