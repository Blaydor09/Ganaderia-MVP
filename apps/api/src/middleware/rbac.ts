import { NextFunction, Request, Response } from "express";

const hasRequiredRole = (userRoles: string[], requiredRoles: string[]) =>
  userRoles.some((role) => requiredRoles.includes(role));

export const requireRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.scope !== "tenant") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!hasRequiredRole(req.user.roles, roles)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
};

export const requirePlatformRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.scope !== "platform") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!hasRequiredRole(req.user.roles, roles)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
};
