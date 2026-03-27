import { Router } from "express";
import { getEntityDef } from "../services/entityMetadata.js";
import { queryRequestSchema } from "../services/validation.js";
import { executeViewQuery } from "../services/queryBuilder.js";

export const queryRouter = Router();

queryRouter.get("/metadata/:entity", (req, res) => {
  const entity = req.params.entity as "opportunities" | "accounts" | "contacts" | "products";
  try {
    const def = getEntityDef(entity);
    res.json({
      entity,
      fields: def.fields,
      relations: def.relations,
    });
  } catch {
    res.status(404).json({ message: `Unsupported entity ${entity}` });
  }
});

queryRouter.post("/query", async (req, res, next) => {
  try {
    const payload = queryRequestSchema.parse(req.body);
    const result = await executeViewQuery(payload, req.user!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});