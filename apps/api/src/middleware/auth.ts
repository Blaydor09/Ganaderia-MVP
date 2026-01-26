import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload.tenantId) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = { id: payload.sub, roles: payload.roles, tenantId: payload.tenantId };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
