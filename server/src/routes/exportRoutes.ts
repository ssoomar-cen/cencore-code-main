import { Router } from "express";
import { env } from "../config/env.js";
import { executeViewQuery } from "../services/queryBuilder.js";
import { writeAuditLog } from "../services/auditService.js";
import { sendCsvExport, sendXlsxExport } from "../services/exportService.js";
import { queryRequestSchema } from "../services/validation.js";

export const exportRouter = Router();

exportRouter.post("/csv", async (req, res, next) => {
  try {
    const payload = queryRequestSchema.parse(req.body);
    payload.pagination = { page: 1, pageSize: env.MAX_EXPORT_ROWS };

    const result = await executeViewQuery(payload, req.user!);
    const headers = payload.columns.map((col) => ({ key: col.id, label: col.label ?? col.id }));
    const metadata = {
      baseEntity: payload.baseEntity,
      generatedAt: new Date().toISOString(),
      filters: payload.filters ?? null,
      sorts: payload.sorts ?? null,
      groupBy: payload.groupBy ?? null,
    };

    await writeAuditLog(req.user!, "EXPORT_CSV", "view_data", undefined, {
      entity: payload.baseEntity,
      rows: result.rows.length,
    });

    return sendCsvExport(res, result.rows, headers, metadata);
  } catch (error) {
    return next(error);
  }
});

exportRouter.post("/xlsx", async (req, res, next) => {
  try {
    const payload = queryRequestSchema.parse(req.body);
    payload.pagination = { page: 1, pageSize: env.MAX_EXPORT_ROWS };

    const result = await executeViewQuery(payload, req.user!);
    const headers = payload.columns.map((col) => ({ key: col.id, label: col.label ?? col.id }));
    const metadata = {
      baseEntity: payload.baseEntity,
      generatedAt: new Date().toISOString(),
      filters: payload.filters ?? null,
      sorts: payload.sorts ?? null,
      groupBy: payload.groupBy ?? null,
    };

    await writeAuditLog(req.user!, "EXPORT_XLSX", "view_data", undefined, {
      entity: payload.baseEntity,
      rows: result.rows.length,
    });

    return sendXlsxExport(res, result.rows, headers, metadata);
  } catch (error) {
    return next(error);
  }
});