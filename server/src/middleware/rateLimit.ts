import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const buckets = new Map<string, { count: number; ts: number }>();

export function exportRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.user?.id ?? req.ip ?? "unknown";
  const now = Date.now();
  const minute = 60_000;
  const current = buckets.get(key);

  if (!current || now - current.ts > minute) {
    buckets.set(key, { count: 1, ts: now });
    return next();
  }

  if (current.count >= env.EXPORT_RATE_LIMIT_PER_MINUTE) {
    return res.status(429).json({
      message: `Export rate exceeded. Max ${env.EXPORT_RATE_LIMIT_PER_MINUTE} per minute.`,
    });
  }

  current.count += 1;
  buckets.set(key, current);
  return next();
}