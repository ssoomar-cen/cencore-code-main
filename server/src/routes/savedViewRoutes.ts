import { Router } from "express";
import { queryRequestSchema, saveViewSchema } from "../services/validation.js";
import {
  canManageView,
  canReadView,
  createView,
  deleteView,
  getView,
  listViews,
  toggleStar,
  updateView,
} from "../services/viewService.js";
import { writeAuditLog } from "../services/auditService.js";

export const savedViewsRouter = Router();

savedViewsRouter.get("/", async (req, res, next) => {
  try {
    const baseEntity = String(req.query.baseEntity || "opportunities");
    const views = await listViews(baseEntity, req.user!);

    const etag = `W/"${views.length}-${views[0]?.updatedAt?.getTime() ?? 0}"`;
    if (req.header("if-none-match") === etag) {
      return res.status(304).send();
    }
    res.setHeader("ETag", etag);

    return res.json(views);
  } catch (error) {
    return next(error);
  }
});

savedViewsRouter.get("/:id", async (req, res, next) => {
  try {
    const view = await getView(req.params.id);
    if (!view) return res.status(404).json({ message: "View not found" });

    if (!canReadView(view.scope, view.ownerId, view.teamId, req.user!)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(view);
  } catch (error) {
    return next(error);
  }
});

savedViewsRouter.post("/", async (req, res, next) => {
  try {
    const payload = saveViewSchema.parse(req.body);
    queryRequestSchema.parse(payload.definition);
    const view = await createView(payload, req.user!);
    await writeAuditLog(req.user!, "CREATE", "saved_view", view.id, payload);
    res.status(201).json(view);
  } catch (error) {
    next(error);
  }
});

savedViewsRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = saveViewSchema.parse(req.body);
    queryRequestSchema.parse(payload.definition);

    const existing = await getView(req.params.id);
    if (!existing) return res.status(404).json({ message: "View not found" });
    if (!canManageView(existing.scope, existing.ownerId, req.user!)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updated = await updateView(req.params.id, payload, req.user!);
    await writeAuditLog(req.user!, "UPDATE", "saved_view", updated.id, payload);
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

savedViewsRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await getView(req.params.id);
    if (!existing) return res.status(404).json({ message: "View not found" });
    if (!canManageView(existing.scope, existing.ownerId, req.user!)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await deleteView(req.params.id);
    await writeAuditLog(req.user!, "DELETE", "saved_view", req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

savedViewsRouter.post("/:id/star", async (req, res, next) => {
  try {
    const existing = await getView(req.params.id);
    if (!existing) return res.status(404).json({ message: "View not found" });
    if (!canReadView(existing.scope, existing.ownerId, existing.teamId, req.user!)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await toggleStar(existing.id, req.user!);
    await writeAuditLog(req.user!, "STAR", "saved_view", existing.id, result);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});
