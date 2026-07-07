import { NextFunction, Request, Response } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { MulterError } from "multer";
import { ApiError } from "../utils/errors";
import { ZodError } from "zod";
import { env } from "../config/env";

const getRequestId = (req: Request) => {
  const candidate = (req as Request & { id?: string }).id;
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
};

const withRequestId = (req: Request, payload: Record<string, unknown>) => {
  const requestId = getRequestId(req);
  return requestId ? { ...payload, requestId } : payload;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json(
      withRequestId(req, {
        message: err.message,
        code: err.code,
        details: err.details,
      })
    );
  }

  if (err instanceof ZodError) {
    return res.status(400).json(
      withRequestId(req, {
        message: "Validation error",
        details: err.flatten(),
      })
    );
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json(
        withRequestId(req, { message: "Uploaded file exceeds 2MB limit" })
      );
    }
    return res.status(400).json(withRequestId(req, { message: err.message }));
  }

  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    return res.status(401).json(withRequestId(req, { message: "Invalid or expired token" }));
  }

  const requestId = getRequestId(req);
  const logger = (req as Request & {
    log?: { error: (payload: Record<string, unknown>, message?: string) => void };
  }).log;
  const errorPayload = {
    requestId,
    err: {
      name: err.name,
      message: err.message,
      stack: env.isProduction ? undefined : err.stack,
    },
  };

  if (logger) {
    logger.error(errorPayload, "Unhandled request error");
  } else {
    // eslint-disable-next-line no-console
    console.error("Unhandled request error", errorPayload);
  }

  return res.status(500).json(withRequestId(req, { message: "Internal server error" }));
};
