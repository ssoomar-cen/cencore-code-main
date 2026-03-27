import { Request, Response, NextFunction } from "express";

export function requireRoles(...roles: Array<"ADMIN" | "MANAGER" | "VIEWER">) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}