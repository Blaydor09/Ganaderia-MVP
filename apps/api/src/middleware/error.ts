import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", details: err.flatten() });
  }

  return res.status(500).json({ message: "Internal server error" });
};
