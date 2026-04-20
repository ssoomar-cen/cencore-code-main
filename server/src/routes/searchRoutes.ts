import { Router, Request, Response } from "express";
import { db } from "../utils/prisma.js";

export const searchRouter = Router();

// GET /api/search?q=<term>&entities=accounts,contacts,...&limit=25
searchRouter.get("/", async (req: Request, res: Response) => {
  const { q, entities = "all", limit = "25" } = req.query as Record<string, string>;
  if (!q?.trim() || q.trim().length < 2) return res.json([]);

  const term = `%${q.trim().toLowerCase()}%`;
  const lim = Math.min(parseInt(limit) || 25, 50);
  const want = entities === "all" ? null : new Set(entities.split(","));
  const results: any[] = [];

  const perEntity = Math.max(5, Math.floor(lim / 4));

  if (!want || want.has("accounts")) {
    try {
      const rows = await db.query(
        `SELECT id, name, industry, phone, status FROM accounts
         WHERE LOWER(name) LIKE $1 OR LOWER(industry) LIKE $1 OR LOWER(phone) LIKE $1
         LIMIT $2`,
        [term, perEntity],
      );
      results.push(...rows.map((r: any) => ({
        id: r.id, type: "Account", title: r.name,
        subtitle: r.industry || undefined, description: r.phone || undefined,
        url: `/crm/accounts`,
      })));
    } catch { /* table may not exist */ }
  }

  if (!want || want.has("contacts")) {
    try {
      const rows = await db.query(
        `SELECT id, first_name, last_name, email, phone, job_title FROM contacts
         WHERE LOWER(first_name) LIKE $1 OR LOWER(last_name) LIKE $1 OR LOWER(email) LIKE $1 OR LOWER(phone) LIKE $1
         LIMIT $2`,
        [term, perEntity],
      );
      results.push(...rows.map((r: any) => ({
        id: r.id, type: "Contact",
        title: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
        subtitle: r.job_title || undefined, description: r.email || r.phone || undefined,
        url: `/crm/contacts`,
      })));
    } catch { /* table may not exist */ }
  }

  if (!want || want.has("contracts")) {
    try {
      const rows = await db.query(
        `SELECT contract_id AS id, name, contract_status AS status FROM contract
         WHERE LOWER(name) LIKE $1 OR LOWER(contract_status) LIKE $1
         LIMIT $2`,
        [term, perEntity],
      );
      results.push(...rows.map((r: any) => ({
        id: r.id, type: "Contract", title: r.name,
        subtitle: r.status || undefined, url: `/crm/contracts`,
      })));
    } catch { /* table may not exist */ }
  }

  if (!want || want.has("energy_programs")) {
    try {
      const rows = await db.query(
        `SELECT energy_program_id AS id, name, status, pgm_id FROM energy_program
         WHERE LOWER(name) LIKE $1 OR LOWER(pgm_id) LIKE $1 OR LOWER(status) LIKE $1
         LIMIT $2`,
        [term, perEntity],
      );
      results.push(...rows.map((r: any) => ({
        id: r.id, type: "Energy Program", title: r.name,
        subtitle: r.pgm_id || r.status || undefined, url: `/projects`,
      })));
    } catch { /* table may not exist */ }
  }

  if (!want || want.has("invoices")) {
    try {
      const rows = await db.query(
        `SELECT invoice_id AS id, name, invoice_sf_number, status FROM invoice
         WHERE LOWER(name) LIKE $1 OR LOWER(invoice_sf_number) LIKE $1 OR LOWER(status) LIKE $1
         LIMIT $2`,
        [term, perEntity],
      );
      results.push(...rows.map((r: any) => ({
        id: r.id, type: "Invoice",
        title: r.name || r.invoice_sf_number || r.id,
        subtitle: r.status || undefined, url: `/invoices`,
      })));
    } catch { /* table may not exist */ }
  }

  if (!want || want.has("buildings")) {
    try {
      const rows = await db.query(
        `SELECT id, name, address_city, address_state, primary_use FROM buildings
         WHERE LOWER(name) LIKE $1 OR LOWER(address_city) LIKE $1 OR LOWER(primary_use) LIKE $1
         LIMIT $2`,
        [term, perEntity],
      );
      results.push(...rows.map((r: any) => ({
        id: r.id, type: "Building", title: r.name,
        subtitle: r.address_city && r.address_state ? `${r.address_city}, ${r.address_state}` : undefined,
        description: r.primary_use || undefined, url: `/crm/buildings`,
      })));
    } catch { /* table may not exist */ }
  }

  return res.json(results.slice(0, lim));
});
