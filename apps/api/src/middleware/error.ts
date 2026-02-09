import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ApiError } from "../utils/errors";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ message: err.message, code: err.code, details: err.details });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", details: err.flatten() });
  }

  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  return res.status(500).json({ message: "Internal server error" });
};
